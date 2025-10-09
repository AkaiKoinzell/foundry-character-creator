import { t } from './i18n.js';
import { showConfirmation } from './ui-helpers.js';
import {
  getCustomEntries,
  getCustomFeatDetail,
  getCustomEquipmentOverrides,
} from './custom-data.js';
export const DATA = {};

// Maximum total level a character can reach
export const MAX_CHARACTER_LEVEL = 20;

const ABILITY_LABELS = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const SKILL_LABELS = {
  acrobatics: 'Acrobatics',
  'animal handling': 'Animal Handling',
  arcana: 'Arcana',
  athletics: 'Athletics',
  deception: 'Deception',
  history: 'History',
  insight: 'Insight',
  intimidation: 'Intimidation',
  investigation: 'Investigation',
  medicine: 'Medicine',
  nature: 'Nature',
  perception: 'Perception',
  performance: 'Performance',
  persuasion: 'Persuasion',
  religion: 'Religion',
  'sleight of hand': 'Sleight of Hand',
  stealth: 'Stealth',
  survival: 'Survival',
};

const WORD_NUMBER_MAP = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const ARTISAN_TOOLS = [
  "Alchemist's Supplies",
  "Brewer's Supplies",
  "Calligrapher's Supplies",
  "Carpenter's Tools",
  "Cartographer's Tools",
  "Cobbler's Tools",
  "Cook's Utensils",
  "Glassblower's Tools",
  "Jeweler's Tools",
  "Leatherworker's Tools",
  "Mason's Tools",
  "Painter's Supplies",
  "Potter's Tools",
  "Smith's Tools",
  "Tinker's Tools",
  "Weaver's Tools",
  "Woodcarver's Tools",
];

const MUSICAL_INSTRUMENTS = [
  'Bagpipes',
  'Drum',
  'Dulcimer',
  'Flute',
  'Lute',
  'Lyre',
  'Horn',
  'Pan Flute',
  'Shawm',
  'Viol',
];

const GAMING_SETS = ['Dice Set', 'Dragonchess Set', 'Playing Card Set', 'Three-Dragon Ante Set'];

const STANDARD_LANGUAGES = [
  'Common',
  'Dwarvish',
  'Elvish',
  'Giant',
  'Gnomish',
  'Goblin',
  'Halfling',
  'Orc',
];

const COMMON_MISC_TOOLS = [
  "Alchemist's Supplies",
  "Calligrapher's Supplies",
  "Cartographer's Tools",
  "Disguise Kit",
  "Forgery Kit",
  "Herbalism Kit",
  "Navigator's Tools",
  "Poisoner's Kit",
  "Thieves' Tools",
  'Vehicles (Air)',
  'Vehicles (Land)',
  'Vehicles (Space)',
  'Vehicles (Water)',
];

const ALL_TOOL_OPTIONS = Array.from(
  new Set([
    ...ARTISAN_TOOLS,
    ...MUSICAL_INSTRUMENTS,
    ...GAMING_SETS,
    ...COMMON_MISC_TOOLS,
  ])
).sort((a, b) => a.localeCompare(b));

const EQUIPMENT_NAME_NORMALIZER = /[^a-z0-9]+/g;

const DEFAULT_ASI_DESCRIPTION =
  'Increase one ability score by 2, two ability scores by 1, or take a feat if allowed.';

const DEFAULT_ASI_SELECTION = [
  'Increase one ability score by 2',
  'Increase two ability scores by 1',
  'Feat',
];

const PACT_BOON_OPTIONS = [
  'Pact of the Chain',
  'Pact of the Blade',
  'Pact of the Talisman',
  'Pact of the Tome',
];

