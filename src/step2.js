import {
  DATA,
  CharacterState,
  loadClasses,
  loadFeats,
  totalLevel,
  updateSpellSlots,
  updateProficiencyBonus,
  MAX_CHARACTER_LEVEL,
  loadSpells,
  loadInfusions,
  deriveSubclassData,
} from './data.js';
import { t } from './i18n.js';
import {
  createElement,
  createAccordionItem,
  createSelectableCard,
  appendEntries,
  createDetailsSection,
  showConfirmation,
} from './ui-helpers.js';
import { inlineWarning, globalToast } from './validation.js';
import { renderFeatChoices } from './feat.js';
import { renderSpellChoices } from './spell-select.js';
import { renderInfusion } from './infusion.js';
import { pendingReplacements, getProficiencyList } from './proficiency.js';
import {
  filterDuplicateOptions,
  updateChoiceSelectOptions,
  updateSkillSelectOptions,
} from './choice-select-helpers.js';
import * as main from './main.js';

const abilityMap = {
  Strength: 'str',
  Dexterity: 'dex',
  Constitution: 'con',
  Intelligence: 'int',
  Wisdom: 'wis',
  Charisma: 'cha',
};

const SPELL_SELECTION_CLASSES = new Set([
  'Bard',
  'Sorcerer',
  'Warlock',
  'Wizard',
  'Ranger',
]);

const SPELL_SELECTION_SUBCLASSES = new Set([
  'Fighter:Eldritch Knight',
  'Rogue:Arcane Trickster',
]);

function classRequiresSpellSelection(cls) {
  if (!cls) return false;
  if (cls.spellcasting?.type === 'known') return true;
  if (SPELL_SELECTION_CLASSES.has(cls.name)) return true;
  const subclass = cls.subclass || '';
  if (subclass && SPELL_SELECTION_SUBCLASSES.has(`${cls.name}:${subclass}`)) return true;
  return false;
}

// Snapshot of the character's proficiencies and abilities before any class
// data is applied. This allows us to cleanly rebuild the derived state when a
// class is edited or removed.
const baseState = {
  skills: [],
  tools: [],
  languages: [],
  cantrips: [],
  feats: [],
  infusions: [],
  abilities: {},
  expertise: [],
};

