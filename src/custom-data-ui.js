import { t } from './i18n.js';
import {
  getCustomEntries,
  setCustomEntries,
  resetCustomEntries,
} from './custom-data.js';
import { showToast } from './ui-helpers.js';
import { getFieldDescriptions, TEXT_SAMPLES } from './custom-data-templates.js';
import { parseFreeformText } from './custom-data-parser.js';

const CATEGORY_CONFIG = [
  {
    key: 'classes',
    label: 'Classes',
    type: 'array',
    description:
      'Provide class definitions following the normalized format used by the builder. At minimum include a unique "name" and "description". Optional fields like "hit_die", "saving_throws", "features_by_level" and "choices" mirror the data files in data/classes.',
    sample: `[
  {
    "name": "Custom Vanguard",
    "description": "A stalwart frontline fighter.",
    "hit_die": "d10",
    "saving_throws": ["Strength", "Constitution"],
    "skill_proficiencies": { "choose": 2, "from": ["Athletics", "Perception", "Intimidation"] },
    "features_by_level": {
      "1": [
        {
          "name": "Vanguard's Courage",
          "entries": [
            "You gain temporary hit points equal to your proficiency bonus at the start of each combat."
          ]
        }
      ]
    }
  }
]`,
    textSample: TEXT_SAMPLES.classes,
  },
  {
    key: 'races',
    label: 'Races',
    type: 'array',
    description:
      'Add race entries using the same structure as files in data/races. Use "group" to list a custom subrace under an existing ancestry, or omit it to create a new base race.',
    sample: `[
  {
    "name": "Crystalborn",
    "size": ["M"],
    "speed": 30,
    "ability": [
      { "con": 2, "wis": 1 }
    ],
    "languageProficiencies": [
      { "common": true, "terran": true }
    ],
    "entries": [
      {
        "name": "Shardlight",
        "type": "entries",
        "entries": [
          "You can cast the *guidance* cantrip. Constitution is your spellcasting ability for it."
        ]
      }
    ]
  }
]`,
    textSample: TEXT_SAMPLES.races,
  },
  {
    key: 'backgrounds',
    label: 'Backgrounds',
    type: 'array',
    description:
      'Background objects should include a "name" along with optional properties like "skills", "tools", "languages", "featOptions", and "entries" for descriptive text.',
    sample: `[
  {
    "name": "City Watcher",
    "skills": ["Insight", "Perception"],
    "tools": ["Thieves' Tools"],
    "languages": ["Common"],
    "entries": [
      {
        "name": "Feature: Watchful Eye",
        "entries": [
          "You can always find a safe place to stay within any settlement policed by a watch."
        ]
      }
    ]
  }
]`,
    textSample: TEXT_SAMPLES.backgrounds,
  },
  {
    key: 'spells',
    label: 'Spells',
    type: 'array',
    description:
      'Spell objects must at least define "name", "level", and "spell_list". The remaining fields may match the SRD spell schema for best results.',
    sample: `[
  {
    "name": "Radiant Pulse",
    "level": 1,
    "school": "Evocation",
    "time": [{ "number": 1, "unit": "action" }],
    "range": { "type": "point", "distance": { "amount": 60, "type": "feet" } },
    "components": { "v": true, "s": true },
    "duration": [{ "type": "instant" }],
    "entries": [
      "A wave of radiant energy erupts from a point you can see. Creatures in a 10-foot radius take 2d6 radiant damage on a failed Constitution save, or half as much on a success."
    ],
    "spell_list": ["Cleric", "Paladin"]
  }
]`,
    textSample: TEXT_SAMPLES.spells,
  },
  {
    key: 'feats',
    label: 'Feats',
    type: 'array',
    description:
      'Feats accept simple strings or objects with "name" and an optional "details" object mirroring files in data/feats. Provide "details" to supply rules text without needing an external JSON file.',
    sample: `[
  {
    "name": "Shield Adept",
    "details": {
      "name": "Shield Adept",
      "prerequisite": ["Proficiency with shields"],
      "entries": [
        "You gain a +1 bonus to AC while you are wielding a shield.",
        "When you Dodge while holding a shield, you can impose disadvantage on one attack made against an ally within 5 feet."
      ]
    }
  }
]`,
    textSample: TEXT_SAMPLES.feats,
  },
  {
    key: 'equipment',
    label: 'Equipment',
    type: 'object',
    description:
      'Equipment overrides can extend or replace entries in data/equipment.json. Provide optional "standard", "classes", or "upgrades" keys. Set { "replace": true } on a class entry to overwrite its defaults.',
    sample: `{
  "standard": ["Traveler's clothes"],
  "classes": {
    "Custom Vanguard": {
      "fixed": ["Shield"],
      "choices": [
        {
          "label": "Primary Weapon",
          "type": "radio",
          "options": [
            { "value": "Longsword", "label": "Longsword" },
            { "value": "Battleaxe", "label": "Battleaxe" }
          ]
        }
      ]
    }
  }
}`,
    textSample: TEXT_SAMPLES.equipment,
  },
];