function deepClone(value) {
  if (value == null || typeof value !== 'object') return value;
  if (typeof globalThis.structuredClone === 'function') {
    try {
      return globalThis.structuredClone(value);
    } catch (err) {
      console.warn('structuredClone failed in data clone, falling back', err);
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    console.warn('Unable to deep clone value in data.js', err);
    return undefined;
  }
}

function titleCaseName(str = '') {
  return String(str)
    .replace(/[_-]+/g, ' ')
    .replace(/\|.*$/, '')
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .replace(/'\w/g, (m) => m.toUpperCase());
}

function stripSourceSuffix(text = '') {
  return String(text).split('|')[0];
}

function formatSkillName(name = '') {
  const key = String(name).toLowerCase();
  return SKILL_LABELS[key] || titleCaseName(name);
}

function formatToolName(name = '') {
  return titleCaseName(stripSourceSuffix(name));
}

function formatLanguageName(name = '') {
  return titleCaseName(stripSourceSuffix(name));
}

function expandToolOption(option = '') {
  const key = stripSourceSuffix(option).toLowerCase();
  if (key === 'gaming set' || key === 'anygamingset') return [...GAMING_SETS];
  if (key === 'anymusicalinstrument' || key === 'musical instrument') return [...MUSICAL_INSTRUMENTS];
  if (key === 'anyartisanstool' || key === "artisan's tools" || key === 'artisans tools') return [...ARTISAN_TOOLS];
  if (key === 'anytool' || key === 'tool') return [...ALL_TOOL_OPTIONS];
  return [formatToolName(option)];
}

function expandLanguageCategory(category = '', count = 1) {
  const key = category.toLowerCase();
  if (key === 'anystandard') {
    return [{ choose: count, options: [...STANDARD_LANGUAGES], label: 'Standard Languages' }];
  }
  if (key === 'any') {
    return [{ choose: count, options: [], allowAny: true, label: 'Languages' }];
  }
  if (key === 'other') {
    return [{ choose: count, options: [], label: 'Other Languages' }];
  }
  return [];
}

function mergeChoiceGroups(existing, addition) {
  if (!addition) return existing;
  if (!existing) return Array.isArray(addition) ? addition : [addition];
  const list = Array.isArray(existing) ? existing : [existing];
  if (Array.isArray(addition)) list.push(...addition);
  else list.push(addition);
  return list;
}

let BASE_CLASSES = null;
let BASE_CLASS_RAW = null;
let BASE_BACKGROUNDS = null;
let BASE_RACES = null;
let BASE_SPELLS = null;
let BASE_FEATS = null;
let BASE_EQUIPMENT = null;
let ALLOWED_FEAT_SET = new Set();
let BASE_EQUIPMENT_MAP = null;
let PLUTONIUM_ITEM_MAP = null;

function mergeClassData() {
  const classes = Array.isArray(BASE_CLASSES) ? BASE_CLASSES.map((c) => ({ ...c })) : [];
  const custom = getCustomEntries('classes');
  const map = new Map();
  classes.forEach((cls) => {
    if (cls?.name) map.set(cls.name, { ...cls, isCustom: false });
  });
  if (Array.isArray(custom)) {
    custom.forEach((cls) => {
      if (!cls || typeof cls !== 'object') return;
      const name = cls.name || cls.class?.name;
      if (!name) return;
      const cloned = deepClone(cls) || cls;
      cloned.isCustom = true;
      map.set(name, cloned);
    });
  }
  DATA.classes = Array.from(map.values());
}

function mergeBackgroundData() {
  const merged = BASE_BACKGROUNDS ? { ...BASE_BACKGROUNDS } : {};
  const custom = getCustomEntries('backgrounds');
  if (Array.isArray(custom)) {
    custom.forEach((bg) => {
      if (!bg || typeof bg !== 'object') return;
      const name = bg.name;
      if (!name) return;
      const cloned = deepClone(bg) || bg;
      cloned.isCustom = true;
      merged[name] = cloned;
    });
  }
  DATA.backgrounds = merged;
}

function normalizeLegacyBackground(bg) {
  if (!bg || typeof bg !== 'object') return null;
  const normalized = {
    name: bg.name || '',
    skills: Array.isArray(bg.skills) ? [...bg.skills] : [],
    tools: Array.isArray(bg.tools) ? [...bg.tools] : [],
    featOptions: Array.isArray(bg.featOptions) ? [...bg.featOptions] : [],
    entries: deepClone(bg.entries) || [],
  };
  if (bg.toolChoices) normalized.toolChoices = deepClone(bg.toolChoices);
  if (bg.languageChoices) normalized.languageChoices = deepClone(bg.languageChoices);
  if (Array.isArray(bg.languages)) normalized.languages = [...bg.languages];
  else if (bg.languages && typeof bg.languages === 'object') normalized.languages = deepClone(bg.languages);
  if (bg.skillChoices) normalized.skillChoices = deepClone(bg.skillChoices);
  if (bg.source) normalized.source = bg.source;
  if (bg.description) normalized.description = bg.description;
  return normalized;
}

function unionStringLists(a = [], b = []) {
  const arrA = Array.isArray(a) ? a : [];
  const arrB = Array.isArray(b) ? b : [];
  return Array.from(new Set([...arrA, ...arrB].filter(Boolean))).sort((x, y) =>
    String(x).localeCompare(String(y))
  );
}

export function isFeatAllowed(name) {
  if (!name) return false;
  if (!ALLOWED_FEAT_SET.size) return true;
  return ALLOWED_FEAT_SET.has(featKey(name));
}

function equipmentKey(name = '') {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(EQUIPMENT_NAME_NORMALIZER, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function collectEquipmentNames(config = {}) {
  const names = new Set();
  const addName = (value) => {
    if (!value || typeof value !== 'string') return;
    const trimmed = value.trim();
    if (trimmed) names.add(trimmed);
  };

  (config.standard || []).forEach(addName);

  Object.values(config.classes || {}).forEach((cls) => {
    if (!cls || typeof cls !== 'object') return;
    (cls.fixed || []).forEach(addName);
    (cls.choices || []).forEach((choice) => {
      if (!choice || typeof choice !== 'object') return;
      const opts = choice.options || choice.items || [];
      if (!Array.isArray(opts)) return;
      opts.forEach((opt) => {
        if (typeof opt === 'string') addName(opt);
        else if (opt && typeof opt === 'object') {
          if (opt.value) addName(opt.value);
          if (Array.isArray(opt.items)) opt.items.forEach(addName);
        }
      });
    });
  });

  Object.values(config.upgrades || {}).forEach((list) => {
    if (Array.isArray(list)) list.forEach(addName);
  });

  return names;
}

function mergeBackgroundRecords(base, additions) {
  const merged = deepClone(base) || {};
  if (additions && typeof additions === 'object') {
    if (Array.isArray(additions.skills)) {
      merged.skills = unionStringLists(merged.skills, additions.skills);
    }
    if (!merged.skillChoices && additions.skillChoices) {
      merged.skillChoices = deepClone(additions.skillChoices);
    }

    if (Array.isArray(additions.tools)) {
      merged.tools = unionStringLists(merged.tools, additions.tools);
    }
    if (!merged.toolChoices && additions.toolChoices) {
      merged.toolChoices = deepClone(additions.toolChoices);
    }

    if (Array.isArray(additions.languages)) {
      if (Array.isArray(merged.languages)) {
        merged.languages = unionStringLists(merged.languages, additions.languages);
      } else if (!merged.languages) {
        merged.languages = [...additions.languages];
      }
    }
    if (!merged.languageChoices && additions.languageChoices) {
      merged.languageChoices = deepClone(additions.languageChoices);
    }

    if (Array.isArray(additions.featOptions) && additions.featOptions.length) {
      merged.featOptions = unionStringLists(merged.featOptions, additions.featOptions);
    }

    if ((!merged.entries || merged.entries.length === 0) && additions.entries) {
      merged.entries = deepClone(additions.entries);
    }

    if (!merged.source && additions.source) merged.source = additions.source;
  }
  if (Array.isArray(merged.featOptions) && merged.featOptions.length) {
    merged.featOptions = merged.featOptions.filter((name) => isFeatAllowed(name));
  }
  return merged;
}

function isEmptyValue(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function normalizeLegacyRace(race) {
  return deepClone(race) || null;
}

function normalizeRaceFromPlutonium(entry) {
  return deepClone(entry) || null;
}

function featKey(name = '') {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

let PLUTONIUM_FEAT_CACHE = null;

async function loadPlutoniumFeatMap() {
  if (PLUTONIUM_FEAT_CACHE) return PLUTONIUM_FEAT_CACHE;
  const raw = await fetchJsonWithRetry(
    'data/Foundry_Data/plutonium/data/feats.json',
    'Plutonium feats'
  );
  const list = Array.isArray(raw?.feat) ? raw.feat : [];
  const map = new Map();
  const getPriority = (entry) => {
    const source = String(entry?.source || '').toUpperCase();
    if (source === 'PHB') return 0;
    if (source === 'XPHB') return 1;
    return 2;
  };
  list.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const name = entry.name;
    if (!name) return;
    const key = featKey(name);
    const priority = getPriority(entry);
    const existing = map.get(key);
    if (!existing || priority < existing.priority) {
      map.set(key, { priority, entry });
    }
  });
  PLUTONIUM_FEAT_CACHE = map;
  return map;
}

async function loadPlutoniumItemMap() {
  if (PLUTONIUM_ITEM_MAP) return PLUTONIUM_ITEM_MAP;
  let raw;
  try {
    raw = await fetchJsonWithRetry(
      'data/Foundry_Data/plutonium/data/foundry-items.json',
      'Plutonium items'
    );
  } catch (err) {
    console.warn('Unable to load Plutonium item data', err);
    PLUTONIUM_ITEM_MAP = new Map();
    return PLUTONIUM_ITEM_MAP;
  }
  const entries = [];
  if (Array.isArray(raw?.item)) entries.push(...raw.item);
  if (Array.isArray(raw?.magicvariant)) entries.push(...raw.magicvariant);
  const map = new Map();
  const getPriority = (entry) => {
    const source = String(entry?.source || '').toUpperCase();
    if (source === 'PHB') return 0;
    if (source === 'XPHB') return 1;
    return 2;
  };
  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const name = entry.name;
    if (!name) return;
    const key = equipmentKey(name);
    if (!key) return;
    const priority = getPriority(entry);
    const existing = map.get(key);
    if (!existing || priority < existing.priority) {
      map.set(key, { priority, entry });
    }
  });
  PLUTONIUM_ITEM_MAP = map;
  return map;
}

function mergeFeatRecords(base, additions) {
  const merged = deepClone(base) || {};
  if (!additions || typeof additions !== 'object') return merged;

  if (!merged.source && additions.source) merged.source = additions.source;
  if (!merged.page && additions.page) merged.page = additions.page;
  if (!merged.prerequisite && additions.prerequisite)
    merged.prerequisite = deepClone(additions.prerequisite);
  if (Array.isArray(merged.prerequisite) && !merged.prerequisite.length && additions.prerequisite)
    merged.prerequisite = deepClone(additions.prerequisite);

  if (!merged.ability && additions.ability) merged.ability = deepClone(additions.ability);
  if (Array.isArray(merged.ability) && !merged.ability.length && additions.ability)
    merged.ability = deepClone(additions.ability);

  if (!merged.entries || !merged.entries.length) {
    if (additions.entries) merged.entries = deepClone(additions.entries);
  } else if (Array.isArray(additions.entries) && additions.entries.length) {
    const existingSerialized = new Set(
      merged.entries.map((entry) => JSON.stringify(entry))
    );
    additions.entries.forEach((entry) => {
      if (!entry) return;
      const serialized = JSON.stringify(entry);
      if (!existingSerialized.has(serialized)) {
        merged.entries.push(deepClone(entry));
        existingSerialized.add(serialized);
      }
    });
  }

  ['additionalSpells', 'otherSources', 'reprintedAs'].forEach((key) => {
    if (additions[key] && !merged[key]) merged[key] = deepClone(additions[key]);
  });

  if (!merged.tags && additions.tags) merged.tags = deepClone(additions.tags);

  return merged;
}

function mergeRaceRecords(base, additions) {
  const merged = deepClone(base) || {};
  if (!additions || typeof additions !== 'object') return merged;

  Object.entries(additions).forEach(([key, value]) => {
    if (value == null || key === 'name') return;
    const existing = merged[key];
    if (key === 'entries' && Array.isArray(existing) && Array.isArray(value) && existing.length) {
      const existingNames = new Set(
        existing
          .filter((entry) => entry && typeof entry === 'object' && entry.name)
          .map((entry) => entry.name)
      );
      value.forEach((entry) => {
        if (!entry) return;
        if (entry.name && existingNames.has(entry.name)) return;
        existing.push(deepClone(entry));
      });
      return;
    }

    if (isEmptyValue(existing)) {
      merged[key] = deepClone(value);
    }
  });

  return merged;
}

function raceKey(name = '') {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function buildSkillDataFromPlutonium(skillProficiencies = []) {
  const fixed = new Set();
  const choiceGroups = [];

  skillProficiencies.forEach((block) => {
    if (!block || typeof block !== 'object') return;
    Object.entries(block).forEach(([key, val]) => {
      if (key === 'choose') return;
      if (val === true) {
        fixed.add(formatSkillName(key));
      } else if (typeof val === 'number' && key.toLowerCase() === 'any') {
        choiceGroups.push({
          choose: val,
          options: Object.values(SKILL_LABELS),
          label: 'Skills',
        });
      }
    });
    const choose = block.choose;
    if (choose && typeof choose === 'object') {
      const count = Number(choose.count || choose.number || choose.choose || 1) || 1;
      const options = Array.isArray(choose.from)
        ? choose.from.map(formatSkillName)
        : [];
      const formatted = options.length
        ? Array.from(new Set(options)).sort((a, b) => a.localeCompare(b))
        : Object.values(SKILL_LABELS);
      choiceGroups.push({ choose: count, options: formatted, label: 'Skills' });
    }
  });

  return {
    skills: Array.from(fixed).sort((a, b) => a.localeCompare(b)),
    skillChoices:
      choiceGroups.length === 0
        ? null
        : choiceGroups.length === 1
        ? choiceGroups[0]
        : choiceGroups,
  };
}

function buildToolDataFromPlutonium(toolProficiencies = []) {
  const fixed = new Set();
  const choiceGroups = [];

  const addChoiceGroup = (chooseCount, options, label) => {
    if (!chooseCount || !options || !options.length) return;
    choiceGroups.push({
      choose: chooseCount,
      options: Array.from(new Set(options.map(formatToolName))).sort((a, b) =>
        a.localeCompare(b)
      ),
      ...(label ? { label } : {}),
    });
  };

  toolProficiencies.forEach((block) => {
    if (!block || typeof block !== 'object') return;
    Object.entries(block).forEach(([key, val]) => {
      if (key === 'choose') return;
      const normalizedKey = stripSourceSuffix(key).toLowerCase();
      if (val === true) {
        expandToolOption(key).forEach((tool) => fixed.add(tool));
      } else if (typeof val === 'number') {
        const options = expandToolOption(key);
        addChoiceGroup(val, options, formatToolName(key));
      }
    });
    const choose = block.choose;
    if (choose && typeof choose === 'object') {
      const count = Number(choose.count || choose.number || choose.choose || 1) || 1;
      const options = Array.isArray(choose.from)
        ? choose.from.flatMap((opt) => expandToolOption(opt))
        : [];
      addChoiceGroup(count, options, 'Tools');
    }
  });

  return {
    tools: Array.from(fixed).sort((a, b) => a.localeCompare(b)),
    toolChoices:
      choiceGroups.length === 0
        ? null
        : choiceGroups.length === 1
        ? choiceGroups[0]
        : choiceGroups,
  };
}

function buildLanguageDataFromPlutonium(languageProficiencies = []) {
  const fixed = new Set();
  let choiceGroups = [];

  languageProficiencies.forEach((block) => {
    if (!block || typeof block !== 'object') return;
    Object.entries(block).forEach(([key, val]) => {
      if (key === 'choose') return;
      if (val === true) {
        fixed.add(formatLanguageName(key));
      } else if (typeof val === 'number') {
        choiceGroups = mergeChoiceGroups(choiceGroups, expandLanguageCategory(key, val));
      }
    });
    const choose = block.choose;
    if (choose && typeof choose === 'object') {
      const count = Number(choose.count || choose.number || choose.choose || 1) || 1;
      const options = Array.isArray(choose.from)
        ? choose.from.map(formatLanguageName)
        : [];
      const group = {
        choose: count,
        options: options.length ? Array.from(new Set(options)).sort((a, b) => a.localeCompare(b)) : [],
        label: 'Languages',
      };
      choiceGroups = mergeChoiceGroups(choiceGroups, group);
    }
  });

  const languageChoices = (() => {
    if (!choiceGroups || choiceGroups.length === 0) return null;
    return choiceGroups.length === 1 ? choiceGroups[0] : choiceGroups;
  })();

  return {
    languages: Array.from(fixed).sort((a, b) => a.localeCompare(b)),
    languageChoices,
  };
}

function extractFeatOptionsFromPlutonium(feats = []) {
  const out = new Set();
  feats.forEach((group) => {
    if (!group || typeof group !== 'object') return;
    Object.entries(group).forEach(([raw, value]) => {
      if (!value) return;
      const name = titleCaseName(stripSourceSuffix(raw));
      if (name) out.add(name);
    });
  });
  return Array.from(out).sort((a, b) => a.localeCompare(b));
}

function normalizeBackgroundFromPlutonium(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const name = entry.name;
  if (!name) return null;

  const normalized = {
    name,
    source: entry.source || '',
    entries: deepClone(entry.entries) || [],
  };

  const skillData = buildSkillDataFromPlutonium(entry.skillProficiencies || []);
  normalized.skills = skillData.skills;
  if (skillData.skillChoices) normalized.skillChoices = skillData.skillChoices;

  const toolData = buildToolDataFromPlutonium(entry.toolProficiencies || []);
  normalized.tools = toolData.tools;
  if (toolData.toolChoices) normalized.toolChoices = toolData.toolChoices;

  const languageData = buildLanguageDataFromPlutonium(entry.languageProficiencies || []);
  normalized.languages = languageData.languages;
  if (languageData.languageChoices) normalized.languageChoices = languageData.languageChoices;

  const featOptions = extractFeatOptionsFromPlutonium(entry.feats || []);
  if (featOptions.length) normalized.featOptions = featOptions;

  return normalized;
}

function sanitizeCustomRace(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const group = entry.group || entry.base || entry.raceName || entry.name;
  if (!group) return null;
  const items = Array.isArray(entry.items) ? entry.items : [entry];
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const name = item.name || group;
      if (!name) return null;
      const data = item.data && typeof item.data === 'object' ? item.data : item;
      return {
        group,
        name,
        data: deepClone(data) || data,
      };
    })
    .filter(Boolean);
}

function mergeRaceData() {
  const base = {};
  if (BASE_RACES) {
    for (const [grp, subs] of Object.entries(BASE_RACES)) {
      base[grp] = subs.map((sub) => ({ ...sub }));
    }
  }
  const custom = getCustomEntries('races');
  if (Array.isArray(custom)) {
    custom
      .map(sanitizeCustomRace)
      .filter(Boolean)
      .flat()
      .forEach(({ group, name, data }) => {
        if (!group) return;
        base[group] = base[group] || [];
        const existingIndex = base[group].findIndex((r) => r.name === name);
        const entry = { name, isCustom: true };
        if (data) entry.data = data;
        if (existingIndex >= 0) base[group][existingIndex] = entry;
        else base[group].push(entry);
      });
  }
  const sorted = Object.keys(base)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      const items = base[key] || [];
      acc[key] = items.slice().sort((a, b) => {
        const aName = a?.name || '';
        const bName = b?.name || '';
        return aName.localeCompare(bName);
      });
      return acc;
    }, {});
  DATA.races = sorted;
}