function normalizeFeatureText(value = '') {
  return String(value)
    .replace(/\{@[^}]+}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function firstEntryText(entries) {
  if (!Array.isArray(entries)) return '';
  for (const entry of entries) {
    if (!entry) continue;
    if (typeof entry === 'string') {
      const text = entry.trim();
      if (text) return text;
      continue;
    }
    if (typeof entry.description === 'string') {
      const text = entry.description.trim();
      if (text) return text;
    }
    if (typeof entry.entry === 'string') {
      const text = entry.entry.trim();
      if (text) return text;
    } else if (entry.entry) {
      const nested = firstEntryText([entry.entry]);
      if (nested) return nested;
    }
    if (Array.isArray(entry.entries)) {
      const nested = firstEntryText(entry.entries);
      if (nested) return nested;
    }
    if (Array.isArray(entry.items)) {
      const nested = firstEntryText(entry.items);
      if (nested) return nested;
    }
  }
  return '';
}

function collectEntryTexts(entries, acc = new Set()) {
  if (!Array.isArray(entries)) return acc;
  entries.forEach(entry => {
    if (!entry) return;
    if (typeof entry === 'string') {
      const text = normalizeFeatureText(entry);
      if (text) acc.add(text);
      return;
    }
    if (typeof entry !== 'object') return;
    if (typeof entry.description === 'string') {
      const text = normalizeFeatureText(entry.description);
      if (text) acc.add(text);
    }
    if (typeof entry.entry === 'string') {
      const text = normalizeFeatureText(entry.entry);
      if (text) acc.add(text);
    } else if (entry.entry) {
      collectEntryTexts([entry.entry], acc);
    }
    if (Array.isArray(entry.entries)) collectEntryTexts(entry.entries, acc);
    if (Array.isArray(entry.items)) collectEntryTexts(entry.items, acc);
  });
  return acc;
}

function refreshBaseState() {
  baseState.skills = [...CharacterState.system.skills];
  baseState.tools = [...CharacterState.system.tools];
  baseState.languages = [...CharacterState.system.traits.languages.value];
  baseState.cantrips = Array.isArray(CharacterState.system.spells.cantrips)
    ? [...CharacterState.system.spells.cantrips]
    : [];
  baseState.feats = Array.isArray(CharacterState.feats)
    ? CharacterState.feats.map(f => ({ ...f }))
    : [];
  baseState.infusions = Array.isArray(CharacterState.infusions)
    ? CharacterState.infusions.map(i =>
        typeof i === 'string' ? { name: i } : { ...i }
      )
    : [];
  baseState.expertise = Array.isArray(CharacterState.system.expertise)
    ? [...CharacterState.system.expertise]
    : [];
  for (const [ab, obj] of Object.entries(CharacterState.system.abilities)) {
    const bonus = CharacterState.bonusAbilities?.[ab] || 0;
    baseState.abilities[ab] = (obj.value || 0) - bonus;
  }
}

function rebuildFromClasses() {
  const skills = new Set(baseState.skills);
  const tools = new Set(baseState.tools);
  const languages = new Set(baseState.languages);
  const cantrips = new Set(baseState.cantrips);
  const feats = new Map();
  const infusions = new Map(
    baseState.infusions.map(i => [i.name || i, typeof i === 'string' ? { name: i } : { ...i }])
  );
  const expertise = new Set(baseState.expertise);
  baseState.feats.forEach(f => feats.set(f.name, { ...f }));
  CharacterState.bonusAbilities = {};
  for (const ab of Object.keys(baseState.abilities)) {
    CharacterState.bonusAbilities[ab] = 0;
  }

  (CharacterState.classes || []).forEach(cls => {
    (cls.skills || []).forEach(s => skills.add(s));
    (cls.expertise || []).forEach(e => expertise.add(e.skill || e));
    // Add fixed tools and languages from the class definition so they are
    // tracked for later duplicate checks
    (cls.fixed_tools || []).forEach(t => tools.add(t));
    if (Array.isArray(cls.fixed_proficiencies)) {
      cls.fixed_proficiencies.forEach(l => languages.add(l));
    }
    if (cls.choiceSelections) {
      Object.values(cls.choiceSelections).forEach(entries => {
        entries.forEach(e => {
          if (e.type === 'skills') skills.add(e.option);
          else if (e.type === 'tools') tools.add(e.option);
          else if (e.type === 'languages') languages.add(e.option);
          else if (e.type === 'cantrips') cantrips.add(e.option);
          else if (e.type === 'infusion') {
            const name = e.option;
            if (!infusions.has(name)) infusions.set(name, { name });
          }
          if (e.feat) {
            if (!feats.has(e.feat)) feats.set(e.feat, { name: e.feat });
          }
        });
      });
    }
    const bonuses = cls.asiBonuses || {};
    for (const [ab, inc] of Object.entries(bonuses)) {
      if (CharacterState.bonusAbilities[ab] !== undefined)
        CharacterState.bonusAbilities[ab] += inc;
    }
  });
  (CharacterState.feats || []).forEach(f => {
    if (f.ability) {
      for (const [ab, inc] of Object.entries(f.ability)) {
        if (CharacterState.bonusAbilities[ab] !== undefined)
          CharacterState.bonusAbilities[ab] += inc;
      }
    }
    (f.expertise || []).forEach(sk => expertise.add(sk));
  });

  CharacterState.system.skills = Array.from(skills);
  CharacterState.system.tools = Array.from(tools);
  CharacterState.system.traits.languages.value = Array.from(languages);
  CharacterState.system.spells.cantrips = Array.from(cantrips);
  CharacterState.system.expertise = Array.from(expertise);
  CharacterState.feats = Array.from(feats.values());
  CharacterState.infusions = Array.from(infusions.values());
  for (const [ab, base] of Object.entries(baseState.abilities)) {
    CharacterState.system.abilities[ab].value =
      base + (CharacterState.bonusAbilities[ab] || 0);
  }
  updateSpellSlots();
  updateProficiencyBonus();
  main.invalidateStep?.(3);
  main.invalidateStep?.(4);
  main.invalidateStep?.(5);
  if (main.TOTAL_STEPS != null) {
    main.invalidateStep?.(main.TOTAL_STEPS - 1);
  }
  main.invalidateStepsFrom?.(3);
}

function validateTotalLevel(pendingClass) {
  const pending = pendingClass?.level || 0;
  const existing = totalLevel();
  if (existing + pending > MAX_CHARACTER_LEVEL) {
    const allowed = Math.max(0, MAX_CHARACTER_LEVEL - existing);
    if (pendingClass) pendingClass.level = allowed;
    globalToast('levelCap', { max: MAX_CHARACTER_LEVEL });
    return false;
  }
  return true;
}

function updateExpertiseSelectOptions(selects) {
  const list = Array.from(selects);
  const profSkills = [...CharacterState.system.skills].sort();
  list.forEach(sel => {
    const current = sel.value;
    sel.replaceChildren(new Option(t('select'), ''));
    profSkills.forEach(sk => {
      const o = document.createElement('option');
      o.value = sk;
      o.textContent = sk;
      sel.appendChild(o);
    });
    if (profSkills.includes(current)) sel.value = current;
  });
  filterDuplicateOptions(list, CharacterState.system.expertise || []);
}

function getExistingFeats() {
  const feats = new Set((CharacterState.feats || []).map(f => f.name));
  (CharacterState.classes || []).forEach(cls => {
    if (cls.choiceSelections) {
      Object.values(cls.choiceSelections).forEach(entries => {
        entries.forEach(e => {
          if (e.feat) feats.add(e.feat);
        });
      });
    }
  });
  return feats;
}

function updateFeatSelectOptions() {
  const selects = document.querySelectorAll("select[data-type='asi-feat']");
  const takenFromState = getExistingFeats();
  selects.forEach(sel => {
    const taken = new Set(takenFromState);
    selects.forEach(other => {
      if (other !== sel && other.value) taken.add(other.value);
    });
    Array.from(sel.options).forEach(opt => {
      if (opt.value && opt.value !== sel.value && taken.has(opt.value)) {
        opt.disabled = true;
      } else {
        opt.disabled = false;
      }
    });
  });
}

/**
 * Convert a subclass name into the slug used for data files.
 *
 * Handles several common naming patterns:
 * - Leading articles like "The" (e.g. "The Undying" → "undying")
 * - Standard subclass prefixes such as "Path of the", "Oath of the",
 *   "College of", etc. (e.g. "Path of the Beast" → "beast")
 * - Druid land circles where the terrain type is in parentheses
 *   ("Circle of the Land (Desert)" → "desert")
 * - Trailing descriptors like "Domain" or "Tradition"
 * - Parenthetical notes are folded into the slug
 *   ("Purple Dragon Knight (Banneret)" → "purple_dragon_knight_banneret")
 */
function slugifySubclass(name = '') {
  const slug = name
    .replace(/^Circle of the Land\s*/i, '')
    .replace(/^The /i, '')
    .replace(/^(Path|Oath|Circle|College|Order|Domain|Way|School) of (the )?/i, '')
    .replace(/ (Domain|Tradition)$/i, '')
    .replace(/\s*\(([^)]+)\)/g, ' $1')
    .replace(/[’']/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'land';
}

async function loadSubclassData(cls) {
  if (!cls.subclass) {
    cls.subclassData = null;
    return;
  }
  const slug = slugifySubclass(cls.subclass);
  try {
    const resp = await fetch(`data/subclasses/${slug}.json`);
    if (!resp.ok) throw new Error('Failed to load');
    cls.subclassData = await resp.json();
  } catch (e) {
    // Fallback: derive features from the raw class JSON if the file is
    // missing. This covers edge cases like homebrew or PSA subclasses.
    cls.subclassData = deriveSubclassData(cls.name, cls.subclass) || null;
  }
}

function compileClassFeatures(cls) {
  const data = DATA.classes.find(c => c.name === cls.name);
  if (!data) return;
  cls.features = [];
  for (let lvl = 1; lvl <= (cls.level || 1); lvl++) {
    let feats = [
      ...(data.features_by_level?.[lvl] || []),
      ...(cls.subclassData?.features_by_level?.[lvl] || []),
    ];
    const hasSubclassFeats = Array.isArray(cls.subclassData?.features_by_level?.[lvl])
      && (cls.subclassData.features_by_level[lvl] || []).length > 0;
    if (hasSubclassFeats) {
      const isSubclassPlaceholder = (name = '') => {
        const n = String(name || '').trim();
        const PLACEHOLDER_RE = /(Specialist|Domain|Archetype|College|Path|Oath|Tradition|Circle|Patron|Order|School)\s+feature$/i;
        if (PLACEHOLDER_RE.test(n)) return true;
        const BARE_NAMES = new Set([
          'Artificer Specialist',
          'Divine Domain',
          'Martial Archetype',
          'Roguish Archetype',
          'Sorcerous Origin',
          'Sacred Oath',
          'Otherworldly Patron',
          'Druid Circle',
          'Primal Path',
          'Monastic Tradition',
          'Bard College',
          'Arcane Tradition',
          'Ranger Archetype',
          'Ranger Conclave',
        ]);
        return BARE_NAMES.has(n);
      };
      feats = feats.filter(f => !isSubclassPlaceholder(f?.name || ''));
    }
    feats.forEach(f => {
      cls.features.push({
        level: lvl,
        name: f.name,
        description: f.description || '',
        entries: f.entries || [],
      });
    });
  }
  if (cls.choiceSelections) {
    for (const [name, entries] of Object.entries(cls.choiceSelections)) {
      const choiceDef =
        (data.choices || []).find(c => c.name === name) ||
        (cls.subclassData?.choices || []).find(c => c.name === name);
      entries.forEach(e => {
        if (choiceDef?.type === 'infusion') {
          cls.features.push({
            level: e.level || null,
            name: e.option,
            type: 'infusion',
            description: '',
            entries: [],
          });
        } else {
          cls.features.push({
            level: e.level || null,
            name: `${name}: ${e.option}`,
            abilities: e.abilities,
            feat: e.feat,
            optionalFeatures: e.optionalFeatures,
            description: choiceDef?.description || '',
            entries: choiceDef?.entries || [],
          });
        }
      });
    }
  }
  (cls.expertise || []).forEach(e => {
    cls.features.push({
      level: e.level || null,
      name: `Expertise: ${e.skill}`,
      description: '',
      entries: [],
    });
  });
}

function createAbilitySelect() {
  const abilities = [
    'Strength',
    'Dexterity',
    'Constitution',
    'Intelligence',
    'Wisdom',
    'Charisma',
  ];
  const sel = document.createElement('select');
  sel.replaceChildren(new Option(t('selectAbility'), ''));
  abilities.forEach(ab => {
    const o = document.createElement('option');
    o.value = ab;
    o.textContent = ab;
    sel.appendChild(o);
  });
  sel.dataset.type = 'asi-ability';
  return sel;
}

function createFeatSelect(current = '') {
  const sel = document.createElement('select');
  sel.replaceChildren(new Option(t('selectFeat'), ''));
  const taken = getExistingFeats();
  (DATA.feats || []).forEach(feat => {
    if (!taken.has(feat) || feat === current) {
      const o = document.createElement('option');
      o.value = feat;
      o.textContent = feat;
      sel.appendChild(o);
    }
  });
  sel.dataset.type = 'asi-feat';
  return sel;
}

function handleASISelection(sel, container, entry, cls) {
  const existing = container.querySelectorAll(
    `select[data-parent='${sel.dataset.choiceId}']`
  );
  existing.forEach(e => e.remove());

  entry.abilities = [];
  cls.asiBonuses = cls.asiBonuses || {};
  const refreshBonuses = () => {
    cls.asiBonuses = {};
    if (!cls.choiceSelections) return;
    Object.values(cls.choiceSelections).forEach(entries => {
      entries.forEach(e => {
        if (
          e.option === 'Increase one ability score by 2' &&
          Array.isArray(e.abilities)
        ) {
          const code = abilityMap[e.abilities[0]];
          if (code) cls.asiBonuses[code] = (cls.asiBonuses[code] || 0) + 2;
        } else if (
          e.option === 'Increase two ability scores by 1' &&
          Array.isArray(e.abilities)
        ) {
          e.abilities.forEach(ab => {
            const code = abilityMap[ab];
            if (code) cls.asiBonuses[code] = (cls.asiBonuses[code] || 0) + 1;
          });
        }
      });
    });
  };
  refreshBonuses();

  if (sel.value === 'Increase one ability score by 2') {
    const abilitySel = createAbilitySelect();
    abilitySel.dataset.parent = sel.dataset.choiceId;
    abilitySel.value = entry?.abilities?.[0] || '';
    abilitySel.addEventListener('change', () => {
      entry.abilities = [abilitySel.value];
      refreshBonuses();
      compileClassFeatures(cls);
      rebuildFromClasses();
      updateStep2Completion();
    });
    container.appendChild(abilitySel);
  } else if (sel.value === 'Increase two ability scores by 1') {
    for (let j = 0; j < 2; j++) {
      const abilitySel = createAbilitySelect();
      abilitySel.dataset.parent = sel.dataset.choiceId;
      abilitySel.value = entry?.abilities?.[j] || '';
      abilitySel.addEventListener('change', () => {
        const abilities = entry.abilities || [];
        abilities[j] = abilitySel.value;
        entry.abilities = abilities;
        refreshBonuses();
        compileClassFeatures(cls);
        rebuildFromClasses();
        updateStep2Completion();
      });
      container.appendChild(abilitySel);
    }
  } else if (sel.value === 'Feat') {
    const featSel = createFeatSelect(entry?.feat || '');
    featSel.dataset.parent = sel.dataset.choiceId;
    featSel.value = entry?.feat || '';
    const featChoicesDiv = document.createElement('div');
    featSel.addEventListener('change', async () => {
      entry.feat = featSel.value;
      entry.featRenderer = null;
      featChoicesDiv.innerHTML = '';
      if (featSel.value) {
        const onFeatChange = () => {
          if (entry.featRenderer?.isComplete()) {
            entry.featRenderer.apply();
            entry.optionalFeatures =
              entry.featRenderer.optionalFeatureSelects?.map(
                (s) => s.value
              );
            rebuildFromClasses();
          }
          updateStep2Completion();
        };
        entry.featRenderer = await renderFeatChoices(
          featSel.value,
          featChoicesDiv,
          onFeatChange
        );
        const all = [
          ...(entry.featRenderer.abilitySelects || []),
          ...(entry.featRenderer.skillSelects || []),
          ...(entry.featRenderer.toolSelects || []),
          ...(entry.featRenderer.languageSelects || []),
          ...(entry.featRenderer.spellSelects || []),
          ...(entry.featRenderer.optionalFeatureSelects || []),
        ];
        all.forEach((s) => s.addEventListener('change', onFeatChange));
      }
      compileClassFeatures(cls);
      rebuildFromClasses();
      updateFeatSelectOptions();
      updateStep2Completion();
    });
    container.appendChild(featSel);
    container.appendChild(featChoicesDiv);
    updateFeatSelectOptions();
  }
}

function renderClassEditor(cls, index) {
  const card = document.createElement('div');
  card.className = 'saved-class';
  card.classList.add('needs-selection');
  cls.element = card;
  cls.uiState = cls.uiState || {};
  inlineWarning(card, !classHasPendingChoices(cls));

  const header = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = `${cls.name}`;
  header.appendChild(title);

  const removeBtn = createElement('button', t('remove'));
  removeBtn.className = 'btn btn-danger';
  removeBtn.addEventListener('click', () => removeClass(index));
  header.appendChild(removeBtn);

  card.appendChild(header);

  const levelSel = document.createElement('select');
  for (let i = 1; i <= MAX_CHARACTER_LEVEL; i++) {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = i;
    levelSel.appendChild(o);
  }
  levelSel.value = cls.level || 1;
  levelSel.addEventListener('change', () => {
    const lvl = parseInt(levelSel.value, 10) || 1;
    const delta = lvl - (cls.level || 1);
    if (!validateTotalLevel({ level: delta })) {
      levelSel.value = cls.level || 1;
      return;
    }
    cls.level = lvl;
    if (cls.choiceSelections) {
      Object.keys(cls.choiceSelections).forEach(name => {
        cls.choiceSelections[name] = cls.choiceSelections[name].filter(
          e => (e.level || 1) <= cls.level
        );
        if (cls.choiceSelections[name].length === 0) delete cls.choiceSelections[name];
      });
    }
    cls.expertise = (cls.expertise || []).filter(e => (e.level || 1) <= cls.level);
    compileClassFeatures(cls);
    rebuildFromClasses();
    (CharacterState.classes || []).forEach(c => {
      if (!classRequiresSpellSelection(c) || !c.spellItem) return;
      const newRenderer = renderSpellChoices(c);
      if (c.spellItem.dataset?.spellContainer === 'inline') {
        const wrapper = document.createElement('div');
        wrapper.className = 'spell-choice-inline';
        wrapper.dataset.spellContainer = 'inline';
        wrapper.appendChild(createElement('h4', t('spellsKnown')));
        wrapper.appendChild(newRenderer.element);
        c.spellItem.replaceWith(wrapper);
        c.spellItem = wrapper;
      } else {
        const wrapper = document.createElement('div');
        wrapper.className = 'spell-choice-inline';
        wrapper.dataset.spellContainer = 'accordion';
        wrapper.appendChild(newRenderer.element);
        const newItem = createAccordionItem(t('spellsKnown'), wrapper, true);
        c.spellItem.parentNode.replaceChild(newItem, c.spellItem);
        c.spellItem = newItem;
      }
      c.spellRenderer = newRenderer;
    });
    renderSelectedClasses();
    updateStep2Completion();
  });
  card.appendChild(levelSel);

  const accordion = document.createElement('div');
  accordion.className = 'accordion';

  const skillSelects = [];
  const skillChoiceSelects = [];
  const skillChoiceSelectMap = new Map();
  const repeatedChoiceState = new Map();
  let spellInfoTarget = null;

  const stemToken = token => {
    return token
      .replace(/(ions|ion|ings|ing|ments|ment|ances|ance)$/g, '')
      .replace(/(ers|ies|ied|ed|es|ly|s)$/g, '')
      .replace(/e$/g, '');
  };

  const tokenizeName = name => {
    if (!name) return [];
    const tokens = String(name)
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .map(token => stemToken(token))
      .filter(token => token.length > 2);
    return Array.from(new Set(tokens));
  };

  const entryReferencesNames = (entry, names) => {
    if (!entry || !names.size) return false;
    if (Array.isArray(entry)) {
      return entry.some(item => entryReferencesNames(item, names));
    }
    if (typeof entry === 'string') return false;
    if (typeof entry !== 'object') return false;

    if (
      entry.type === 'refClassFeature' &&
      typeof entry.classFeature === 'string'
    ) {
      const refName = entry.classFeature.split('|')[0]?.trim().toLowerCase();
      if (refName && names.has(refName)) return true;
    }

    if (Array.isArray(entry.entries) && entryReferencesNames(entry.entries, names)) {
      return true;
    }
    if (Array.isArray(entry.items) && entryReferencesNames(entry.items, names)) {
      return true;
    }
    if (entry.entry && entryReferencesNames(entry.entry, names)) {
      return true;
    }
    return false;
  };

  const featureReferencesNames = (feature, names) => {
    if (!feature || !names.size) return false;
    const name = String(feature.name || '').toLowerCase();
    if (names.has(name)) return false;
    return entryReferencesNames(feature.entries, names);
  };

  // Normalize text for comparison by:
  // - Converting 5etools-style tokens like "{@item artisan's tools|phb}" to a
  //   readable label (e.g. "artisan's tools")
  // - Collapsing whitespace and lowercasing
  const normalizeText = (str) => {
    const toText = String(str || '').replace(/\{@[^}]+}/g, (match) => {
      const inner = match.slice(2, -1); // remove {@ and }
      const parts = inner.split('|');
      const head = parts[0] || '';
      const headParts = head.split(' ');
      headParts.shift(); // drop token type (e.g., 'item', 'spell', 'i')
      const primary = headParts.join(' ').trim();
      if (primary) return primary;
      for (let i = 1; i < parts.length; i += 1) {
        const segment = parts[i]?.trim();
        if (segment) return segment;
      }
      return head.trim();
    });
    return toText.replace(/\s+/g, ' ').trim().toLowerCase();
  };

  const entriesContainText = (entries, text) => {
    if (!Array.isArray(entries) || !text) return false;
    const target = normalizeText(text);
    if (!target) return false;
    const queue = [...entries];
    while (queue.length) {
      const entry = queue.shift();
      if (!entry) continue;
      if (typeof entry === 'string') {
        if (normalizeText(entry) === target) return true;
        continue;
      }
      if (Array.isArray(entry)) {
        queue.push(...entry);
        continue;
      }
      if (typeof entry !== 'object') continue;
      if (entry.description && normalizeText(entry.description) === target) return true;
      if (entry.name && normalizeText(entry.name) === target) return true;
      if (entry.entry) {
        if (entriesContainText([entry.entry], text)) return true;
      }
      if (Array.isArray(entry.entries) && entriesContainText(entry.entries, text)) return true;
      if (Array.isArray(entry.items) && entriesContainText(entry.items, text)) return true;
    }
    return false;
  };

  const popMatchingFeatures = (features, choice) => {
    if (!Array.isArray(features) || !features.length) return [];
    const choiceTokens = tokenizeName(choice?.name || '');
    if (!choiceTokens.length) return [];

    const matched = [];
    const matchedNames = new Set();

    for (let idx = features.length - 1; idx >= 0; idx -= 1) {
      const feature = features[idx];
      const featureTokens = tokenizeName(feature?.name || '');
      if (!featureTokens.length) continue;
      const featureTokenSet = new Set(featureTokens);
      const matches = choiceTokens.every(token => featureTokenSet.has(token));
      if (matches) {
        matched.unshift(features.splice(idx, 1)[0]);
        if (feature?.name) matchedNames.add(String(feature.name).toLowerCase());
      }
    }

    if (matchedNames.size) {
      for (let idx = features.length - 1; idx >= 0; idx -= 1) {
        const feature = features[idx];
        if (featureReferencesNames(feature, matchedNames)) {
          matched.unshift(features.splice(idx, 1)[0]);
          if (feature?.name) matchedNames.add(String(feature.name).toLowerCase());
        }
      }
    }

    return matched;
  };

  const appendFeatureDetails = (container, feature) => {
    if (!feature) return;
    const hasEntries = Array.isArray(feature.entries) && feature.entries.length;
    const shouldShowDescription =
      feature.description &&
      (!hasEntries || !entriesContainText(feature.entries, feature.description));
    if (shouldShowDescription) {
      container.appendChild(createElement('p', feature.description));
    }
    if (hasEntries) {
      appendEntries(container, feature.entries);
    }
  };

  const attachChoiceFeatures = (container, choice, features) => {
    const matched = popMatchingFeatures(features, choice);
    matched.forEach(feature => appendFeatureDetails(container, feature));
    return matched;
  };

  const updateInfusionDescription = (descriptionEl, baseText, total, delta) => {
    if (!descriptionEl) return;
    const totalSuffix = total ? ` (${total} total)` : '';
    if (delta > 0 && baseText) {
      descriptionEl.textContent = `${baseText}${totalSuffix}`;
      return;
    }
    if (delta > 0) {
      descriptionEl.textContent = `Choose ${delta} infusions${totalSuffix}`;
      return;
    }
    if (baseText) {
      descriptionEl.textContent = `${baseText}${totalSuffix}`;
      return;
    }
    if (total) {
      const plural = total === 1 ? '' : 's';
      descriptionEl.textContent = `You can know ${total} infusion${plural}.`;
      return;
    }
    descriptionEl.textContent = '';
  };

  const extendInfusionChoice = (state, choice, level, features) => {
    const baseText = choice.description || '';
    const targetCount = choice.count || 0;
    const currentCount = state.count || state.choiceSelects.length;
    const delta = Math.max(0, targetCount - currentCount);

    attachChoiceFeatures(state.infoWrapper || state.container, choice, features);

    cls.choiceSelections = cls.choiceSelections || {};
    const existing = cls.choiceSelections[choice.name] || [];
    cls.choiceSelections[choice.name] = existing;

    if (delta > 0 && state.optionsPromise) {
      const startIdx = currentCount;
      for (let idx = startIdx; idx < targetCount; idx += 1) {
        const sel = document.createElement('select');
        sel.replaceChildren(new Option(t('select'), ''));
        const choiceId = `${choice.name}-${level}-${idx}`;
        sel.dataset.choiceId = choiceId;
        sel.dataset.type = 'choice';
        sel.dataset.choiceName = choice.name;
        sel.dataset.choiceType = choice.type || '';
        const stored = existing[idx];
        if (stored) {
          stored.level = stored.level || level;
          stored.type = stored.type || choice.type;
          if (stored.slot === undefined) stored.slot = idx;
        }
        state.choiceSelects.push(sel);
        state.optionsPromise.then(opts => {
          opts.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            sel.appendChild(o);
          });
          if (stored) sel.value = stored.option;
        });
        sel.addEventListener('change', () => {
          const arr = cls.choiceSelections[choice.name];
          const entry = arr[idx] || { level, type: choice.type };
          entry.level = level;
          entry.type = choice.type;
          entry.slot = idx;
          entry.option = sel.value;
          arr[idx] = entry;
          handleASISelection(sel, state.choiceWrapper || state.container, entry, cls);
          updateChoiceSelectOptions(
            state.choiceSelects,
            choice.type,
            skillSelects,
            skillChoiceSelects
          );
          compileClassFeatures(cls);
          rebuildFromClasses();
          updateExpertiseSelectOptions(
            document.querySelectorAll("select[data-type='expertise']")
          );
          updateFeatSelectOptions();
          updateStep2Completion();
        });
        (state.choiceWrapper || state.container).appendChild(sel);
        if (stored) handleASISelection(sel, state.choiceWrapper || state.container, stored, cls);
      }
      state.optionsPromise.then(() => {
        updateChoiceSelectOptions(
          state.choiceSelects,
          choice.type,
          skillSelects,
          skillChoiceSelects
        );
      });
    }

    updateInfusionDescription(state.descriptionEl, baseText, targetCount, delta);
    state.count = Math.max(currentCount, targetCount);
  };

  const clsDef = DATA.classes.find(c => c.name === cls.name);
  if (clsDef) {
    if (clsDef.skill_proficiencies?.options) {
      const sContainer = document.createElement('div');
      if (CharacterState.showHelp) {
        const desc = document.createElement('p');
        desc.textContent = `${t('skillProficiencyExplanation')} ${t('chooseSkills', { count: clsDef.skill_proficiencies.choose })}`;
        sContainer.appendChild(desc);
      }
      // Cap required skill choices to available unique options
      const skillOpts = (clsDef.skill_proficiencies.options || []).slice();
      const knownSkills = new Set(CharacterState.system.skills || []);
      // Do not filter out this class's own previously selected skills,
      // otherwise a re-render (e.g., after selecting a subclass) would
      // drop them from the select options and visually clear the value.
      (cls.skills || []).filter(Boolean).forEach((sk) => knownSkills.delete(sk));
      const availSkills = skillOpts.filter(opt => !knownSkills.has(opt));
      const skillCount = Math.min(
        clsDef.skill_proficiencies.choose || 0,
        availSkills.length
      );
      cls.uiState = cls.uiState || {};
      cls.uiState.effectiveSkillChoose = skillCount;
      for (let i = 0; i < skillCount; i++) {
        const sel = document.createElement('select');
        sel.replaceChildren(new Option(t('select'), ''));
        availSkills.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          sel.appendChild(o);
        });
        sel.dataset.type = 'skill';
        sel.value = cls.skills?.[i] || '';
        skillSelects.push(sel);
        sel.addEventListener('change', () => {
          cls.skills = cls.skills || [];
          cls.skills[i] = sel.value;
          updateSkillSelectOptions(skillSelects, skillChoiceSelects);
          skillChoiceSelectMap.forEach(selects => {
            updateChoiceSelectOptions(selects, 'skills', skillSelects, skillChoiceSelects);
          });
          compileClassFeatures(cls);
          rebuildFromClasses();
          updateExpertiseSelectOptions(
            document.querySelectorAll("select[data-type='expertise']")
          );
          updateStep2Completion();
        });
        sContainer.appendChild(sel);
      }
      updateSkillSelectOptions(skillSelects, skillChoiceSelects);
      accordion.appendChild(
        createAccordionItem(t('skillProficiencies'), sContainer, true)
      );
    }

    if (Array.isArray(clsDef.subclasses) && clsDef.subclasses.length) {
      const subContainer = document.createElement('div');
      if (CharacterState.showHelp) {
        const desc = document.createElement('p');
        desc.textContent = t('chooseSubclass');
        subContainer.appendChild(desc);
      }
      const sel = document.createElement('select');
      sel.replaceChildren(new Option(t('select'), ''));
      clsDef.subclasses.forEach(sc => {
        const o = document.createElement('option');
        o.value = sc.name;
        o.textContent = sc.name;
        sel.appendChild(o);
      });
      sel.dataset.type = 'subclass';
      sel.value = cls.subclass || '';

      subContainer.appendChild(sel);

      const detailSection = createDetailsSection();
      detailSection.wrapper.classList.add('subclass-details');
      subContainer.appendChild(detailSection.wrapper);

      const renderSubclassDetails = () => {
        detailSection.content.innerHTML = '';
        if (!cls.subclass) {
          detailSection.wrapper.classList.add('hidden');
          detailSection.setExpanded(false);
          return;
        }
        const data = cls.subclassData;
        if (!data) {
          detailSection.wrapper.classList.remove('hidden');
          detailSection.setExpanded(false);
          detailSection.content.appendChild(createElement('p', t('loadingDetails')));
          return;
        }

        let hasContent = false;

        if (data.description) {
          detailSection.content.appendChild(createElement('p', data.description));
          hasContent = true;
        }

        if (Array.isArray(data.entries)) {
          const before = detailSection.content.childElementCount;
          appendEntries(detailSection.content, data.entries);
          if (detailSection.content.childElementCount > before) hasContent = true;
        }

        const featureGroups = data.features_by_level && typeof data.features_by_level === 'object'
          ? Object.keys(data.features_by_level)
              .map(lvl => parseInt(lvl, 10))
              .filter(lvl => !Number.isNaN(lvl))
              .sort((a, b) => a - b)
          : [];

        featureGroups.forEach(lvl => {
          const featureList = data.features_by_level?.[lvl];
          if (!Array.isArray(featureList) || !featureList.length) return;
          const section = document.createElement('div');
          section.className = 'subclass-feature';
          section.appendChild(createElement('h4', `${t('level')} ${lvl}`));
          featureList.forEach(feature => {
            if (!feature) return;
            if (feature.name) section.appendChild(createElement('h5', feature.name));
            if (feature.description) section.appendChild(createElement('p', feature.description));
            const entryList = [];
            if (Array.isArray(feature.entries)) entryList.push(...feature.entries);
            else if (feature.entries) entryList.push(feature.entries);
            if (Array.isArray(feature.entry)) entryList.push(...feature.entry);
            else if (feature.entry) entryList.push(feature.entry);
            if (entryList.length) appendEntries(section, entryList);
          });
          detailSection.content.appendChild(section);
          hasContent = true;
        });

        if (!hasContent) {
          detailSection.content.appendChild(createElement('p', t('noDetailsAvailable')));
        }

        detailSection.wrapper.classList.remove('hidden');
      };

      renderSubclassDetails();

      sel.addEventListener('change', async () => {
        cls.subclass = sel.value;
        if (cls.subclass) cls.subclassData = null;
        cls.uiState.subclassOpen = true;
        renderSubclassDetails();
        await loadSubclassData(cls);
        renderSubclassDetails();
        compileClassFeatures(cls);
        rebuildFromClasses();
        renderSelectedClasses();
        updateStep2Completion();
      });
      const subclassAccordion = createAccordionItem(
        t('subclass'),
        subContainer,
        true
      );
      const subclassHeader =
        subclassAccordion.accordionHeader ||
        subclassAccordion.querySelector('.accordion-header');
      const subclassBody =
        subclassAccordion.accordionContent ||
        subclassAccordion.querySelector('.accordion-content');
      const setSubclassExpanded =
        subclassAccordion.setAccordionExpanded ||
        ((expanded) => {
          subclassHeader.classList.toggle('active', !!expanded);
          subclassBody.classList.toggle('show', !!expanded);
        });
      const getSubclassExpanded =
        subclassAccordion.isAccordionExpanded ||
        (() => subclassHeader.classList.contains('active'));
      const shouldOpen =
        cls.uiState.subclassOpen !== undefined
          ? cls.uiState.subclassOpen
          : !cls.subclass;
      setSubclassExpanded(shouldOpen);
      subclassHeader.addEventListener('click', () => {
        cls.uiState.subclassOpen = getSubclassExpanded();
      });
      accordion.appendChild(subclassAccordion);
    }

    if (cls.subclass && !cls.subclassData) {
      loadSubclassData(cls).then(() => {
        compileClassFeatures(cls);
        rebuildFromClasses();
        renderSelectedClasses();
      });
    }

    for (let lvl = 1; lvl <= (cls.level || 1); lvl++) {
      const levelChoices = [
        ...(clsDef.choices || []).filter(c => c.level === lvl),
        ...(cls.subclassData?.choices || []).filter(c => c.level === lvl),
      ];
      let features = [
        ...(clsDef.features_by_level?.[lvl] || []),
        ...(cls.subclassData?.features_by_level?.[lvl] || []),
      ];

      // If subclass provides concrete features at this level, hide generic
      // placeholder entries like "Divine Domain"/"Artificer Specialist"
      const hasSubclassFeats = Array.isArray(cls.subclassData?.features_by_level?.[lvl])
        && (cls.subclassData.features_by_level[lvl] || []).length > 0;
      if (hasSubclassFeats) {
        const isSubclassPlaceholder = (name = '') => {
          const n = String(name || '').trim();
          const PLACEHOLDER_RE = /(Specialist|Domain|Archetype|College|Path|Oath|Tradition|Circle|Patron|Order|School)\s+feature$/i;
          if (PLACEHOLDER_RE.test(n)) return true;
          const BARE_NAMES = new Set([
            'Artificer Specialist',
            'Divine Domain',
            'Martial Archetype',
            'Roguish Archetype',
            'Sorcerous Origin',
            'Sacred Oath',
            'Otherworldly Patron',
            'Druid Circle',
            'Primal Path',
            'Monastic Tradition',
            'Bard College',
            'Arcane Tradition',
            'Ranger Archetype',
            'Ranger Conclave',
          ]);
          return BARE_NAMES.has(n);
        };
        features = features.filter(f => !isSubclassPlaceholder(f?.name || ''));
      }

      // track effective counts for gating
      cls.effectiveChoiceCounts = cls.effectiveChoiceCounts || {};
      if (!cls.effectiveChoiceCounts.__levels) cls.effectiveChoiceCounts.__levels = {};

      levelChoices.forEach(choice => {
        const isInfusionChoice = choice.type === 'infusion';
        const choiceKey = isInfusionChoice ? `${choice.type}:${choice.name}` : null;
        const existingState = choiceKey ? repeatedChoiceState.get(choiceKey) : null;

        if (isInfusionChoice && existingState) {
          extendInfusionChoice(existingState, choice, lvl, features);
          return;
        }

        const cContainer = document.createElement('div');
        const choiceWrapper = document.createElement('div');
        choiceWrapper.className = 'choice-controls';
        cContainer.appendChild(choiceWrapper);
        const infoWrapper = document.createElement('div');
        infoWrapper.className = 'choice-info';
        cContainer.appendChild(infoWrapper);

        attachChoiceFeatures(infoWrapper, choice, features);

        const baseDescription = choice.description || '';
        let descriptionEl = null;
        if (baseDescription) {
          descriptionEl = createElement('p', baseDescription);
          choiceWrapper.appendChild(descriptionEl);
        } else if (isInfusionChoice) {
          descriptionEl = createElement('p', '');
          choiceWrapper.appendChild(descriptionEl);
        }

        appendEntries(infoWrapper, choice.entries);

        let count = choice.count || 1;
        if (isInfusionChoice) {
          updateInfusionDescription(descriptionEl, baseDescription, count, count);
        }

        const choiceSelects = [];
        const isExpertise = choice.name === 'Expertise' || choice.requiresProficiency;
        let existing = [];
        if (isExpertise) {
          cls.expertise = cls.expertise || [];
          existing = cls.expertise.filter(e =>
            e.id.startsWith(`${choice.name}-${choice.level}-`)
          );
        } else {
          cls.choiceSelections = cls.choiceSelections || {};
          const allExisting = Array.isArray(cls.choiceSelections[choice.name])
            ? cls.choiceSelections[choice.name]
            : [];
          cls.choiceSelections[choice.name] = allExisting;
          existing = allExisting.filter(entry => (entry.level || 1) === lvl);
        }
        let cantripOptionsPromise;
        let infusionOptionsPromise;
        if (choice.type === 'cantrips' && !isExpertise) {
          cantripOptionsPromise = loadSpells().then(spells =>
            spells
              .filter(
                s => s.level === 0 && (s.spell_list || []).includes(cls.name)
              )
              .map(s => s.name)
              .sort()
          );
        } else if (choice.type === 'infusion' && !isExpertise) {
          infusionOptionsPromise = loadInfusions().then(list =>
            list
              .filter(opt => (opt.minLevel || 2) <= lvl)
              .map(opt => opt.name)
              .sort((a, b) =>
                a.localeCompare(b, undefined, { sensitivity: 'base' })
              )
          );
        }
        // Determine effective number of selects to render based on availability
        let toCreate = count;
        if (isExpertise) {
          // Always render full number of selects; the options list
          // updates dynamically as proficiencies are chosen elsewhere.
          toCreate = count;
        } else if (choice.type === 'skills' || choice.type === 'tools' || choice.type === 'languages') {
          const base = Array.isArray(choice.selection) ? choice.selection.slice() : [];
          const knownList = getProficiencyList(choice.type) || [];
          const available = base.filter(opt => !knownList.includes(opt));
          toCreate = Math.min(count, available.length);
        }
        // Store effective count for gating
        const perName = (cls.effectiveChoiceCounts[choice.name] = cls.effectiveChoiceCounts[choice.name] || {});
        perName[lvl] = toCreate;

        for (let i = 0; i < toCreate; i++) {
          const sel = document.createElement('select');
          sel.replaceChildren(new Option(t('select'), ''));
          const choiceId = `${choice.name}-${lvl}-${i}`;
          sel.dataset.choiceId = choiceId;
          if (isExpertise) {
            sel.dataset.type = 'expertise';
            const stored = existing.find(e => e.id === choiceId);
            if (stored) sel.value = stored.skill;
            choiceSelects.push(sel);
            sel.addEventListener('change', () => {
              cls.expertise = cls.expertise || [];
              const idx = cls.expertise.findIndex(e => e.id === choiceId);
              if (sel.value) {
                const obj = { id: choiceId, level: lvl, skill: sel.value };
                if (idx >= 0) cls.expertise[idx] = obj;
                else cls.expertise.push(obj);
              } else if (idx >= 0) {
                cls.expertise.splice(idx, 1);
              }
              rebuildFromClasses();
              updateExpertiseSelectOptions(
                document.querySelectorAll("select[data-type='expertise']")
              );
              updateStep2Completion();
            });
            choiceWrapper.appendChild(sel);
          } else {
            sel.dataset.type = 'choice';
            sel.dataset.choiceName = choice.name;
            sel.dataset.choiceType = choice.type || '';
            const stored = existing.find(entry => entry.slot === i) || existing[i];
            if (stored) {
              stored.level = stored.level || lvl;
              stored.type = stored.type || choice.type;
              if (stored.slot === undefined) stored.slot = i;
            }
            choiceSelects.push(sel);
            if (choice.type === 'cantrips') {
              cantripOptionsPromise.then(opts => {
                opts.forEach(opt => {
                  const o = document.createElement('option');
                  o.value = opt;
                  o.textContent = opt;
                  sel.appendChild(o);
                });
                if (stored) sel.value = stored.option;
                // Adjust effective count after async list resolves, capping to available unique options
                const known = new Set(CharacterState.system.spells.cantrips || []);
                const avail = opts.filter(o => !known.has(o));
                const eff = Math.min(count, avail.length);
                const per = (cls.effectiveChoiceCounts[choice.name] = cls.effectiveChoiceCounts[choice.name] || {});
                per[lvl] = eff;
                updateStep2Completion();
              });
            } else if (choice.type === 'infusion') {
              infusionOptionsPromise.then(opts => {
                opts.forEach(opt => {
                  const o = document.createElement('option');
                  o.value = opt;
                  o.textContent = opt;
                  sel.appendChild(o);
                });
                if (stored) sel.value = stored.option;
                const existing = new Set((CharacterState.infusions || []).map(i => i.name || i));
                const avail = opts.filter(o => !existing.has(o));
                const eff = Math.min(count, avail.length);
                const per = (cls.effectiveChoiceCounts[choice.name] = cls.effectiveChoiceCounts[choice.name] || {});
                per[lvl] = eff;
                updateStep2Completion();
              });
            } else {
              (choice.selection || []).forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                sel.appendChild(o);
              });
              if (stored) sel.value = stored.option;
            }
            if (choice.type === 'skills') {
              skillChoiceSelects.push(sel);
            }
            sel.addEventListener('change', () => {
              cls.choiceSelections[choice.name] =
                cls.choiceSelections[choice.name] || [];
              const arr = cls.choiceSelections[choice.name];
              const sameLevelEntries = arr.filter(
                entry => (entry.level || 1) === lvl
              );
              let entry = sameLevelEntries.find(e => e.slot === i) || sameLevelEntries[i];
              if (!entry) {
                entry = { level: lvl, type: choice.type };
                arr.push(entry);
              }
              entry.level = lvl;
              entry.type = choice.type;
              entry.slot = i;
              entry.option = sel.value;
              handleASISelection(sel, choiceWrapper, entry, cls);
              updateChoiceSelectOptions(choiceSelects, choice.type, skillSelects, skillChoiceSelects);
              if (choice.type === 'skills') {
                updateSkillSelectOptions(skillSelects, skillChoiceSelects);
                skillChoiceSelectMap.forEach(selects => {
                  updateChoiceSelectOptions(selects, 'skills', skillSelects, skillChoiceSelects);
                });
              }
              compileClassFeatures(cls);
              rebuildFromClasses();
              updateExpertiseSelectOptions(
                document.querySelectorAll("select[data-type='expertise']")
              );
              updateFeatSelectOptions();
              updateStep2Completion();
            });
            choiceWrapper.appendChild(sel);
            if (stored) {
              handleASISelection(sel, choiceWrapper, stored, cls);
            }
          }
        }
        if (isExpertise) {
          updateExpertiseSelectOptions(
            document.querySelectorAll("select[data-type='expertise']")
          );
        } else if (choice.type === 'skills') {
          skillChoiceSelectMap.set(choice.name, choiceSelects);
          updateSkillSelectOptions(skillSelects, skillChoiceSelects);
          skillChoiceSelectMap.forEach(selects => {
            updateChoiceSelectOptions(selects, 'skills', skillSelects, skillChoiceSelects);
          });
        } else if (choice.type === 'cantrips') {
          cantripOptionsPromise.then(() => {
            updateChoiceSelectOptions(choiceSelects, choice.type, skillSelects, skillChoiceSelects);
          });
        } else if (choice.type === 'infusion') {
          infusionOptionsPromise.then(() => {
            updateChoiceSelectOptions(choiceSelects, choice.type, skillSelects, skillChoiceSelects);
          });
        } else {
          updateChoiceSelectOptions(choiceSelects, choice.type, skillSelects, skillChoiceSelects);
        }
        const accordionItem = createAccordionItem(
          `${t('level')} ${choice.level}: ${choice.name}`,
          cContainer,
          true
        );
        if (isInfusionChoice) {
          const optionsPromise = infusionOptionsPromise || Promise.resolve([]);
          repeatedChoiceState.set(choiceKey, {
            container: cContainer,
            choiceWrapper,
            infoWrapper,
            choiceSelects,
            descriptionEl,
            optionsPromise,
            count,
          });
        }
        accordion.appendChild(accordionItem);
      });
      features.forEach(f => {
        if (f.type === 'infusion') {
          const existing = (CharacterState.infusions || []).find(
            i => i.name === f.name
          );
          f.infusionRenderer = renderInfusion(
            f.name,
            existing || {}
          );
          accordion.appendChild(
            createAccordionItem(
              `${t('level')} ${lvl}: ${f.name}`,
              f.infusionRenderer.element
            )
          );
        } else {
          const body = document.createElement('div');
          const hasEntries = Array.isArray(f.entries) && f.entries.length > 0;
          const entryTextSet = collectEntryTexts(f.entries);
          if (f.description) {
            const summaryText = normalizeFeatureText(f.description);
            if (!hasEntries || (summaryText && !entryTextSet.has(summaryText))) {
              body.appendChild(createElement('p', f.description));
            }
          }
          let entriesToRender = f.entries;
          if (hasEntries) {
            const seenStrings = new Set();
            entriesToRender = f.entries.filter((entry) => {
              if (typeof entry === 'string') {
                const key = normalizeFeatureText(entry);
                if (!key) return false;
                if (seenStrings.has(key)) return false;
                seenStrings.add(key);
              }
              return true;
            });
            appendEntries(body, entriesToRender);
          }
          if (!spellInfoTarget && /(spellcasting|pact magic)/i.test(f.name || '')) {
            spellInfoTarget = body;
          }
          accordion.appendChild(
            createAccordionItem(`${t('level')} ${lvl}: ${f.name}`, body)
          );
        }
      });
    }
  }

  if (classRequiresSpellSelection(cls)) {
    cls.spellRenderer = renderSpellChoices(cls);
    const wrapper = document.createElement('div');
    wrapper.className = 'spell-choice-inline';
    wrapper.dataset.spellContainer = spellInfoTarget ? 'inline' : 'accordion';
    if (spellInfoTarget) {
      wrapper.appendChild(createElement('h4', t('spellsKnown')));
    }
    wrapper.appendChild(cls.spellRenderer.element);
    if (spellInfoTarget) {
      spellInfoTarget.appendChild(wrapper);
      cls.spellItem = wrapper;
    } else {
      const accItem = createAccordionItem(t('spellsKnown'), wrapper, true);
      accordion.appendChild(accItem);
      cls.spellItem = accItem;
    }
  }

  card.appendChild(accordion);
  return card;
}

