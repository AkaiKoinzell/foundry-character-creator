const STORAGE_KEY = 'fcc:custom-data-v1';

export const DEFAULT_DATA = {
  classes: [],
  races: [],
  backgrounds: [],
  spells: [],
  feats: [],
  equipment: {},
};

const memoryStore = {};
let cache = null;

function clone(value) {
  if (value == null || typeof value !== 'object') return value;
  if (typeof globalThis.structuredClone === 'function') {
    try {
      return globalThis.structuredClone(value);
    } catch (err) {
      console.warn('structuredClone failed, falling back to JSON clone', err);
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    console.warn('Unable to clone value', err);
    return undefined;
  }
}

function readStorageRaw() {
  try {
    if (globalThis.localStorage) {
      const raw = globalThis.localStorage.getItem(STORAGE_KEY);
      if (raw != null) return raw;
    }
  } catch (err) {
    console.warn('Unable to read custom data from localStorage', err);
  }
  return memoryStore[STORAGE_KEY] ?? null;
}

function writeStorageRaw(raw) {
  try {
    if (globalThis.localStorage) {
      globalThis.localStorage.setItem(STORAGE_KEY, raw);
      return;
    }
  } catch (err) {
    console.warn('Unable to write custom data to localStorage', err);
  }
  memoryStore[STORAGE_KEY] = raw;
}

function normalizeData(raw) {
  if (!raw || typeof raw !== 'object') return clone(DEFAULT_DATA) || { ...DEFAULT_DATA };
  const normalized = { ...DEFAULT_DATA };
  for (const key of Object.keys(DEFAULT_DATA)) {
    const value = raw[key];
    if (Array.isArray(DEFAULT_DATA[key])) {
      normalized[key] = Array.isArray(value) ? clone(value) || [] : [];
    } else if (typeof DEFAULT_DATA[key] === 'object') {
      normalized[key] = value && typeof value === 'object' ? clone(value) || {} : {};
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}

function loadCache() {
  if (cache) return cache;
  const raw = readStorageRaw();
  if (!raw) {
    cache = clone(DEFAULT_DATA) || { ...DEFAULT_DATA };
    return cache;
  }
  try {
    const parsed = JSON.parse(raw);
    cache = normalizeData(parsed);
  } catch (err) {
    console.warn('Failed to parse stored custom data, resetting', err);
    cache = clone(DEFAULT_DATA) || { ...DEFAULT_DATA };
  }
  return cache;
}

function persist(newData) {
  cache = normalizeData(newData);
  const raw = JSON.stringify(cache);
  writeStorageRaw(raw);
  dispatchUpdate(cache);
}

function dispatchUpdate(data) {
  const detail = clone(data);
  if (!detail) return;
  const eventName = 'fcc:custom-data-updated';
  try {
    const evt = new CustomEvent(eventName, { detail });
    if (typeof globalThis.dispatchEvent === 'function') {
      globalThis.dispatchEvent(evt);
    }
  } catch (err) {
    // Safari/iOS might not have CustomEvent in workers, fallback to Event
    try {
      const evt = new Event(eventName);
      evt.detail = detail;
      if (typeof globalThis.dispatchEvent === 'function') {
        globalThis.dispatchEvent(evt);
      }
    } catch (err2) {
      console.warn('Unable to dispatch custom data update event', err2);
    }
  }
}

export function getAllCustomData() {
  return clone(loadCache());
}

export function getCustomEntries(key) {
  const data = loadCache();
  if (!(key in data)) return undefined;
  return clone(data[key]);
}

export function setCustomEntries(key, entries) {
  const data = loadCache();
  data[key] = Array.isArray(entries) || typeof entries === 'object'
    ? clone(entries)
    : Array.isArray(DEFAULT_DATA[key])
    ? []
    : {};
  persist(data);
}

export function resetCustomEntries(key) {
  if (!(key in DEFAULT_DATA)) return;
  const data = loadCache();
  data[key] = clone(DEFAULT_DATA[key]);
  persist(data);
}

export function clearAllCustomData() {
  persist(clone(DEFAULT_DATA) || { ...DEFAULT_DATA });
}

export function onCustomDataUpdated(callback) {
  const eventName = 'fcc:custom-data-updated';
  const handler = (evt) => {
    try {
      callback(evt.detail ? clone(evt.detail) : getAllCustomData());
    } catch (err) {
      console.error('Error in custom data update listener', err);
    }
  };
  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener(eventName, handler);
  }
  return () => {
    if (typeof globalThis.removeEventListener === 'function') {
      globalThis.removeEventListener(eventName, handler);
    }
  };
}

export function slugify(text = '') {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCustomFeatDetail(name) {
  if (!name) return undefined;
  const feats = getCustomEntries('feats');
  if (!Array.isArray(feats)) return undefined;
  const slug = slugify(name);
  const match = feats.find((feat) => {
    if (!feat) return false;
    if (feat.slug) return slugify(feat.slug) === slug;
    if (feat.name) return slugify(feat.name) === slug;
    return false;
  });
  if (!match) return undefined;
  const detail = match.details || match.data || match;
  if (!detail || typeof detail !== 'object') return undefined;
  return clone(detail);
}

export function getCustomEquipmentOverrides() {
  const eq = getCustomEntries('equipment');
  return eq && typeof eq === 'object' ? eq : {};
}

export function upsertCustomEntry(category, entry, predicate) {
  const data = loadCache();
  if (!(category in data)) return;
  const list = Array.isArray(data[category]) ? data[category] : [];
  const cloneList = clone(list) || [];
  const index = cloneList.findIndex((item) => (predicate ? predicate(item) : false));
  if (index >= 0) cloneList[index] = clone(entry) || entry;
  else cloneList.push(clone(entry) || entry);
  data[category] = cloneList;
  persist(data);
}

export function removeCustomEntry(category, predicate) {
  const data = loadCache();
  if (!(category in data)) return;
  const list = Array.isArray(data[category]) ? data[category] : [];
  data[category] = list.filter((item) => (predicate ? !predicate(item) : false));
  persist(data);
}

export function setCustomData(data) {
  persist(data || DEFAULT_DATA);
}
