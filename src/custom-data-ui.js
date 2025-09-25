import { t } from './i18n.js';
import {
  getCustomEntries,
  setCustomEntries,
  resetCustomEntries,
} from './custom-data.js';
import { DATA, fetchJsonWithRetry, loadFeatDetails } from './data.js';
import { showToast } from './ui-helpers.js';
import { deepMerge } from './utils/merge.js';
import { getFieldDescriptions, TEXT_SAMPLES } from './custom-data-templates.js';
import { parseFreeformText } from './custom-data-parser.js';
import { serializeEntry } from './custom-data-serializer.js';

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

const entryMaps = new Map();
let currentCategory = null;
let currentEntryId = '';
let currentEntryData = null;
let suppressSelectChange = false;

function cloneValue(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (err) {
      // fall through
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    console.warn('Unable to clone value', err);
    return value;
  }
}

function entryKey(category, entry) {
  if (!entry || typeof entry !== 'object') return '';
  switch (category) {
    case 'classes':
    case 'backgrounds':
    case 'spells':
    case 'feats':
      return (entry.name || '').toLowerCase();
    case 'races': {
      const group = entry.group || entry.base || entry.raceName || entry.name || '';
      return `${group.toLowerCase()}::${(entry.name || '').toLowerCase()}`;
    }
    case 'equipment':
      return 'equipment';
    default:
      return (entry.name || '').toLowerCase();
  }
}

function sanitizeEntry(category, entry) {
  const value = cloneValue(entry);
  if (!value || typeof value !== 'object') return null;
  delete value.isCustom;
  delete value.source;
  switch (category) {
    case 'classes': {
      if (value.features_by_level) {
        const sanitized = {};
        Object.entries(value.features_by_level).forEach(([lvl, feats]) => {
          const key = String(lvl);
          sanitized[key] = (feats || []).map((feat) => {
            const clone = cloneValue(feat);
            if (clone) delete clone.source;
            return clone;
          });
        });
        value.features_by_level = sanitized;
      }
      return value;
    }
    case 'races': {
      value.group = value.group || value.base || value.raceName || value.name;
      delete value.path;
      return value;
    }
    case 'backgrounds':
    case 'spells':
    case 'feats':
    case 'equipment':
      return value;
    default:
      return value;
  }
}