function removeClass(index) {
  const classes = CharacterState.classes || [];
  if (index < 0 || index >= classes.length) return;

  if (
    typeof window !== 'undefined' &&
    typeof window.confirm === 'function'
  ) {
    const proceed = window.confirm(t('removeClassConfirm'));
    if (!proceed) return;
  }

  const removed = classes.splice(index, 1)[0];
  if (removed) {
    delete (CharacterState.knownSpells || {})[removed.name];
  }
  rebuildFromClasses();
  if (!classes.length) {
    loadStep2(false);
    return;
  }
  renderSelectedClasses();
  updateStep2Completion();
}

function renderSelectedClasses() {
  const container = document.getElementById('selectedClasses');
  if (!container) return;
  container.innerHTML = '';
  const classes = CharacterState.classes || [];
  if (classes.length) {
    const summaryText = classes
      .map(c => `${c.name} (${t('level')} ${c.level})`)
      .join(', ');
    if (CharacterState.showHelp) {
      container.appendChild(
        createElement(
          'p',
          t('selectedClasses', { classes: summaryText, level: totalLevel() })
        )
      );
      container.appendChild(
        createElement('p',
          t('proficiencyBonus', {
            value: CharacterState.system.attributes.prof,
          })
        )
      );
    }
  }

  classes.forEach((cls, index) => {
    const card = renderClassEditor(cls, index);
    container.appendChild(card);
  });
  updateExpertiseSelectOptions(
    document.querySelectorAll("select[data-type='expertise']")
  );

  const addLink = document.createElement('a');
  addLink.href = '#';
  addLink.textContent = t('addAnotherClass');
  addLink.addEventListener('click', e => {
    e.preventDefault();
    showClassSelectionModal();
  });
  const linkWrapper = document.createElement('p');
  linkWrapper.appendChild(addLink);
  container.appendChild(linkWrapper);
}