const CATEGORY_LOOKUP = new Map(CATEGORY_CONFIG.map((cfg) => [cfg.key, cfg]));
const FREEFORM_SUPPORT = new Set(['classes', 'races', 'backgrounds', 'feats', 'equipment', 'spells']);

function getDefaultValue(cfg) {
  return cfg.type === 'array' ? [] : {};
}

function prettyPrint(value, cfg) {
  const fallback = getDefaultValue(cfg);
  const target = value == null || value === '' ? fallback : value;
  try {
    return JSON.stringify(target, null, 2);
  } catch (err) {
    console.warn('Failed to stringify custom data', err);
    return cfg.type === 'array' ? '[]' : '{}';
  }
}

function parseEditorValue(raw, cfg) {
  const trimmed = raw.trim();
  if (!trimmed) return getDefaultValue(cfg);
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    throw new Error(t('customDataInvalidJson'));
  }
  if (cfg.type === 'array' && !Array.isArray(parsed)) {
    throw new Error(t('customDataExpectArray'));
  }
  if (
    cfg.type === 'object' &&
    (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
  ) {
    throw new Error(t('customDataExpectObject'));
  }
  return parsed;
}

function createTabButton(cfg, activeKey, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = cfg.label;
  if (cfg.key === activeKey) btn.classList.add('active');
  btn.addEventListener('click', () => onClick(cfg.key));
  return btn;
}