function collectEntries(category) {
  const map = new Map();
  const addEntry = (item) => {
    if (!item || !item.id) return;
    if (!map.has(item.id)) map.set(item.id, item);
  };

  const customDataset = getCustomEntries(category);

  if (Array.isArray(customDataset)) {
    customDataset.forEach((entry) => {
      const sanitized = sanitizeEntry(category, entry);
      const id = entryKey(category, sanitized);
      if (!id) return;
      addEntry({
        id,
        name: sanitized?.name || sanitized?.group || 'Custom',
        source: 'custom',
        loader: async () => sanitizeEntry(category, entry),
      });
    });
  } else if (customDataset && typeof customDataset === 'object' && category === 'equipment') {
    addEntry({
      id: 'equipment',
      name: 'Equipment',
      source: 'custom',
      loader: async () => sanitizeEntry(category, customDataset),
    });
  }

  switch (category) {
    case 'classes':
      (DATA.classes || []).forEach((cls) => {
        const sanitized = sanitizeEntry('classes', cls);
        const id = entryKey('classes', sanitized);
        if (!id || map.has(id)) return;
        addEntry({
          id,
          name: sanitized?.name || 'Class',
          source: cls.isCustom ? 'custom' : 'core',
          loader: async () => sanitizeEntry('classes', cls),
        });
      });
      break;
    case 'races':
      Object.entries(DATA.races || {}).forEach(([group, subs]) => {
        (subs || []).forEach((sub) => {
          const id = `${group.toLowerCase()}::${(sub.name || '').toLowerCase()}`;
          if (map.has(id)) return;
          addEntry({
            id,
            name: sub.name,
            source: sub.isCustom ? 'custom' : 'core',
            loader: async () => {
              if (sub.data) return sanitizeEntry('races', sub.data);
              if (sub.path) {
                const data = await fetchJsonWithRetry(sub.path, `race at ${sub.path}`);
                data.group = group;
                data.name = sub.name;
                return sanitizeEntry('races', data);
              }
              return null;
            },
          });
        });
      });
      break;
    case 'backgrounds':
      Object.values(DATA.backgrounds || {}).forEach((bg) => {
        const sanitized = sanitizeEntry('backgrounds', bg);
        const id = entryKey('backgrounds', sanitized);
        if (!id || map.has(id)) return;
        addEntry({
          id,
          name: sanitized?.name || 'Background',
          source: bg.isCustom ? 'custom' : 'core',
          loader: async () => sanitizeEntry('backgrounds', bg),
        });
      });
      break;
    case 'spells':
      (DATA.spells || []).forEach((spell) => {
        const sanitized = sanitizeEntry('spells', spell);
        const id = entryKey('spells', sanitized);
        if (!id || map.has(id)) return;
        addEntry({
          id,
          name: sanitized?.name || 'Spell',
          source: spell.isCustom ? 'custom' : 'core',
          loader: async () => sanitizeEntry('spells', spell),
        });
      });
      break;
    case 'feats':
      (DATA.feats || []).forEach((name) => {
        const id = (name || '').toLowerCase();
        if (!id || map.has(id)) return;
        addEntry({
          id,
          name,
          source: 'core',
          loader: async () => {
            const detail = await loadFeatDetails(name);
            return sanitizeEntry('feats', { name, details: detail });
          },
        });
      });
      break;
    case 'equipment':
      if (DATA.equipment && !map.has('equipment')) {
        addEntry({
          id: 'equipment',
          name: 'Equipment',
          source: 'core',
          loader: async () => sanitizeEntry('equipment', DATA.equipment),
        });
      }
      break;
    default:
      break;
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function buildEntryOptions(category, entrySelect) {
  const options = collectEntries(category);
  const map = new Map();
  suppressSelectChange = true;
  entrySelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = t('customDataEntryPlaceholder');
  entrySelect.appendChild(placeholder);

  options.forEach((option) => {
    map.set(option.id, option);
    const opt = document.createElement('option');
    opt.value = option.id;
    const sourceLabel = option.source === 'custom' ? t('customDataEntryCustom') : t('customDataEntryCore');
    opt.textContent = `${option.name} (${sourceLabel})`;
    entrySelect.appendChild(opt);
  });

  entryMaps.set(category, map);
  suppressSelectChange = false;
}

function setSelectedEntry(selectEl, id) {
  if (!selectEl) return;
  suppressSelectChange = true;
  selectEl.value = id || '';
  suppressSelectChange = false;
}

async function loadEntryById(category, id, cfg, editor, freeformEditor) {
  if (!id) return;
  const map = entryMaps.get(category);
  if (!map) return;
  const item = map.get(id);
  if (!item) return;
  try {
    const data = await item.loader();
    if (!data) throw new Error('Missing entry data');
    currentEntryId = entryKey(category, data);
    currentEntryData = sanitizeEntry(category, data);
    editor.value = JSON.stringify(currentEntryData, null, 2);
    if (FREEFORM_SUPPORT.has(category) && freeformEditor) {
      freeformEditor.value = serializeEntry(category, currentEntryData);
    } else if (freeformEditor) {
      freeformEditor.value = '';
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}

function normalizeEntries(cfg, value) {
  if (cfg.type === 'array') {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    return arr.map((entry) => sanitizeEntry(cfg.key, entry)).filter(Boolean);
  }
  if (cfg.type === 'object') {
    return sanitizeEntry(cfg.key, value);
  }
  return value;
}

function updateCustomDataset(category, entries) {
  if (category === 'equipment') {
    const existing = getCustomEntries(category) || {};
    const next = Array.isArray(entries)
      ? entries.reduce((acc, entry) => deepMerge(acc, entry), cloneValue(existing))
      : deepMerge(cloneValue(existing), entries || {});
    setCustomEntries(category, next);
    return Array.isArray(entries) ? entries : [entries];
  }
  const incoming = Array.isArray(entries) ? entries : entries ? [entries] : [];
  if (!incoming.length) return [];
  const existing = Array.isArray(getCustomEntries(category)) ? cloneValue(getCustomEntries(category)) : [];
  const result = [];
  const overrides = new Set();
  existing.forEach((entry) => {
    const key = entryKey(category, entry);
    const override = incoming.find((item) => entryKey(category, item) === key);
    if (override) {
      result.push(override);
      overrides.add(entryKey(category, override));
    } else {
      result.push(entry);
    }
  });
  incoming.forEach((entry) => {
    const key = entryKey(category, entry);
    if (!overrides.has(key)) result.push(entry);
  });
  setCustomEntries(category, result);
  return incoming;
}

function syncToFreeform(cfg, editor, freeformEditor) {
  if (!freeformEditor) return true;
  try {
    const raw = editor.value.trim();
    if (!raw) {
      freeformEditor.value = cfg.textSample || '';
      return true;
    }
    const parsed = JSON.parse(raw);
    const normalized = normalizeEntries(cfg, parsed);
    const entry = Array.isArray(normalized) ? normalized[0] : normalized;
    if (entry) {
      freeformEditor.value = serializeEntry(cfg.key, entry);
    }
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

function syncToJson(cfg, editor, freeformEditor) {
  if (!freeformEditor) return;
  try {
    const parsed = parseFreeformText(cfg.key, freeformEditor.value);
    if (!parsed) return;
    const normalized = normalizeEntries(cfg, parsed);
    if (cfg.type === 'array') {
      const entry = Array.isArray(normalized) ? normalized[0] : normalized;
      editor.value = JSON.stringify(entry || {}, null, 2);
    } else {
      editor.value = JSON.stringify(normalized || {}, null, 2);
    }
  } catch (err) {
    console.error(err);
  }
}

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
    parsed = parsed ? [parsed] : [];
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
  const entrySelect = modal.querySelector('[data-role="entry-select"]');
  const newEntryBtn = modal.querySelector('[data-action="newEntry"]');
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
    if (!cfg) return;
    const previous = editorMode;
    if (mode === 'freeform') {
      if (!FREEFORM_SUPPORT.has(cfg.key)) return;
      const ok = syncToFreeform(cfg, editor, freeformEditor);
      if (!ok) {
        setFeedback(t('customDataParseFailed'), 'error');
        jsonModeInput.checked = true;
        textModeInput.checked = false;
        return;
      }
    } else if (mode === 'json' && previous === 'freeform') {
      syncToJson(cfg, editor, freeformEditor);
    }
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

  const startNewEntry = (cfg) => {
    if (!cfg) return;
    currentEntryId = '';
    currentEntryData = null;
    editor.value = prettyPrint(getDefaultValue(cfg), cfg);
    if (FREEFORM_SUPPORT.has(cfg.key) && freeformEditor) {
      freeformEditor.value = cfg.textSample || '';
    } else if (freeformEditor) {
      freeformEditor.value = '';
    }
    setFeedback('');
  };

  const loadCategory = (key) => {
    const cfg = CATEGORY_LOOKUP.get(key);
    if (!cfg) return;
    activeCategory = cfg.key;
    currentCategory = cfg.key;
    titleEl.textContent = cfg.label;
    descriptionEl.textContent = cfg.description;
    editor.placeholder = cfg.type === 'array' ? '[]' : '{}';
    if (entrySelect) {
      buildEntryOptions(cfg.key, entrySelect);
      setSelectedEntry(entrySelect, '');
    }
    startNewEntry(cfg);
    if (toggleContainer) {
      const supportsText = FREEFORM_SUPPORT.has(cfg.key);
      toggleContainer.classList.toggle('hidden', !supportsText);
      textModeInput.disabled = !supportsText;
    }
    setMode('json', cfg);
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
      const normalized = normalizeEntries(cfg, parsed);
      const entry = Array.isArray(normalized) ? normalized[0] : normalized;
      editor.value = JSON.stringify(entry || {}, null, 2);
      setFeedback(t('customDataParseSuccess'), 'success');
    } catch (err) {
      console.error(err);
      setFeedback(t('customDataParseFailed'), 'error');
    }
  };

  parseBtn?.addEventListener('click', parseFreeform);

  entrySelect?.addEventListener('change', async (evt) => {
    if (suppressSelectChange) return;
    const cfg = CATEGORY_LOOKUP.get(activeCategory);
    if (!cfg) return;
    const id = evt.target.value;
    if (!id) {
      startNewEntry(cfg);
      return;
    }
    try {
      await loadEntryById(cfg.key, id, cfg, editor, freeformEditor);
      setFeedback('');
      if (editorMode === 'freeform' && FREEFORM_SUPPORT.has(cfg.key) && freeformEditor) {
        freeformEditor.value = serializeEntry(cfg.key, currentEntryData);
      }
    } catch (err) {
      setFeedback(t('customDataEntryLoadFailed'), 'error');
    }
  });

  newEntryBtn?.addEventListener('click', () => {
    const cfg = CATEGORY_LOOKUP.get(activeCategory);
    if (!cfg) return;
    setSelectedEntry(entrySelect, '');
    startNewEntry(cfg);
  });

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
      } else {
        payload = parseEditorValue(editor.value, cfg);
      }
      const normalized = normalizeEntries(cfg, payload);
      const savedEntries = updateCustomDataset(cfg.key, normalized);
      const latest = Array.isArray(savedEntries)
        ? savedEntries[savedEntries.length - 1]
        : savedEntries;
      if (latest) {
        currentEntryData = latest;
        currentEntryId = entryKey(cfg.key, latest);
        editor.value = JSON.stringify(latest, null, 2);
        if (FREEFORM_SUPPORT.has(cfg.key) && freeformEditor) {
          freeformEditor.value = serializeEntry(cfg.key, latest);
        }
        if (entrySelect) {
          buildEntryOptions(cfg.key, entrySelect);
          setSelectedEntry(entrySelect, currentEntryId);
        }
      }
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
    startNewEntry(cfg);
    if (entrySelect) {
      buildEntryOptions(cfg.key, entrySelect);
      setSelectedEntry(entrySelect, '');
    }
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