function showClassSelectionModal() {
  const modal = document.getElementById('classSelectionModal');
  const list = document.getElementById('classSelectionList');
  const closeBtn = document.getElementById('closeClassSelectionModal');
  if (!modal || !list) return;
  list.innerHTML = '';
  // Filter out classes that are already part of the character's build
  const taken = new Set((CharacterState.classes || []).map(c => c.name));

  (DATA.classes || []).forEach(cls => {
    if (taken.has(cls.name)) return;

    // Each remaining class is rendered as a clickable button
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = cls.name;
    btn.addEventListener('click', () => {
      modal.classList.add('hidden');
      selectClass(cls);
    });
    list.appendChild(btn);
  });

  // Reveal the modal and wire up the close action
  modal.classList.remove('hidden');
  if (closeBtn) {
    closeBtn.onclick = () => modal.classList.add('hidden');
  }
}

function classHasPendingChoices(cls) {
  const clsDef = DATA.classes.find(c => c.name === cls.name);
  if (!clsDef) return false;

  if (clsDef.skill_proficiencies?.options) {
    const required = clsDef.skill_proficiencies.choose || 0;
    const effective = cls.uiState?.effectiveSkillChoose ?? required;
    if ((cls.skills || []).filter(Boolean).length < effective) return true;
  }

  if (Array.isArray(clsDef.subclasses) && clsDef.subclasses.length && !cls.subclass) {
    return true;
  }

  const choices = [
    ...(clsDef.choices || []),
    ...(cls.subclassData?.choices || []),
  ].filter(c => c.level <= (cls.level || 1));
  for (const choice of choices) {
    const effectiveCount = (cls.effectiveChoiceCounts?.[choice.name]?.[choice.level])
      ?? (choice.count || 1);
    const needed = choice.optional ? 0 : effectiveCount;
    const isExpertise = choice.name === 'Expertise' || choice.requiresProficiency;
    if (isExpertise) {
      const selections = (cls.expertise || []).filter(e => e.level === choice.level);
      if (selections.length < needed) return true;
      if (selections.some(s => !s.skill)) return true;
      continue;
    }
    const selections = cls.choiceSelections?.[choice.name] || [];
    if (selections.length < needed) return true;
    if (selections.some(s => !s.option)) return true;
    if (choice.type === 'asi') {
      for (const sel of selections) {
        if (
          sel.option === 'Increase one ability score by 2' &&
          !(sel.abilities && sel.abilities.length)
        )
          return true;
        if (
          sel.option === 'Increase two ability scores by 1' &&
          (!sel.abilities || sel.abilities.length !== 2)
        )
          return true;
        if (sel.option === 'Feat') {
          if (!sel.feat) return true;
          if (sel.featRenderer && !sel.featRenderer.isComplete()) return true;
        }
      }
    }
  }
  if (classRequiresSpellSelection(cls)) {
    if (!cls.spellRenderer || !cls.spellRenderer.isComplete()) return true;
  }
  return false;
}