function saveToFile(filename, contents) {
  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function initCustomDataManager() {
  const trigger = document.getElementById('customDataButton');
  const modal = document.getElementById('customDataModal');
  if (!trigger || !modal) return;

  const tabsContainer = modal.querySelector('[data-role="category-tabs"]');
  const titleEl = modal.querySelector('[data-role="category-title"]');
  const descriptionEl = modal.querySelector('[data-role="description"]');
  const editor = modal.querySelector('[data-role="editor"]');
  const freeformEditor = modal.querySelector('[data-role="freeform"]');
  const feedbackEl = modal.querySelector('[data-role="feedback"]');
  const helperEl = modal.querySelector('[data-role="helper"]');
  const toggleContainer = modal.querySelector('[data-role="mode-toggle"]');
  const jsonModeInput = modal.querySelector('[data-role="mode-json"]');
  const textModeInput = modal.querySelector('[data-role="mode-text"]');
  const closeBtn = modal.querySelector('[data-action="close"]');
  const saveBtn = modal.querySelector('[data-action="save"]');
  const resetBtn = modal.querySelector('[data-action="reset"]');
  const importBtn = modal.querySelector('[data-action="import"]');
  const exportBtn = modal.querySelector('[data-action="export"]');
  const sampleBtn = modal.querySelector('[data-action="sample"]');
  const parseBtn = modal.querySelector('[data-action="parse"]');
  const fileInput = modal.querySelector('#customDataFileInput');

  let activeCategory = CATEGORY_CONFIG[0]?.key || 'classes';
  let lastFocusedTrigger = null;
  let editorMode = 'json';

  const setFeedback = (message, type = '') => {
    feedbackEl.textContent = message || '';
    feedbackEl.classList.remove('error', 'success');
    if (type) feedbackEl.classList.add(type);
  };

  const setMode = (mode, cfg) => {
    editorMode = mode;
    if (jsonModeInput) jsonModeInput.checked = mode === 'json';
    if (textModeInput) textModeInput.checked = mode === 'freeform';
    if (mode === 'json') {
      editor.classList.remove('hidden');
      freeformEditor?.classList.add('hidden');
      parseBtn?.classList.add('hidden');
    } else {
      editor.classList.add('hidden');
      freeformEditor?.classList.remove('hidden');
      parseBtn?.classList.remove('hidden');
    }
    renderHelper(cfg);
  };

  const renderHelper = (cfg) => {
    if (!cfg) return;
    const supportsText = FREEFORM_SUPPORT.has(cfg.key);
    if (!supportsText && editorMode === 'freeform') {
      setMode('json', cfg);
      return;
    }
    if (!helperEl) return;
    helperEl.innerHTML = '';
    if (editorMode === 'json') {
      helperEl.classList.add('hidden');
      if (freeformEditor) freeformEditor.placeholder = '';
      return;
    }
    if (!supportsText) {
      helperEl.textContent = t('customDataParsingUnavailable');
      helperEl.classList.remove('hidden');
      if (freeformEditor) freeformEditor.placeholder = '';
      return;
    }
    helperEl.classList.remove('hidden');
    const desc = getFieldDescriptions(cfg.key);
    const heading = document.createElement('p');
    heading.textContent = t('customDataTextHelper');
    helperEl.appendChild(heading);
    const list = document.createElement('ul');
    Object.entries(desc).forEach(([field, explanation]) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${field}</strong>: ${explanation}`;
      list.appendChild(li);
    });
    helperEl.appendChild(list);
    const separatorInfo = document.createElement('p');
    separatorInfo.textContent = t('customDataTextSeparator');
    helperEl.appendChild(separatorInfo);
    if (cfg.textSample) {
      const details = document.createElement('details');
      details.className = 'custom-data-modal__example';
      const summary = document.createElement('summary');
      summary.textContent = t('customDataTextExample');
      const pre = document.createElement('pre');
      pre.textContent = cfg.textSample;
      details.appendChild(summary);
      details.appendChild(pre);
      helperEl.appendChild(details);
    }
    if (freeformEditor) {
      freeformEditor.placeholder = cfg.textSample || t('customDataTextPlaceholder');
    }
  };

  const renderTabs = () => {
    tabsContainer.innerHTML = '';
    CATEGORY_CONFIG.forEach((cfg) => {
      tabsContainer.appendChild(
        createTabButton(cfg, activeCategory, (key) => {
          activeCategory = key;
          renderTabs();
          loadCategory(key);
        })
      );
    });
  };

  const loadCategory = (key) => {
    const cfg = CATEGORY_LOOKUP.get(key);
    if (!cfg) return;
    titleEl.textContent = cfg.label;
    descriptionEl.textContent = cfg.description;
    editor.placeholder = cfg.type === 'array' ? '[]' : '{}';
    const stored = getCustomEntries(cfg.key);
    editor.value = prettyPrint(stored, cfg);
    freeformEditor.value = '';
    setFeedback('');
    if (toggleContainer) {
      const supportsText = FREEFORM_SUPPORT.has(cfg.key);
      toggleContainer.classList.toggle('hidden', !supportsText);
      textModeInput.disabled = !supportsText;
      if (!supportsText) {
        jsonModeInput.checked = true;
        setMode('json', cfg);
      } else {
        setMode(jsonModeInput.checked ? 'json' : 'freeform', cfg);
      }
    } else {
      setMode('json', cfg);
    }
  };

  const openModal = () => {
    lastFocusedTrigger = document.activeElement;
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    renderTabs();
    loadCategory(activeCategory);
    editor.focus();
  };

  const closeModal = () => {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    setFeedback('');
    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
      lastFocusedTrigger.focus();
    }
  };

  trigger.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (evt) => {
    if (evt.target === modal) closeModal();
  });
  modal.addEventListener('keydown', (evt) => {
    if (evt.key === 'Escape') {
      evt.preventDefault();
      closeModal();
    }
  });

  if (jsonModeInput) {
    jsonModeInput.addEventListener('change', () => {
      if (!jsonModeInput.checked) return;
      setMode('json', CATEGORY_LOOKUP.get(activeCategory));
    });
  }

  if (textModeInput) {
    textModeInput.addEventListener('change', () => {
      if (!textModeInput.checked) return;
      setMode('freeform', CATEGORY_LOOKUP.get(activeCategory));
    });
  }

  const parseFreeform = () => {
    if (!freeformEditor) return;
    const cfg = CATEGORY_LOOKUP.get(activeCategory);
    if (!cfg) return;
    if (!FREEFORM_SUPPORT.has(cfg.key)) {
      setFeedback(t('customDataParsingUnavailable'), 'error');
      return;
    }
    const text = freeformEditor.value;
    try {
      const parsed = parseFreeformText(cfg.key, text);
      if (!parsed) {
        setFeedback(t('customDataParseFailed'), 'error');
        return;
      }
      editor.value = JSON.stringify(parsed, null, 2);
      setFeedback(t('customDataParseSuccess'), 'success');
    } catch (err) {
      console.error(err);
      setFeedback(t('customDataParseFailed'), 'error');
    }
  };

  parseBtn?.addEventListener('click', parseFreeform);

  saveBtn?.addEventListener('click', () => {
    const cfg = CATEGORY_LOOKUP.get(activeCategory);
    if (!cfg) return;
    try {
      let payload;
      if (editorMode === 'freeform') {
        if (!freeformEditor) {
          setFeedback(t('customDataParseFailed'), 'error');
          return;
        }
        const parsedText = parseFreeformText(cfg.key, freeformEditor.value);
        if (!parsedText) {
          setFeedback(t('customDataParseFailed'), 'error');
          return;
        }
        payload = parsedText;
        editor.value = JSON.stringify(parsedText, null, 2);
      } else {
        payload = parseEditorValue(editor.value, cfg);
      }
      setCustomEntries(cfg.key, payload);
      setFeedback(t('customDataSaved'), 'success');
      showToast(t('customDataSaved'));
    } catch (err) {
      setFeedback(err.message || String(err), 'error');
    }
  });

  resetBtn?.addEventListener('click', () => {
    const cfg = CATEGORY_LOOKUP.get(activeCategory);
    if (!cfg) return;
    resetCustomEntries(cfg.key);
    editor.value = prettyPrint(getDefaultValue(cfg), cfg);
    freeformEditor.value = '';
    setFeedback(t('customDataCleared'), 'success');
    showToast(t('customDataCleared'));
  });

  sampleBtn?.addEventListener('click', () => {
    const cfg = CATEGORY_LOOKUP.get(activeCategory);
    if (!cfg) return;
    if (editorMode === 'freeform' && FREEFORM_SUPPORT.has(cfg.key)) {
      freeformEditor.value = cfg.textSample || t('customDataTextPlaceholder');
    } else {
      editor.value = cfg.sample;
    }
    setFeedback(t('customDataSampleLoaded'), 'success');
  });

  importBtn?.addEventListener('click', () => {
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  });

  fileInput?.addEventListener('change', (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        editor.value = reader.result;
        setFeedback(t('customDataFileLoaded'), 'success');
      }
    });
    reader.addEventListener('error', () => {
      setFeedback(t('customDataImportFailed'), 'error');
    });
    reader.readAsText(file);
  });

  exportBtn?.addEventListener('click', () => {
    const cfg = CATEGORY_LOOKUP.get(activeCategory);
    if (!cfg) return;
    const data = getCustomEntries(cfg.key) ?? getDefaultValue(cfg);
    const filename = `${cfg.key}-custom.json`;
    saveToFile(filename, prettyPrint(data, cfg));
    setFeedback(t('customDataExported'), 'success');
  });
}
