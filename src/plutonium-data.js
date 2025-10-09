import { fetchJsonWithRetry } from './data.js';

const PLUTONIUM_BASE_PATH = 'data/Foundry_Data/plutonium/data';
const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';

const caches = {
  spell: {
    indexPromise: null,
    foundryPromise: null,
    loadedFiles: new Set(),
    baseByKey: new Map(),
    nameIndex: new Map(),
    foundryByKey: new Map(),
  },
  feat: {
    basePromise: null,
    foundryPromise: null,
    baseByKey: new Map(),
    foundryByKey: new Map(),
  },
};

function deepClone(value) {
  if (value == null || typeof value !== 'object') return value;
  if (typeof globalThis.structuredClone === 'function') {
    try {
      return globalThis.structuredClone(value);
    } catch (err) {
      console.warn('structuredClone failed in plutonium-data clone, falling back', err);
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    console.warn('Fallback clone failed in plutonium-data', err);
    return undefined;
  }
}

function keyFor(name, source) {
  const n = String(name || '').trim().toLowerCase();
  const s = String(source || '').trim().toLowerCase();
  return `${n}||${s}`;
}

function upsertNameIndex(map, name, key) {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return;
  if (!map.has(n)) map.set(n, new Set());
  map.get(n).add(key);
}

async function loadSpellIndex() {
  if (!caches.spell.indexPromise) {
    caches.spell.indexPromise = fetchJsonWithRetry(
      `${PLUTONIUM_BASE_PATH}/spells/index.json`,
      'Plutonium spell index'
    );
  }
  return caches.spell.indexPromise;
}

async function loadSpellFoundryData() {
  if (!caches.spell.foundryPromise) {
    caches.spell.foundryPromise = fetchJsonWithRetry(
      `${PLUTONIUM_BASE_PATH}/spells/foundry.json`,
      'Plutonium Foundry spell overrides'
    ).then((json) => {
      const map = caches.spell.foundryByKey;
      if (json && Array.isArray(json.spell)) {
        json.spell.forEach((entry) => {
          const key = keyFor(entry.name, entry.source);
          map.set(key, entry);
        });
      }
      return json;
    });
  }
  return caches.spell.foundryPromise;
}

async function loadSpellFile(file) {
  if (caches.spell.loadedFiles.has(file)) return;
  const json = await fetchJsonWithRetry(
    `${PLUTONIUM_BASE_PATH}/spells/${file}`,
    `Plutonium spell list ${file}`
  );
  caches.spell.loadedFiles.add(file);
  if (!json || !Array.isArray(json.spell)) return;
  json.spell.forEach((spell) => {
    const key = keyFor(spell.name, spell.source);
    caches.spell.baseByKey.set(key, spell);
    upsertNameIndex(caches.spell.nameIndex, spell.name, key);
  });
}

function entriesToHtml(entries = []) {
  if (!Array.isArray(entries)) return '';
  const parts = [];
  const walk = (arr) => {
    arr.forEach((node) => {
      if (!node) return;
      if (typeof node === 'string') {
        parts.push(`<p>${node}</p>`);
        return;
      }
      if (node.entry) {
        parts.push(`<p>${node.entry}</p>`);
        return;
      }
      if (Array.isArray(node.entries)) {
        walk(node.entries);
        return;
      }
      if (Array.isArray(node.items)) {
        walk(node.items);
        return;
      }
      if (node.description) {
        parts.push(`<p>${node.description}</p>`);
      }
    });
  };
  walk(entries);
  return parts.join('\n');
}

function schoolToSystemCode(letter) {
  const map = {
    A: 'abj',
    C: 'con',
    D: 'div',
    E: 'enc',
    V: 'evo',
    I: 'ill',
    N: 'nec',
    T: 'trs',
    P: 'phy',
  };
  if (!letter) return '';
  const key = String(letter).trim().toUpperCase();
  return map[key] || key.toLowerCase();
}

const RANGE_UNIT_MAP = {
  feet: 'ft',
  mile: 'mi',
  miles: 'mi',
  touch: 'touch',
  self: 'self',
  sight: 'sight',
  unlimited: 'unlimited',
};

function buildRange(range = {}) {
  if (!range || typeof range !== 'object') {
    return { value: null, units: '', long: null, type: '' };
  }
  const distance = range.distance || {};
  const amount = typeof distance.amount === 'number' ? distance.amount : null;
  let units = distance.type ? RANGE_UNIT_MAP[distance.type] || distance.type : '';
  if (!units && range.type === 'self') units = 'self';
  return {
    value: amount,
    units,
    long: null,
    type: range.type || '',
  };
}

const ACTIVATION_UNIT_MAP = {
  action: 'action',
  bonus: 'bonus',
  reaction: 'reaction',
  minute: 'minute',
  minutes: 'minute',
  hour: 'hour',
  hours: 'hour',
  special: 'special',
};

function buildActivation(time = []) {
  if (!Array.isArray(time) || !time.length) {
    return { type: '', cost: 0, condition: '' };
  }
  const first = time[0] || {};
  const type = ACTIVATION_UNIT_MAP[first.unit] || '';
  return {
    type,
    cost: typeof first.number === 'number' ? first.number : type ? 1 : 0,
    condition: first.condition || '',
  };
}

function buildDuration(duration = []) {
  if (!Array.isArray(duration) || !duration.length) {
    return { value: null, units: '', concentration: false }; // minimal structure
  }
  const first = duration[0] || {};
  const dur = first.duration || {};
  return {
    value: typeof dur.amount === 'number' ? dur.amount : null,
    units: dur.type || first.type || '',
    concentration: Boolean(first.concentration),
  };
}

function buildMaterials(components = {}) {
  const mat = components && components.m;
  if (!mat) {
    return { value: '', consumed: false, cost: 0, supply: 0 };
  }
  if (typeof mat === 'string') {
    return { value: mat, consumed: false, cost: 0, supply: 0 };
  }
  return {
    value: mat.text || mat.value || '',
    consumed: Boolean(mat.consume || mat.consumed),
    cost: typeof mat.cost === 'number' ? mat.cost : 0,
    supply: typeof mat.supply === 'number' ? mat.supply : 0,
  };
}

function componentProperties(components = {}) {
  const props = [];
  if (components.v) props.push('vocal');
  if (components.s) props.push('somatic');
  if (components.m) props.push('material');
  if (components.ritual) props.push('ritual');
  const hasConc = Array.isArray(components.special) && components.special.includes('Concentration');
  if (hasConc) props.push('concentration');
  return props;
}

function buildSave(spell = {}) {
  const saves = Array.isArray(spell.savingThrow) ? spell.savingThrow : [];
  const first = saves[0];
  if (!first) {
    return { ability: '', dc: null, scaling: '' };
  }
  const map = {
    strength: 'str',
    dexterity: 'dex',
    constitution: 'con',
    intelligence: 'int',
    wisdom: 'wis',
    charisma: 'cha',
  };
  const key = map[first.toLowerCase()] || '';
  return { ability: key, dc: null, scaling: key ? 'spell' : '' };
}

function computeSpellFlags(spell) {
  const source = spell?.source || '';
  const hash = `${encodeURIComponent(String(spell?.name || '').toLowerCase())}_${source.toLowerCase()}`;
  return {
    page: 'spells.html',
    source,
    hash,
    propDroppable: 'spell',
  };
}

function applyFoundryPatch(system, patch = {}) {
  if (!system || !patch) return;
  Object.entries(patch).forEach(([key, value]) => {
    if (key.includes('.')) {
      const parts = key.split('.');
      let ref = system;
      for (let i = 0; i < parts.length - 1; i += 1) {
        const part = parts[i];
        if (ref[part] == null || typeof ref[part] !== 'object') ref[part] = {};
        ref = ref[part];
      }
      ref[parts[parts.length - 1]] = value;
      return;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      system[key] = { ...(system[key] || {}), ...value };
      return;
    }
    system[key] = value;
  });
}

async function ensureSpellDataLoaded() {
  const index = await loadSpellIndex();
  const files = Object.values(index || {});
  await Promise.all(files.map((file) => loadSpellFile(file)));
  await loadSpellFoundryData();
}

function pickSpellKeyByName(name) {
  const nameKey = String(name || '').trim().toLowerCase();
  if (!nameKey) return null;
  const keys = caches.spell.nameIndex.get(nameKey);
  if (!keys || !keys.size) return null;
  const preferred = Array.from(keys).find((key) => key.endsWith('||phb'));
  return preferred || Array.from(keys)[0];
}

async function getSpellEntry(name, source) {
  await ensureSpellDataLoaded();
  const key = keyFor(name, source);
  if (caches.spell.baseByKey.has(key)) {
    return {
      base: caches.spell.baseByKey.get(key),
      foundry: caches.spell.foundryByKey.get(key),
    };
  }
  const fallbackKey = pickSpellKeyByName(name);
  if (!fallbackKey) return null;
  return {
    base: caches.spell.baseByKey.get(fallbackKey),
    foundry: caches.spell.foundryByKey.get(fallbackKey),
  };
}

export async function buildPlutoniumSpellItem(name, { source = '', ability = '', preparationMode = 'prepared', prepared = true } = {}) {
  if (!IS_BROWSER) return null;
  const entry = await getSpellEntry(name, source);
  if (!entry?.base) return null;
  const spell = entry.base;
  const system = {
    description: {
      value: entriesToHtml(spell.entries || []),
      chat: '',
    },
    source: {
      custom: '',
      book: spell.source || '',
      page: spell.page != null ? String(spell.page) : '',
      license: '',
    },
    actionType: (spell.savingThrow && spell.savingThrow.length) ? 'save' : '',
    level: spell.level || 0,
    school: schoolToSystemCode(spell.school),
    properties: componentProperties(spell.components),
    materials: buildMaterials(spell.components),
    target: {
      value: null,
      units: '',
      type: '',
      prompt: false,
    },
    range: buildRange(spell.range),
    activation: buildActivation(spell.time),
    duration: buildDuration(spell.duration),
    damage: { parts: [], versatile: '' },
    scaling: { mode: 'none', formula: '' },
    save: buildSave(spell),
    ability,
    uses: { value: 0, max: '', per: '', recovery: '', prompt: false },
    attack: { bonus: '', flat: false },
    chatFlavor: '',
    critical: { threshold: null, damage: '' },
    formula: '',
    preparation: { mode: preparationMode, prepared },
    consume: { type: '', target: null, amount: null, scale: false },
    cover: null,
    crewed: false,
    enchantment: null,
    summons: null,
  };

  if (spell.entriesHigherLevel) {
    const higherHtml = entriesToHtml(spell.entriesHigherLevel);
    if (higherHtml) {
      system.description.value += `\n<h3>At Higher Levels</h3>\n${higherHtml}`;
    }
  }

  applyFoundryPatch(system, entry.foundry?.system || {});

  const item = {
    name: spell.name,
    type: 'spell',
    system,
    img: entry.foundry?.img || 'icons/svg/book.svg',
    effects: deepClone(entry.foundry?.effects) || [],
    activities: deepClone(entry.foundry?.activities) || [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {
      plutonium: computeSpellFlags(spell),
    },
  };
  if (entry.foundry?.migrationVersion != null) {
    item.flags.plutonium.migrationVersion = entry.foundry.migrationVersion;
  }

  return item;
}

async function loadFeatBase() {
  if (!caches.feat.basePromise) {
    caches.feat.basePromise = fetchJsonWithRetry(
      `${PLUTONIUM_BASE_PATH}/feats.json`,
      'Plutonium feats list'
    ).then((json) => {
      if (json && Array.isArray(json.feat)) {
        json.feat.forEach((feat) => {
          const key = keyFor(feat.name, feat.source);
          caches.feat.baseByKey.set(key, feat);
        });
      }
      return json;
    });
  }
  return caches.feat.basePromise;
}

async function loadFeatFoundry() {
  if (!caches.feat.foundryPromise) {
    caches.feat.foundryPromise = fetchJsonWithRetry(
      `${PLUTONIUM_BASE_PATH}/foundry-feats.json`,
      'Plutonium Foundry feats'
    ).then((json) => {
      if (json && Array.isArray(json.feat)) {
        json.feat.forEach((feat) => {
          const key = keyFor(feat.name, feat.source);
          caches.feat.foundryByKey.set(key, feat);
        });
      }
      return json;
    });
  }
  return caches.feat.foundryPromise;
}

function computeFeatFlags(feat) {
  const source = feat?.source || '';
  const hash = `${encodeURIComponent(String(feat?.name || '').toLowerCase())}_${source.toLowerCase()}`;
  return {
    page: 'feats.html',
    source,
    hash,
    propDroppable: 'feat',
  };
}

async function getFeatEntry(name, source) {
  await Promise.all([loadFeatBase(), loadFeatFoundry()]);
  const key = keyFor(name, source);
  if (caches.feat.baseByKey.has(key)) {
    return {
      base: caches.feat.baseByKey.get(key),
      foundry: caches.feat.foundryByKey.get(key),
    };
  }
  // fallback by name only
  const nameLower = String(name || '').toLowerCase();
  for (const [featKey, feat] of caches.feat.baseByKey.entries()) {
    if (featKey.startsWith(`${nameLower}||`)) {
      return {
        base: feat,
        foundry: caches.feat.foundryByKey.get(featKey),
      };
    }
  }
  return null;
}

export async function buildPlutoniumFeatItem(name, { source = '' } = {}) {
  if (!IS_BROWSER) return null;
  const entry = await getFeatEntry(name, source);
  if (!entry?.base) return null;
  const feat = entry.base;
  const descriptionHtml = entriesToHtml(feat.entries || []);
  const system = {
    description: { value: descriptionHtml, chat: '' },
    requirements: '',
    source: {
      custom: '',
      book: feat.source || '',
      page: feat.page != null ? String(feat.page) : '',
      license: '',
    },
    type: { value: 'feat', subtype: '' },
    uses: { value: 0, max: '', recovery: [], spent: 0 },
    properties: [],
    activities: {},
    advancement: [],
    prerequisites: { items: [], repeatable: false },
  };

  if (feat.prerequisite) {
    system.requirements = feat.prerequisite
      .map((req) => (typeof req === 'string' ? req : JSON.stringify(req)))
      .join('; ');
  }

  if (entry.foundry?.system) {
    applyFoundryPatch(system, entry.foundry.system);
  }

  const item = {
    name: feat.name,
    type: 'feat',
    system,
    img: entry.foundry?.img || 'icons/svg/explosion.svg',
    effects: deepClone(entry.foundry?.effects) || [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {
      plutonium: computeFeatFlags(feat),
    },
  };

  if (entry.foundry?.activities) {
    item.flags.plutonium.activities = deepClone(entry.foundry.activities);
  }
  if (entry.foundry?.migrationVersion != null) {
    item.flags.plutonium.migrationVersion = entry.foundry.migrationVersion;
  }

  return item;
}