export function updateStep2Completion() {
  const btnStep3 = document.getElementById('btnStep3');
  const btnStep4 = document.getElementById('btnStep4');
  const progressBar = document.getElementById('progressBar');

  const complete = isStepComplete();

  if (btnStep3) btnStep3.disabled = !complete;
  if (btnStep4)
    btnStep4.disabled =
      !complete || !CharacterState.system.details.race;
  if (progressBar) {
    const width = ((complete ? 2 : 1) / (main.TOTAL_STEPS - 1)) * 100;
    progressBar.style.width = `${width}%`;
  }
  (CharacterState.classes || []).forEach((cls) => {
    if (cls.element) inlineWarning(cls.element, !classHasPendingChoices(cls));
  });
  main.setCurrentStepComplete?.(complete);
}

export function isStepComplete() {
  const incomplete = (CharacterState.classes || []).some(classHasPendingChoices);
  const hasClass = (CharacterState.classes || []).length > 0;
  return hasClass && !incomplete && pendingReplacements() === 0;
}

export function confirmStep() {
  updateStep2Completion();
  return isStepComplete();
}

/**
 * Inizializza lo Step 2: Selezione Classe
 */
export async function loadStep2(refresh = true, forceDataReload = false) {
  const classListContainer = document.getElementById('classList');
  const selectedClassesContainer = document.getElementById('selectedClasses');
  let searchInput = document.getElementById('classSearch');
  if (!classListContainer || !selectedClassesContainer) return;
  classListContainer.innerHTML = '';
  selectedClassesContainer.innerHTML = '';

  // Ensure the class data has been loaded before rendering
  try {
    await loadClasses(forceDataReload);
    await loadFeats(forceDataReload);
  } catch (err) {
    console.error(t('classDataUnavailable'), err);
    return;
  }

  if (refresh) refreshBaseState();
  // Rebuild the selected classes list from the current character state
  renderSelectedClasses();
  updateStep2Completion();

  // Show either the class selection list or the already selected classes
  classListContainer.classList.toggle('hidden', CharacterState.classes.length !== 0);
  selectedClassesContainer?.classList.toggle('hidden', CharacterState.classes.length === 0);
  searchInput?.classList.toggle('hidden', CharacterState.classes.length !== 0);

  if (CharacterState.classes.length !== 0) {
    return;
  }

  const classes = Array.isArray(DATA.classes) ? DATA.classes : [];
  if (!classes.length) {
    console.error(t('classDataUnavailable'));
    return;
  }
  function renderClassCards(query = '') {
    classListContainer.innerHTML = '';
    const taken = new Set(CharacterState.classes.map(c => c.name));
    classes
      .filter(
        cls =>
          !taken.has(cls.name) &&
          cls.name.toLowerCase().includes(query.toLowerCase())
      )
      .forEach(cls => {
        const imageUrl = `assets/classes/${cls.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '')}.png`;
        const card = createSelectableCard(
          cls.name,
          cls.description || t('noDescription'),
          null,
          () => showClassModal(cls),
          t('details'),
          () => showClassModal(cls),
          imageUrl
        );
        classListContainer.appendChild(card);
      });
  }
  if (searchInput) {
    const newInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newInput, searchInput);
    searchInput = newInput;
    searchInput.addEventListener('input', () =>
      renderClassCards(searchInput.value)
    );
  }
  renderClassCards();
}

