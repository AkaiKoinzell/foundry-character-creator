export const DATA = {};

/**
 * Helper to fetch JSON resources with retry and user-friendly error messages.
 * @param {string} url - The resource URL
 * @param {string} resourceName - Name displayed to the user
 * @returns {Promise<any>} Parsed JSON response
 */
export async function fetchJsonWithRetry(url, resourceName) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed loading ${resourceName}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    const retry = window.confirm(
      `Unable to load ${resourceName}. Would you like to retry?`
    );
    if (retry) return fetchJsonWithRetry(url, resourceName);
    window.alert(`Data for ${resourceName} could not be loaded.`);
    throw err;
  }
}

/**
 * Fetches class data from the JSON index if it hasn't been loaded yet.
 * The resulting array of class objects is stored on `DATA.classes`.
 */
export async function loadClasses() {
  // Avoid re-fetching if classes are already present
  if (Array.isArray(DATA.classes) && DATA.classes.length) return;

  const index = await fetchJsonWithRetry('data/classes.json', 'class index');

  DATA.classes = await Promise.all(
    Object.values(index.items || {}).map((path) =>
      fetchJsonWithRetry(path, `class at ${path}`)
    )
  );
}

/**
 * Fetches feats list if not already loaded.
 */
export async function loadFeats() {
  if (Array.isArray(DATA.feats) && DATA.feats.length) return;
  const json = await fetchJsonWithRetry('data/feats.json', 'feats');
  DATA.feats = Object.keys(json.feats || {});
}

export const CharacterState = {
  name: "",
  type: "character",
  classes: [],
  feats: [],
  equipment: [],
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
    currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
    attributes: {
      ac: 10,
      hp: { value: 1, max: 1 },
      init: { value: 0 },
      prof: 2,
    },
    details: {
      background: "",
      race: "",
      alignment: "",
    },
    traits: {
      size: "med",
      senses: { darkvision: 0 },
      languages: { value: [] },
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
      pact: { value: 0, max: 0 },
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
  return (CharacterState.classes || []).reduce(
    (sum, cls) => sum + (cls.level || 0),
    0
  );
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
  CharacterState.system.spells.pact.value = Math.min(
    CharacterState.system.spells.pact.value,
    pact.slots
  );
}

/**
 * Update the proficiency bonus based on total character level.
 * Levels 1-4: +2, 5-8: +3, 9-12: +4, 13-16: +5, 17+: +6.
 */
export function updateProficiencyBonus() {
  const level = totalLevel();
  let prof = 2;
  if (level >= 17) prof = 6;
  else if (level >= 13) prof = 5;
  else if (level >= 9) prof = 4;
  else if (level >= 5) prof = 3;
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