function mergeSpellData() {
  const map = new Map();
  (Array.isArray(BASE_SPELLS) ? BASE_SPELLS : []).forEach((spell) => {
    if (spell?.name) map.set(spell.name, { ...spell, isCustom: false });
  });
  const custom = getCustomEntries('spells');
  if (Array.isArray(custom)) {
    custom.forEach((spell) => {
      if (!spell || typeof spell !== 'object') return;
      const name = spell.name;
      if (!name) return;
      const cloned = deepClone(spell) || spell;
      cloned.isCustom = true;
      map.set(name, cloned);
    });
  }
  DATA.spells = Array.from(map.values());
}

function mergeFeatData(baseNames) {
  const set = new Set(baseNames);
  const custom = getCustomEntries('feats');
  if (Array.isArray(custom)) {
    custom.forEach((feat) => {
      if (!feat) return;
      const name = feat.name || feat.title;
      if (!name) return;
      set.add(name);
      if (feat.details || feat.data) {
        const detail = feat.details || feat.data;
        if (detail && typeof detail === 'object') {
          DATA.featDetails = DATA.featDetails || {};
          DATA.featDetails[name] = deepClone(detail) || detail;
        }
      }
    });
  }
  DATA.feats = Array.from(set);
}

function mergeEquipmentDataInternal() {
  const base = BASE_EQUIPMENT && typeof BASE_EQUIPMENT === 'object'
    ? deepClone(BASE_EQUIPMENT) || BASE_EQUIPMENT
    : { standard: [], classes: {}, upgrades: {} };
  const merged = {
    standard: Array.isArray(base.standard) ? [...base.standard] : [],
    classes: base.classes && typeof base.classes === 'object' ? { ...base.classes } : {},
    upgrades: base.upgrades && typeof base.upgrades === 'object' ? { ...base.upgrades } : {},
  };

  // Ensure deep clones for nested class data
  for (const [cls, details] of Object.entries(merged.classes)) {
    if (!details || typeof details !== 'object') {
      merged.classes[cls] = {};
      continue;
    }
    merged.classes[cls] = {
      fixed: Array.isArray(details.fixed) ? [...details.fixed] : [],
      choices: Array.isArray(details.choices)
        ? details.choices.map((choice) => deepClone(choice) || choice)
        : [],
      upgrades:
        Array.isArray(details.upgrades)
          ? details.upgrades.map((choice) => deepClone(choice) || choice)
          : [],
    };
  }

  const overrides = getCustomEquipmentOverrides();
  if (!overrides || typeof overrides !== 'object') {
    return merged;
  }

  if (Array.isArray(overrides.standard)) {
    overrides.standard.forEach((item) => {
      if (typeof item !== 'string') return;
      if (!merged.standard.includes(item)) merged.standard.push(item);
    });
  }

  if (overrides.upgrades && typeof overrides.upgrades === 'object') {
    merged.upgrades = {
      ...merged.upgrades,
      ...deepClone(overrides.upgrades),
    };
  }

  if (overrides.classes && typeof overrides.classes === 'object') {
    for (const [clsName, override] of Object.entries(overrides.classes)) {
      if (!override || typeof override !== 'object') continue;
      const baseEntry = merged.classes[clsName] || { fixed: [], choices: [], upgrades: [] };
      if (override.replace) {
        const { replace, ...rest } = override;
        merged.classes[clsName] = {
          fixed: Array.isArray(rest.fixed) ? [...rest.fixed] : [],
          choices: Array.isArray(rest.choices)
            ? rest.choices.map((choice) => deepClone(choice) || choice)
            : [],
          upgrades: Array.isArray(rest.upgrades)
            ? rest.upgrades.map((choice) => deepClone(choice) || choice)
            : [],
        };
        continue;
      }

      if (Array.isArray(override.fixed)) {
        const existing = Array.isArray(baseEntry.fixed) ? [...baseEntry.fixed] : [];
        override.fixed.forEach((item) => {
          if (typeof item !== 'string') return;
          if (!existing.includes(item)) existing.push(item);
        });
        baseEntry.fixed = existing;
      }

      if (Array.isArray(override.choices)) {
        const existingChoices = Array.isArray(baseEntry.choices)
          ? [...baseEntry.choices]
          : [];
        override.choices.forEach((choice) => {
          if (!choice || typeof choice !== 'object') return;
          const label = choice.label || choice.id;
          const type = choice.type;
          const idx = existingChoices.findIndex(
            (c) => c && c.label === label && c.type === type
          );
          const cloned = deepClone(choice) || choice;
          if (idx >= 0) existingChoices[idx] = cloned;
          else existingChoices.push(cloned);
        });
        baseEntry.choices = existingChoices;
      }

      if (Array.isArray(override.upgrades)) {
        const existing = Array.isArray(baseEntry.upgrades)
          ? [...baseEntry.upgrades]
          : [];
        override.upgrades.forEach((choice) => {
          if (!choice || typeof choice !== 'object') return;
          existing.push(deepClone(choice) || choice);
        });
        baseEntry.upgrades = existing;
      }

      merged.classes[clsName] = baseEntry;
    }
  }

  return merged;
}