/**
 * Mostra il modal con i dettagli della classe
 */
function showClassModal(cls) {
  const modal = document.getElementById('classModal');
  const details = document.getElementById('classModalDetails');
  const addBtn = document.getElementById('addClassButton');
  const closeBtn = document.getElementById('closeClassModal');

  if (!modal || !details || !addBtn) return;

  details.innerHTML = '';

  // Title and description
  details.appendChild(createElement('h2', cls.name));
  if (CharacterState.showHelp)
    details.appendChild(
      createElement('p', cls.description || t('noDescription'))
    );

  // Proficiency information
  const profList = document.createElement('ul');
  if (Array.isArray(cls.armor_proficiencies) && cls.armor_proficiencies.length) {
    profList.appendChild(
      createElement('li',
        t('armorProficiencies', { list: cls.armor_proficiencies.join(', ') })
      )
    );
  }
  if (Array.isArray(cls.weapon_proficiencies) && cls.weapon_proficiencies.length) {
    profList.appendChild(
      createElement('li',
        t('weaponProficiencies', { list: cls.weapon_proficiencies.join(', ') })
      )
    );
  }
  if (cls.skill_proficiencies) {
    let skillText = '';
    if (cls.skill_proficiencies.options) {
      skillText = t('chooseOptions', {
        count: cls.skill_proficiencies.choose,
        options: cls.skill_proficiencies.options.join(', '),
      });
    } else if (cls.skill_proficiencies.fixed) {
      skillText = cls.skill_proficiencies.fixed.join(', ');
    }
    if (skillText) {
      profList.appendChild(
        createElement('li', `${t('skills')}: ${skillText}`)
      );
    }
  }
  if (profList.childNodes.length) {
    const profHeader = createElement('h3', t('proficiencies'));
    details.appendChild(profHeader);
    details.appendChild(profList);
  }

  addBtn.onclick = () => {
    selectClass(cls);
    modal.classList.add('hidden');
  };
  modal.classList.remove('hidden');

  if (closeBtn) {
    closeBtn.onclick = () => modal.classList.add('hidden');
  }
}