const OPTIONAL_FEATURE_HANDLERS = {
  AI: { type: 'infusion', label: 'Infusion' },
  'FS:F': { type: 'fighting style', label: 'Fighting Style', selectionKey: 'FS:F' },
  EI: { type: 'eldritch invocation', label: 'Eldritch Invocation', selectionKey: 'EI' },
  MM: { type: 'metamagic option', label: 'Metamagic Option', selectionKey: 'MM' },
  'MV:B': { type: 'maneuver', label: 'Maneuver', selectionKey: 'MV:B' },
  PB: { type: 'pact boon', label: 'Pact Boon', staticOptions: PACT_BOON_OPTIONS },
};

/**
 * Default callbacks used by {@link fetchJsonWithRetry} to interact with the
 * user. These can be overridden in non-browser contexts such as tests.
 * `onRetry` should return a boolean indicating whether to retry the fetch, and
 * `onError` is invoked before the error is rethrown.
 */
export const fetchJsonCallbacks = {
  onRetry: (msg) =>
    showConfirmation(msg, {
      confirmText: t('retry'),
      cancelText: t('cancel'),
    }),
  onError: (msg) =>
    showConfirmation(msg, {
      confirmText: t('ok'),
      cancelText: null,
    }),
};

/**
 * Helper to fetch JSON resources with retry and user-friendly error messages.
 * @param {string} url - The resource URL
 * @param {string} resourceName - Name displayed to the user
 * @param {{onRetry?: Function, onError?: Function}} callbacks - Optional UI callbacks
 * @param {number} [maxRetries=3] - Maximum number of attempts before failing
 * @returns {Promise<any>} Parsed JSON response
 */