/**
 * Salva la classe selezionata nel CharacterState
 */
async function selectClass(cls) {
  const classes = CharacterState.classes || (CharacterState.classes = []);
  if (classes.some(c => c.name === cls.name)) {
    await showConfirmation(t('classAlreadySelected', { name: cls.name }), {
      confirmText: t('ok'),
      cancelText: null,
    });
    loadStep2(false);
    return false;
  }

  const newCls = {
    name: cls.name,
    level: 1,
    fixed_proficiencies: cls.language_proficiencies?.fixed || [],
    fixed_tools: Array.isArray(cls.tool_proficiencies) ? cls.tool_proficiencies.slice() : [],
    skill_choices: cls.skill_proficiencies || [],
    spellcasting: cls.spellcasting || {},
    skills: [],
    choiceSelections: {},
    expertise: [],
  };
  classes.push(newCls);
  compileClassFeatures(newCls);
  const modal = document.getElementById('classModal');
  modal?.classList.add('hidden');
  rebuildFromClasses();
  document.getElementById('classList')?.classList.add('hidden');
  document.getElementById('classSearch')?.classList.add('hidden');
  document.getElementById('selectedClasses')?.classList.remove('hidden');
  loadStep2(false);
  updateStep2Completion();
  return true;
}

export {
  updateExpertiseSelectOptions,
  validateTotalLevel,
  refreshBaseState,
  rebuildFromClasses,
  selectClass,
  renderClassEditor,
  slugifySubclass,
};