export async function fetchJsonWithRetry(
  url,
  resourceName,
  callbacks = fetchJsonCallbacks,
  maxRetries = 3
) {
  let attempts = 0;
  let lastError;
  while (attempts < maxRetries) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed loading ${resourceName}`);
      return await res.json();
    } catch (err) {
      console.error(err);
      lastError = err;
      attempts++;
      if (attempts >= maxRetries) break;
      const retry = await callbacks.onRetry(
        t('fetchRetry', { resource: resourceName })
      );
      if (!retry) break;
    }
  }
  await callbacks.onError(t('fetchFailed', { resource: resourceName }));
  throw lastError;
}

/**
 * Fetches class data from the JSON index if it hasn't been loaded yet.
 * The resulting array of class objects is stored on `DATA.classes`.
 */
const PLUTONIUM_CLASS_BASE_PATH = 'data/Foundry_Data/plutonium/data/class';

export async function loadClasses(forceReload = false) {
  if (!forceReload && Array.isArray(DATA.classes) && DATA.classes.length) return;

  if (!BASE_CLASSES || forceReload) {
    let optionalFeatures = {};
    try {
      optionalFeatures = await fetchJsonWithRetry(
        'data/optionalfeatures.json',
        'optional features'
      );
    } catch (err) {
      console.warn('Optional features unavailable', err);
    }

    const plutoniumIndex = await fetchJsonWithRetry(
      `${PLUTONIUM_CLASS_BASE_PATH}/index.json`,
      'Plutonium class index'
    );
    const plutoniumFiles = Array.isArray(plutoniumIndex)
      ? plutoniumIndex
      : Object.values(plutoniumIndex || {});

    const plutoniumRaw = await Promise.all(
      plutoniumFiles.map(async (file) => {
        if (typeof file !== 'string') return null;
        const path = `${PLUTONIUM_CLASS_BASE_PATH}/${file}`;
        try {
          return await fetchJsonWithRetry(path, `class at ${path}`);
        } catch (err) {
          console.warn('Failed to load class data', path, err);
          return null;
        }
      })
    );

    const plutoniumByName = new Map();
    plutoniumRaw
      .filter(Boolean)
      .forEach((raw) => {
        const name = raw?.class?.[0]?.name;
        if (!name) return;
        const key = name.toLowerCase();
        const existing = plutoniumByName.get(key);
        if (!existing) plutoniumByName.set(key, raw);
      });

    const legacyIndex = await fetchJsonWithRetry('data/classes.json', 'class index');
    const legacyItems = legacyIndex.items || {};
    const allowedNames = Object.keys(legacyItems);

    BASE_CLASS_RAW = [];
    const normalized = [];

    for (const name of allowedNames) {
      const key = name.toLowerCase();
      let raw = plutoniumByName.get(key);
      if (!raw) {
        const path = legacyItems[name];
        if (path) {
          try {
            raw = await fetchJsonWithRetry(path, `class at ${path}`);
          } catch (err) {
            console.warn('Unable to load legacy class data', name, err);
            raw = null;
          }
        }
      }
      if (!raw) continue;
      BASE_CLASS_RAW.push(raw);
      const normalizedClass = normalizeClassData(raw, optionalFeatures);
      if (normalizedClass) normalized.push(normalizedClass);
    }

    BASE_CLASSES = normalized;
  }

  mergeClassData();
}

/**
 * Fetches feats list if not already loaded.
 */
export async function loadFeats(forceReload = false) {
  if (!forceReload && Array.isArray(DATA.feats) && DATA.feats.length) return;
  if (!BASE_FEATS || forceReload) {
    const json = await fetchJsonWithRetry('data/feats.json', 'feats');
    BASE_FEATS = Object.keys(json.feats || {});
  }
  mergeFeatData(BASE_FEATS || []);
  ALLOWED_FEAT_SET = new Set((DATA.feats || []).map((name) => featKey(name)));
}

/**
 * Fetches artificer infusion names if not already loaded.
 */
export async function loadInfusions() {
  if (Array.isArray(DATA.infusions) && DATA.infusions.length) return DATA.infusions;
  const json = await fetchJsonWithRetry('data/infusions.json', 'infusions');
  const list = Array.isArray(json.infusions) ? json.infusions : [];
  DATA.infusions = list.map((entry) => {
    if (typeof entry === 'string') {
      return { name: entry, minLevel: 2 };
    }
    if (entry && typeof entry === 'object') {
      return {
        name: entry.name,
        minLevel: Number(entry.minLevel) || 2,
      };
    }
    return null;
  }).filter(Boolean);
  return DATA.infusions;
}

// Cache for individual feat details keyed by feat name
DATA.featDetails = DATA.featDetails || {};
// Cache for individual infusion details keyed by infusion name
DATA.infusionDetails = DATA.infusionDetails || {};

/**
 * Fetches detailed data for a single feat by name and caches the result.
 * The feat JSON files are stored under `data/feats/<slug>.json` where the
 * slug is the lowercase name stripped of non-alphanumeric characters.
 * @param {string} name - The feat name
 * @returns {Promise<Object>} The feat detail object
 */
export async function loadFeatDetails(name) {
  if (DATA.featDetails[name]) return DATA.featDetails[name];
  const customDetail = getCustomFeatDetail(name);
  if (customDetail) {
    DATA.featDetails[name] = customDetail;
    return customDetail;
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const path = `data/feats/${slug}.json`;
  let feat = null;
  try {
    feat = await fetchJsonWithRetry(path, `feat ${name}`);
  } catch (err) {
    console.warn('Unable to load legacy feat data', name, err);
  }
  let merged = feat;
  try {
    const map = await loadPlutoniumFeatMap();
    const addition = map.get(featKey(name))?.entry;
    if (addition) merged = mergeFeatRecords(feat, addition);
  } catch (err) {
    console.warn('Unable to merge Plutonium feat data', name, err);
  }
  DATA.featDetails[name] = merged;
  return merged;
}

/**
 * Fetches detailed data for a single infusion by name and caches the result.
 * The infusion JSON files are stored under `data/infusions/<slug>.json` where
 * the slug is the lowercase name stripped of non-alphanumeric characters.
 * @param {string} name - The infusion name
 * @returns {Promise<Object>} The infusion detail object
 */
export async function loadInfusionDetails(name) {
  if (DATA.infusionDetails[name]) return DATA.infusionDetails[name];
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const path = `data/infusions/${slug}.json`;
  const infusion = await fetchJsonWithRetry(path, `infusion ${name}`);
  DATA.infusionDetails[name] = infusion;
  return infusion;
}

/**
 * Fetches background data from the JSON index and stores full objects
 * keyed by their background name on `DATA.backgrounds`.
 */
export async function loadBackgrounds(forceReload = false) {
  if (!forceReload && DATA.backgrounds && Object.keys(DATA.backgrounds).length) return;

  if (!BASE_BACKGROUNDS || forceReload) {
    const rawPlutonium = await fetchJsonWithRetry(
      'data/Foundry_Data/plutonium/data/backgrounds.json',
      'Plutonium backgrounds'
    );

    const plutoniumEntries = Array.isArray(rawPlutonium?.background)
      ? rawPlutonium.background
      : [];
    const plutoniumByName = new Map();

    const getPriority = (entry) => {
      const source = String(entry?.source || '').toUpperCase();
      if (source === 'PHB') return 0;
      if (source === 'XPHB') return 1;
      if (entry?.edition === 'one') return 3;
      return 2;
    };

    plutoniumEntries.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const name = entry.name;
      if (!name) return;
      const key = name.toLowerCase();
      const priority = getPriority(entry);
      const existing = plutoniumByName.get(key);
      if (!existing || priority < existing.priority) {
        plutoniumByName.set(key, { priority, entry });
      }
    });

    const legacyIndex = await fetchJsonWithRetry(
      'data/backgrounds.json',
      'background index'
    );
    const legacyItems = legacyIndex.items || {};

    const collection = {};

    await Promise.all(
      Object.entries(legacyItems).map(async ([name, path]) => {
        let base;
        try {
          base = await fetchJsonWithRetry(path, `background at ${path}`);
        } catch (err) {
          console.warn('Unable to load legacy background', name, err);
          base = null;
        }
        if (!base) return;
        const normalizedLegacy = normalizeLegacyBackground(base);
        const plutoniumEntry = plutoniumByName.get(name.toLowerCase());
        const normalizedPlutonium = plutoniumEntry
          ? normalizeBackgroundFromPlutonium(plutoniumEntry.entry)
          : null;
        collection[name] = mergeBackgroundRecords(normalizedLegacy, normalizedPlutonium);
      })
    );

    BASE_BACKGROUNDS = collection;
  }

  mergeBackgroundData();
}

/**
 * Fetches race data and groups variants by their base race name.
 */
export async function loadRaces(forceReload = false) {
  if (!forceReload && DATA.races && Object.keys(DATA.races).length) return;

  if (!BASE_RACES || forceReload) {
    const plutoniumRaw = await fetchJsonWithRetry(
      'data/Foundry_Data/plutonium/data/races.json',
      'Plutonium races'
    );

    const plutoniumEntries = Array.isArray(plutoniumRaw?.race) ? plutoniumRaw.race : [];
    const plutoniumByName = new Map();

    const getPriority = (entry) => {
      const source = String(entry?.source || '').toUpperCase();
      if (source === 'PHB') return 0;
      if (source === 'XPHB') return 1;
      if (entry?.edition === 'one') return 3;
      return 2;
    };

    plutoniumEntries.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const name = entry.name;
      if (!name) return;
      const key = raceKey(name);
      const priority = getPriority(entry);
      const existing = plutoniumByName.get(key);
      if (!existing || priority < existing.priority) {
        plutoniumByName.set(key, { priority, entry });
      }
    });

    const index = await fetchJsonWithRetry('data/races.json', 'race index');
    const entries = index.items || {};
    const groups = {};

    await Promise.all(
      Object.entries(entries).map(async ([displayName, path]) => {
        let legacy;
        try {
          legacy = await fetchJsonWithRetry(path, `race at ${path}`);
        } catch (err) {
          console.warn('Unable to load legacy race', displayName, err);
          legacy = null;
        }
        if (!legacy) return;

        const baseName = legacy.raceName || legacy.name;
        if (!baseName) return;

        const legacyNormalized = normalizeLegacyRace(legacy);
        const key = raceKey(displayName);
        let plutoniumEntry = plutoniumByName.get(key);
        if (!plutoniumEntry) {
          plutoniumEntry = plutoniumByName.get(raceKey(legacy.name));
        }
        const merged = mergeRaceRecords(
          legacyNormalized,
          plutoniumEntry ? normalizeRaceFromPlutonium(plutoniumEntry.entry) : null
        );
        merged.name = merged.name || displayName;
        merged.source = merged.source || legacy.source || (plutoniumEntry?.entry?.source ?? '');

        const entry = {
          name: merged.name,
          data: merged,
        };
        if (legacy.isCustom) entry.isCustom = true;

        if (!groups[baseName]) groups[baseName] = [];
        groups[baseName].push(entry);
      })
    );

    BASE_RACES = groups;
  }

  mergeRaceData();
}

/**
 * Fetches spell data for levels 0-9 and caches the combined array on
 * `DATA.spells`.
 */
export async function loadSpells(forceReload = false) {
  if (!forceReload && Array.isArray(DATA.spells) && DATA.spells.length) return DATA.spells;
  if (!BASE_SPELLS || forceReload) {
    const promises = [];
    for (let i = 0; i <= 9; i++) {
      const path = `data/spells/level${i}.json`;
      promises.push(fetchJsonWithRetry(path, `spells level ${i}`));
    }
    BASE_SPELLS = (await Promise.all(promises)).flat();
  }

  mergeSpellData();
  return DATA.spells;
}

/**
 * Fetches optional feature lists keyed by feature type.
 */
export async function loadOptionalFeatures() {
  if (DATA.optionalFeatures) return DATA.optionalFeatures;
  DATA.optionalFeatures = await fetchJsonWithRetry(
    'data/optionalfeatures.json',
    'optional features'
  );
  return DATA.optionalFeatures;
}

export async function loadEquipment(forceReload = false) {
  if (!forceReload && DATA.equipment) return DATA.equipment;
  if (!BASE_EQUIPMENT || forceReload) {
    BASE_EQUIPMENT = await fetchJsonWithRetry('data/equipment.json', 'equipment');
  }
  const equipment = mergeEquipmentDataInternal();
  const allowedNames = collectEquipmentNames(equipment);
  let detailMap = {};
  try {
    const plutoniumMap = await loadPlutoniumItemMap();
    const entries = {};
    allowedNames.forEach((name) => {
      const key = equipmentKey(name);
      if (!key) return;
      const entry = plutoniumMap.get(key)?.entry;
      if (entry) entries[name] = deepClone(entry);
    });
    detailMap = entries;
  } catch (err) {
    console.warn('Unable to merge Plutonium equipment data', err);
  }
  DATA.equipment = equipment;
  DATA.equipmentDetails = detailMap;
  return equipment;
}

export function normalizeClassData(raw, optionalFeaturesMap = {}) {
  if (!raw || typeof raw !== 'object') return raw;
  if (raw.name && raw.features_by_level) return raw;
  if (!Array.isArray(raw.class) || !raw.class.length) return raw;

  const cls = raw.class[0];
  const normalized = {
    name: cls.name,
    description: cleanText(raw.description || cls.description || ''),
  };
  if (cls.hd?.faces) normalized.hit_die = `d${cls.hd.faces}`;
  if (cls.hpAtFirstLevel) normalized.hp_at_1st_level = cleanText(cls.hpAtFirstLevel);
  if (cls.hpAtHigherLevels)
    normalized.hp_at_higher_levels = cleanText(cls.hpAtHigherLevels);

  const savingThrows = (cls.proficiency || [])
    .map(mapAbilityCode)
    .filter(Boolean);
  if (savingThrows.length) normalized.saving_throws = savingThrows;

  const profs = cls.startingProficiencies || {};
  const skillProfs = parseSkillProficiencies(profs.skills);
  if (skillProfs) normalized.skill_proficiencies = skillProfs;

  const armor = convertProficiencyList(profs.armor);
  if (armor.length) normalized.armor_proficiencies = armor;

  const weapons = convertProficiencyList(profs.weapons);
  if (weapons.length) normalized.weapon_proficiencies = weapons;

  const tools = convertProficiencyList(profs.tools);
  if (tools.length) normalized.tool_proficiencies = tools;

  const languages = parseLanguageProficiencies(profs.languages);
  if (languages) normalized.language_proficiencies = languages;

  const spellcasting = buildSpellcastingInfo(cls);
  if (spellcasting) normalized.spellcasting = spellcasting;

  const multiclassing = parseMulticlassing(cls.multiclassing);
  if (multiclassing) normalized.multiclassing = multiclassing;

  const features = buildFeatureMap(raw.classFeature, cls.name);
  if (Object.keys(features).length) normalized.features_by_level = features;

  const choices = buildClassChoices(cls, raw, optionalFeaturesMap);
  if (choices.length) normalized.choices = choices;

  const subclasses = (raw.subclass || [])
    .filter((sc) => !sc.className || sc.className === cls.name)
    .map((sc) => ({ name: sc.name }));
  if (subclasses.length) normalized.subclasses = subclasses;

  return normalized;
}

/**
 * Attempt to derive normalized subclass data from the raw SRD/5etools class
 * JSON when a prebuilt file is not available under data/subclasses.
 *
 * Returns an object matching the normalized subclass format used by the UI:
 * { name, description?, entries?, features_by_level?, choices? }
 */
export function deriveSubclassData(className, subclassName) {
  try {
    if (!Array.isArray(BASE_CLASS_RAW)) return null;
    const raw = BASE_CLASS_RAW.find((c) => c?.class?.[0]?.name === className);
    if (!raw) return null;
    const sc = (raw.subclass || []).find((s) => s?.name === subclassName);
    if (!sc) return null;
    const short = sc.shortName || sc.name;
    const features = (raw.subclassFeature || []).filter(
      (f) => f && f.subclassShortName === short
    );
    const byLevel = {};
    features.forEach((feature) => {
      const level = feature.level || 1;
      const entry = { name: feature.name };
      const summary = extractFeatureSummary(feature.entries);
      if (summary) entry.description = summary;
      if (Array.isArray(feature.entries) && feature.entries.length) {
        entry.entries = feature.entries;
      }
      const key = String(level);
      (byLevel[key] = byLevel[key] || []).push(entry);
    });
    const result = { name: subclassName };
    if (sc.description) result.description = cleanText(sc.description);
    if (Object.keys(byLevel).length) result.features_by_level = byLevel;
    return result;
  } catch (err) {
    console.warn('deriveSubclassData failed', err);
    return null;
  }
}

function cleanText(str) {
  if (!str) return '';
  return String(str)
    .replace(/\{@[^}]+}/g, (match) => {
      const inner = match.slice(2, -1);
      const parts = inner.split('|');
      const head = parts[0] || '';
      const headParts = head.split(' ');
      headParts.shift();
      const primary = headParts.join(' ').trim();
      if (primary) return primary;
      for (let i = 1; i < parts.length; i += 1) {
        const segment = parts[i]?.trim();
        if (segment) return segment;
      }
      return head.trim();
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(str) {
  const text = cleanText(str).toLowerCase();
  if (!text) return '';
  return text
    .split(/([\s/-]+)/)
    .map((chunk) => {
      if (!/^[a-z]/.test(chunk)) return chunk;
      const lower = chunk.toLowerCase();
      if (['and', 'or', 'of', 'the'].includes(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('')
    .replace(/\b([A-Za-z])([A-Za-z']*)\b/g, (m, a, rest) => a + rest);
}

function mapAbilityCode(code) {
  if (!code) return '';
  const key = String(code).toLowerCase().slice(0, 3);
  return ABILITY_LABELS[key] || toTitleCase(code);
}

function mapSkillName(name) {
  if (!name) return '';
  const key = cleanText(name).toLowerCase();
  return SKILL_LABELS[key] || toTitleCase(name);
}

function parseSkillProficiencies(skills) {
  if (!Array.isArray(skills)) return null;
  const fixed = [];
  let choose = null;
  skills.forEach((entry) => {
    if (!entry) return;
    if (typeof entry === 'string') {
      fixed.push(mapSkillName(entry));
      return;
    }
    if (entry.choose) {
      const count = entry.choose.count ?? entry.choose.num ?? entry.choose.choose;
      const options = (entry.choose.from || [])
        .map(mapSkillName)
        .filter(Boolean);
      if (count && options.length) {
        choose = {
          count,
          options: uniqueSorted(options),
        };
      }
    }
  });
  const result = {};
  if (choose) {
    result.choose = choose.count;
    result.options = choose.options;
  }
  const uniqueFixed = uniqueSorted(fixed);
  if (uniqueFixed.length) result.fixed = uniqueFixed;
  return Object.keys(result).length ? result : null;
}

function describeChoice(choose, valueMapper = cleanText) {
  if (!choose) return '';
  const count = choose.count ?? choose.num ?? choose.choose;
  const options = (choose.from || []).map(valueMapper).filter(Boolean);
  if (!count) return '';
  if (!options.length) return `Choose ${count}`;
  return `Choose ${count} from ${options.join(', ')}`;
}

function convertProficiencyList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      if (!entry) return '';
      if (typeof entry === 'string') return cleanText(entry);
      if (entry.proficiency) {
        const name = cleanText(entry.proficiency);
        return entry.optional ? `${name} (optional)` : name;
      }
      if (entry.choose) return describeChoice(entry.choose, cleanText);
      return cleanText(entry.name || JSON.stringify(entry));
    })
    .filter(Boolean)
    .reduce((acc, item) => {
      if (!acc.includes(item)) acc.push(item);
      return acc;
    }, []);
}

function parseLanguageProficiencies(languages) {
  if (!Array.isArray(languages)) return null;
  const values = languages
    .map((entry) => (typeof entry === 'string' ? cleanText(entry) : ''))
    .filter(Boolean);
  if (!values.length) return null;
  return { fixed: uniqueSorted(values) };
}

function parseMulticlassing(multiclass) {
  if (!multiclass) return null;
  const result = {};
  const reqSource = multiclass.requirements || multiclass.prerequisites;
  if (reqSource) {
    const prereqs = {};
    if (Array.isArray(reqSource)) {
      reqSource.forEach((entry) => {
        const ability = mapAbilityCode(entry.ability || entry.abilityScore);
        const minimum = entry.minimum ?? entry.score;
        if (ability && minimum) prereqs[ability] = minimum;
      });
    } else {
      Object.entries(reqSource).forEach(([code, minimum]) => {
        const ability = mapAbilityCode(code);
        if (ability && minimum) prereqs[ability] = minimum;
      });
    }
    if (Object.keys(prereqs).length) result.prerequisites = prereqs;
  }

  const profs = multiclass.proficienciesGained || multiclass.proficiencies;
  if (profs) {
    const profResult = {};
    if (Array.isArray(profs.armor)) {
      const armor = convertProficiencyList(profs.armor);
      if (armor.length) profResult.armor = armor;
    }
    if (Array.isArray(profs.weapons)) {
      const weapons = convertProficiencyList(profs.weapons);
      if (weapons.length) profResult.weapons = weapons;
    }
    if (Array.isArray(profs.tools)) {
      const tools = convertProficiencyList(profs.tools);
      if (tools.length) profResult.tools = tools;
    }
    if (Array.isArray(profs.skills)) {
      const skills = [];
      profs.skills.forEach((entry) => {
        if (!entry) return;
        if (typeof entry === 'string') skills.push(cleanText(entry));
        else if (entry.choose) skills.push(describeChoice(entry.choose, mapSkillName));
      });
      if (skills.length) profResult.skills = uniqueSorted(skills);
    }
    if (Object.keys(profResult).length) result.proficiencies = profResult;
  }

  return Object.keys(result).length ? result : null;
}

function buildSpellcastingInfo(cls) {
  if (!cls) return null;
  const info = {};
  const progression = mapCasterProgression(cls.casterProgression);
  if (progression) info.progression = progression;
  if (cls.spellcastingAbility) {
    const ability = mapAbilityCode(cls.spellcastingAbility);
    if (ability) info.ability = ability;
  }
  const spellsKnown = extractSpellsKnown(cls);
  if (Object.keys(spellsKnown).length) {
    info.type = 'known';
    info.spellsPerLevel = spellsKnown;
  }
  return Object.keys(info).length ? info : null;
}

function mapCasterProgression(value) {
  if (!value) return '';
  const map = {
    full: 'full',
    half: 'half',
    third: 'third',
    artificer: 'artificer',
    pact: 'pact',
  };
  return map[value] || '';
}

function extractSpellsKnown(cls) {
  const result = {};
  const groups = cls.classTableGroups || [];
  for (const group of groups) {
    if (!Array.isArray(group.colLabels)) continue;
    const idx = group.colLabels.findIndex((label) =>
      /Spells Known/i.test(cleanText(label))
    );
    if (idx === -1) continue;
    const rows = group.rows || [];
    rows.forEach((row, i) => {
      if (!Array.isArray(row)) return;
      const value = Number(row[idx]);
      if (!Number.isNaN(value)) result[i + 1] = value;
    });
    break;
  }
  return result;
}

function buildFeatureMap(features, className) {
  const map = {};
  (features || []).forEach((feature) => {
    if (!feature) return;
    if (feature.className && feature.className !== className) return;
    if (feature.subclassShortName) return;
    const level = feature.level || 1;
    const key = String(level);
    const entry = {
      name: feature.name,
    };
    const summary = extractFeatureSummary(feature.entries);
    if (summary) entry.description = summary;
    if (Array.isArray(feature.entries) && feature.entries.length)
      entry.entries = feature.entries;
    (map[key] = map[key] || []).push(entry);
  });
  return map;
}

const FEATURE_LABEL_RE = /^(?:optional rule: )?\d+(?:st|nd|rd|th)-level .* feature$/i;

function extractFeatureSummary(entries) {
  if (!Array.isArray(entries)) return '';
  for (const entry of entries) {
    if (!entry) continue;
    if (typeof entry === 'string') {
      const text = cleanText(entry);
      if (!text || FEATURE_LABEL_RE.test(text)) continue;
      return text;
    }
    if (entry.description) {
      const text = cleanText(entry.description);
      if (text) return text;
    }
    if (typeof entry.entry === 'string') {
      const text = cleanText(entry.entry);
      if (text && !FEATURE_LABEL_RE.test(text)) return text;
    } else if (entry.entry) {
      const nested = extractFeatureSummary([entry.entry]);
      if (nested) return nested;
    }
    if (Array.isArray(entry.entries)) {
      const nested = extractFeatureSummary(entry.entries);
      if (nested) return nested;
    }
    if (Array.isArray(entry.items)) {
      const nested = extractFeatureSummary(entry.items);
      if (nested) return nested;
    }
  }
  return '';
}

function entriesToText(entries) {
  if (!Array.isArray(entries)) return '';
  return entries
    .map((entry) => {
      if (!entry) return '';
      if (typeof entry === 'string') return cleanText(entry);
      if (entry.entry) return cleanText(entry.entry);
      if (entry.description) return cleanText(entry.description);
      if (Array.isArray(entry.entries)) return entriesToText(entry.entries);
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

function buildClassChoices(cls, raw, optionalFeaturesMap) {
  const choices = [];
  const cantripChoice = buildInitialCantripChoice(cls);
  if (cantripChoice) choices.push(cantripChoice);

  const optionalChoices = buildOptionalFeatureChoices(cls, optionalFeaturesMap);
  choices.push(...optionalChoices);

  const abilityChoices = buildAbilityScoreChoices(raw.classFeature);
  choices.push(...abilityChoices);

  const expertiseChoices = buildExpertiseChoices(raw.classFeature);
  choices.push(...expertiseChoices);

  choices.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  return choices;
}

function buildInitialCantripChoice(cls) {
  const count = getCantripsAtLevelOne(cls);
  if (!count) return null;
  return {
    level: 1,
    name: 'Cantrip',
    description: `Choose ${count} ${cls.name.toLowerCase()} cantrip${count > 1 ? 's' : ''} to learn`,
    count,
    type: 'cantrips',
  };
}

function getCantripsAtLevelOne(cls) {
  if (Array.isArray(cls.cantripProgression) && cls.cantripProgression.length) {
    const value = Number(cls.cantripProgression[0]);
    if (!Number.isNaN(value)) return value;
  }
  const groups = cls.classTableGroups || [];
  for (const group of groups) {
    if (!Array.isArray(group.colLabels)) continue;
    const idx = group.colLabels.findIndex((label) =>
      /Cantrips Known/i.test(cleanText(label))
    );
    if (idx === -1) continue;
    const row = Array.isArray(group.rows) ? group.rows[0] : null;
    if (!Array.isArray(row)) continue;
    const value = Number(row[idx]);
    if (!Number.isNaN(value)) return value;
  }
  return 0;
}

function buildOptionalFeatureChoices(cls, optionalFeaturesMap) {
  const results = [];
  (cls.optionalfeatureProgression || []).forEach((progression) => {
    const info = resolveOptionalFeatureInfo(progression.featureType, optionalFeaturesMap);
    if (!info) return;
    const totals = progressionToLevels(progression.progression);
    let previous = 0;
    Object.keys(totals)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((level) => {
        const total = Number(totals[level]);
        if (!Number.isFinite(total) || total <= 0 || total === previous) {
          previous = Math.max(previous, total);
          return;
        }
        const delta = total - previous;
        const description = delta
          ? `Choose ${delta} ${info.label.toLowerCase()}${delta > 1 ? 's' : ''}`
          : '';
        const choice = {
          level,
          name: progression.name || info.label,
          count: total,
          type: info.type,
        };
        if (description) choice.description = description;
        if (info.selection?.length) choice.selection = info.selection.slice();
        results.push(choice);
        previous = total;
      });
  });
  return results;
}

function resolveOptionalFeatureInfo(featureTypes = [], optionalFeaturesMap = {}) {
  if (!Array.isArray(featureTypes) || !featureTypes.length) return null;
  for (const code of featureTypes) {
    const handler = OPTIONAL_FEATURE_HANDLERS[code];
    if (!handler) continue;
    const selection = handler.selectionKey
      ? optionalFeaturesMap[handler.selectionKey]
      : handler.staticOptions;
    return {
      type: handler.type,
      label: handler.label,
      selection: Array.isArray(selection) ? uniqueSorted(selection) : [],
    };
  }
  const fallback = optionalFeaturesMap[featureTypes[0]];
  if (Array.isArray(fallback) && fallback.length) {
    return {
      type: cleanText(featureTypes[0]).toLowerCase(),
      label: toTitleCase(featureTypes[0]),
      selection: uniqueSorted(fallback),
    };
  }
  return null;
}

function progressionToLevels(progression) {
  if (!progression) return {};
  if (Array.isArray(progression)) {
    return progression.reduce((acc, value, index) => {
      if (value) acc[index + 1] = value;
      return acc;
    }, {});
  }
  return Object.entries(progression).reduce((acc, [level, value]) => {
    acc[Number(level)] = value;
    return acc;
  }, {});
}

function buildAbilityScoreChoices(features) {
  const result = [];
  (features || []).forEach((feature) => {
    if (!feature || feature.name !== 'Ability Score Improvement') return;
    if (feature.subclassShortName) return;
    const level = feature.level || 1;
    result.push({
      level,
      name: feature.name,
      description: DEFAULT_ASI_DESCRIPTION,
      count: 1,
      type: 'asi',
      selection: DEFAULT_ASI_SELECTION.slice(),
    });
  });
  return result;
}

function buildExpertiseChoices(features) {
  const result = [];
  const totalsByClass = new Map();
  (features || []).forEach((feature) => {
    if (!feature || feature.name !== 'Expertise') return;
    if (feature.subclassShortName) return;
    const className = feature.className || 'default';
    const increment = inferExpertiseIncrement(feature.entries) || 2;
    const previous = totalsByClass.get(className) || 0;
    const total = previous + increment;
    totalsByClass.set(className, total);
    result.push({
      level: feature.level || 1,
      name: 'Expertise',
      description: cleanText(feature.entries?.[0]) || 'Choose skills to gain expertise in.',
      count: total,
      type: 'skills',
      requiresProficiency: true,
    });
  });
  return result;
}

function inferExpertiseIncrement(entries) {
  const text = entriesToText(entries).toLowerCase();
  if (!text) return 0;
  const match = text.match(/choose (?:another )?(one|two|three|four|five|six|\d+)/);
  if (!match) return 0;
  const word = match[1];
  if (/^\d+$/.test(word)) return Number(word);
  return WORD_NUMBER_MAP[word] || 0;
}

function uniqueSorted(list = []) {
  return Array.from(new Set(list.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

export const CharacterState = {
  playerName: "",
  name: "",
  type: "character",
  classes: [],
  feats: [],
  infusions: [],
  equipment: [],
  knownSpells: {},
  showHelp: false,
  raceFeatures: [],
  proficiencySources: {
    languages: {},
    tools: {},
  },
  backgroundChoices: {
    skills: [],
    tools: [],
    languages: [],
    feat: '',
  },
  equipmentChoices: {
    className: '',
    choices: [],
  },
  raceChoices: {
    spells: [],
    spellAbility: '',
    size: '',
    alterations: {},
    resist: '',
    tools: [],
    weapons: [],
    variants: [],
  },
  // Tracks the last-applied Step 6 bonus distribution (e.g. { dex: 2, con: 1 })
  bonusPointAllocations: {},
  bonusAbilities: {
    str: 0,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0,
  },
  system: {
    abilities: {
      str: { value: 8 },
      dex: { value: 8 },
      con: { value: 8 },
      int: { value: 8 },
      wis: { value: 8 },
      cha: { value: 8 },
    },
    skills: [],
    expertise: [],
    weapons: [],
    currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
    attributes: {
      ac: 10,
      hp: { value: 1, max: 1 },
      init: { value: 0 },
      prof: 2,
      movement: { walk: 30 },
    },
    details: {
      background: "",
      race: "",
      subrace: "",
      alignment: "",
      origin: "",
      age: 0,
      backstory: "",
    },
    traits: {
      size: "med",
      senses: { darkvision: 0 },
      languages: { value: [] },
      damageResist: [],
    },
    // Resource pools closely matching the structure used by Foundry's
    // dnd5e system.  Each resource tracks a label, current and maximum
    // value and whether it refreshes on a short or long rest.
    resources: {
      primary: { value: 0, max: 0, sr: false, lr: false, label: "" },
      secondary: { value: 0, max: 0, sr: false, lr: false, label: "" },
      tertiary: { value: 0, max: 0, sr: false, lr: false, label: "" },
    },
    spells: {
      cantrips: [],
      spell1: { value: 0, max: 0 },
      spell2: { value: 0, max: 0 },
      spell3: { value: 0, max: 0 },
      spell4: { value: 0, max: 0 },
      spell5: { value: 0, max: 0 },
      spell6: { value: 0, max: 0 },
      spell7: { value: 0, max: 0 },
      spell8: { value: 0, max: 0 },
      spell9: { value: 0, max: 0 },
      pact: { value: 0, max: 0, level: 0 },
    },
    tools: [],
  },
  prototypeToken: {
    name: "",
    actorLink: true,
    disposition: 1,
  },
};

export function totalLevel() {
  const sum = (CharacterState.classes || []).reduce(
    (acc, cls) => acc + (cls.level || 0),
    0
  );
  // Clamp to the maximum allowed level to prevent runaway totals
  return Math.min(sum, MAX_CHARACTER_LEVEL);
}

// --- Helper utilities ----------------------------------------------------

// Map of class names to their spellcasting progression. This is a simplified
// subset that covers the core classes and is sufficient for character
// creation. Classes not listed are treated as non-casters.
const CLASS_PROGRESSION = {
  Artificer: "half",
  Bard: "full",
  Cleric: "full",
  Druid: "full",
  Paladin: "half",
  Ranger: "half",
  Sorcerer: "full",
  Wizard: "full",
  Warlock: "pact",
};

// Multiclass spell slot table from the Player's Handbook p.165. Index by
// effective caster level to obtain the number of slots for each spell level.
const SPELL_SLOTS_BY_LEVEL = [
  {},
  { 1: 2 },
  { 1: 3 },
  { 1: 4, 2: 2 },
  { 1: 4, 2: 3 },
  { 1: 4, 2: 3, 3: 2 },
  { 1: 4, 2: 3, 3: 3 },
  { 1: 4, 2: 3, 3: 3, 4: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 2 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
];

// Warlock pact magic table. Each entry provides the number of pact slots and
// their level for the corresponding warlock level.
const PACT_MAGIC = [
  { slots: 0, level: 0 },
  { slots: 1, level: 1 },
  { slots: 2, level: 1 },
  { slots: 2, level: 2 },
  { slots: 2, level: 2 },
  { slots: 2, level: 3 },
  { slots: 2, level: 3 },
  { slots: 2, level: 4 },
  { slots: 2, level: 4 },
  { slots: 2, level: 5 },
  { slots: 2, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 4, level: 5 },
  { slots: 4, level: 5 },
  { slots: 4, level: 5 },
  { slots: 4, level: 5 },
];

/**
 * Calculate spell slot totals based on the currently selected classes and
 * their levels. This function mutates `CharacterState.system.spells` so that
 * each spell level slot has matching `value` and `max` fields.
 */
export function updateSpellSlots() {
  let casterLevel = 0;
  let pactLevel = 0;

  (CharacterState.classes || []).forEach((cls) => {
    const lvl = cls.level || 0;
    const prog = cls.spellcasting?.progression || CLASS_PROGRESSION[cls.name];
    if (prog === "full") casterLevel += lvl;
    else if (prog === "half") casterLevel += Math.floor(lvl / 2);
    else if (prog === "artificer") casterLevel += Math.ceil(lvl / 2);
    else if (prog === "third") casterLevel += Math.floor(lvl / 3);
    else if (prog === "pact") pactLevel += lvl;
  });

  const slots = SPELL_SLOTS_BY_LEVEL[Math.min(casterLevel, 20)] || {};
  for (let i = 1; i <= 9; i++) {
    const max = slots[i] || 0;
    const spell = CharacterState.system.spells[`spell${i}`];
    if (spell) {
      spell.max = max;
      spell.value = Math.min(spell.value, max); // keep within bounds
    }
  }

  const pact = PACT_MAGIC[Math.min(pactLevel, 20)] || { slots: 0, level: 0 };
  CharacterState.system.spells.pact.max = pact.slots;
  CharacterState.system.spells.pact.level = pact.level;
  CharacterState.system.spells.pact.value = Math.min(
    CharacterState.system.spells.pact.value,
    pact.slots
  );
}

/**
 * Update the proficiency bonus based on total character level.
 * Levels 1-4: +2, 5-8: +3, 9-12: +4, 13-16: +5, 17-20: +6.
 * Levels below 1 have no proficiency bonus.
 */
export function updateProficiencyBonus() {
  const level = totalLevel();
  const PROFICIENCY_BY_LEVEL = [
    0, // 0 (no class levels)
    2, 2, 2, 2, // 1-4
    3, 3, 3, 3, // 5-8
    4, 4, 4, 4, // 9-12
    5, 5, 5, 5, // 13-16
    6, 6, 6, 6, // 17-20
  ];
  const prof = PROFICIENCY_BY_LEVEL[Math.min(level, 20)] || 0;
  CharacterState.system.attributes.prof = prof;
}

/**
 * Increment or decrement one of the resource pools.
 * @param {string} key - One of `primary`, `secondary` or `tertiary`.
 * @param {number} delta - Amount to change the resource by.
 */
export function adjustResource(key, delta) {
  const res = CharacterState.system.resources[key];
  if (!res) return;
  res.value = Math.max(0, Math.min((res.max ?? 0), res.value + delta));
}

export function logCharacterState() {
  // Log a cloned copy to avoid reactive updates in the console
  console.log("CharacterState", JSON.parse(JSON.stringify(CharacterState)));
}
