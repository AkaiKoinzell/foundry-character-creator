// --- Internal helpers ----------------------------------------------------
import { DATA, loadFeatDetails, fetchJsonWithRetry, deriveSubclassData } from './data.js';
import {
  buildPlutoniumSpellItem,
  buildPlutoniumFeatItem,
} from './plutonium-data.js';

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

function finalizeState(state) {
  const abilities = state.system?.abilities || {};
  if (state.baseAbilities && state.bonusAbilities) {
    Object.keys(abilities).forEach((ab) => {
      const base = state.baseAbilities[ab] ?? abilities[ab]?.value ?? 8;
      const bonus = state.bonusAbilities[ab] || 0;
      abilities[ab].value = base + bonus;
    });
  }

  if (state.system?.attributes) {
    const totalLevel = (state.classes || []).reduce(
      (sum, c) => sum + (c.level || 0),
      0
    );
    const PROFICIENCY_BY_LEVEL = [
      0,
      2, 2, 2, 2,
      3, 3, 3, 3,
      4, 4, 4, 4,
      5, 5, 5, 5,
      6, 6, 6, 6,
    ];
    state.system.attributes.prof =
      PROFICIENCY_BY_LEVEL[Math.min(totalLevel, 20)] || 0;
  }

  if (state.system?.spells) {
    let casterLevel = 0;
    let pactLevel = 0;
    (state.classes || []).forEach((cls) => {
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
      const spell = state.system.spells[`spell${i}`];
      if (spell) {
        spell.max = max;
        spell.value = Math.min(spell.value, max);
      }
    }

    const pact = PACT_MAGIC[Math.min(pactLevel, 20)] || { slots: 0, level: 0 };
    if (state.system.spells.pact) {
      state.system.spells.pact.max = pact.slots;
      state.system.spells.pact.level = pact.level;
      state.system.spells.pact.value = Math.min(
        state.system.spells.pact.value,
        pact.slots
      );
    }
  }
}

function validateActor(actor) {
  if (!actor || typeof actor !== "object")
    throw new Error("Invalid actor export: not an object");
  if (typeof actor.name !== "string")
    throw new Error("Actor name must be a string");
  if (typeof actor.type !== "string")
    throw new Error("Actor type must be a string");
  if (typeof actor.system !== "object")
    throw new Error("Actor system missing");
  if (!Array.isArray(actor.items))
    throw new Error("Actor items must be an array");
  if (typeof actor.prototypeToken !== "object")
    throw new Error("Actor prototypeToken missing");
}

export function exportFoundryActor(state) {
  finalizeState(state);
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const actor = {
    name: state.name,
    playerName: state.playerName,
    type: state.type,
    system: clone(state.system),
    items: [],
    prototypeToken: clone(state.prototypeToken),
    flags: {
      fcc: {
        race: state.system?.details?.race || "",
        background: state.system?.details?.background || "",
        bonusAbilities: clone(state.bonusAbilities || {}),
        baseAbilities: clone(state.baseAbilities || {}),
        languages: clone(state.system?.traits?.languages?.value || []),
        raceChoices: clone(state.raceChoices || {}),
        knownSpells: clone(state.knownSpells || {}),
        tools: clone(state.system.tools || []),
        skills: clone(state.system.skills || []),
        feats: clone((state.feats || []).map((f) => f.name || f)),
        ...(state.infusions && state.infusions.length
          ? { infusions: clone((state.infusions || []).map((i) => i.name || i)) }
          : {}),
      },
    },
  };

  if (!actor.system.details) actor.system.details = {};
  actor.system.details.origin = state.system?.details?.origin || "";
  actor.system.details.age = state.system?.details?.age ?? 0;
  actor.system.details.backstory = state.system?.details?.backstory || "";

  if (state.system?.details?.race) {
    actor.items.push({ name: state.system.details.race, type: "race", system: {} });
  }
  if (state.system?.details?.background) {
    actor.items.push({
      name: state.system.details.background,
      type: "background",
      system: {},
    });
  }

  (state.classes || []).forEach((cls) => {
    actor.items.push({
      name: cls.name,
      type: "class",
      system: {
        level: cls.level,
        subclass: cls.subclass || "",
      },
    });
  });

  (state.feats || []).forEach((feat) => {
    const name = typeof feat === "string" ? feat : feat.name;
    const system = typeof feat === "string" ? {} : feat.system || {};
    actor.items.push({ name, type: "feat", system });
  });

  (state.infusions || []).forEach((inf) => {
    const name = typeof inf === 'string' ? inf : inf.name;
    const description = typeof inf === 'string' ? '' : inf.description || '';
    const system = typeof inf === 'string' ? {} : clone(inf.system || {});
    if (description && !system.description) {
      system.description = { value: description };
    }
    actor.items.push({ name, type: 'feat', system });
  });

  (state.equipment || []).forEach((item) => {
    actor.items.push({
      name: item.name,
      type: item.type || "loot",
      system: item.system || {},
    });
  });

  if (state.knownSpells) {
    Object.values(state.knownSpells).forEach((byLevel) => {
      Object.entries(byLevel).forEach(([lvl, names]) => {
        names.forEach((name) => {
          actor.items.push({
            name,
            type: "spell",
            system: { level: Number(lvl), preparation: { prepared: true } },
          });
        });
      });
    });
  }

  validateActor(actor);
  return actor;
}

export { finalizeState };

// --- Foundry v13 / dnd5e modern export -------------------------------

// Skill code mapping used by the dnd5e system
const SKILL_CODE_BY_NAME = {
  Acrobatics: "acr",
  "Animal Handling": "ani",
  Arcana: "arc",
  Athletics: "ath",
  Deception: "dec",
  History: "his",
  Insight: "ins",
  Intimidation: "itm",
  Investigation: "inv",
  Medicine: "med",
  Nature: "nat",
  Perception: "prc",
  Performance: "prf",
  Persuasion: "per",
  Religion: "rel",
  "Sleight of Hand": "slt",
  Stealth: "ste",
  Survival: "sur",
};


// Default governing ability by skill (lowercase ability codes)
const SKILL_ABILITY = {
  acr: "dex",
  ani: "wis",
  arc: "int",
  ath: "str",
  dec: "cha",
  his: "int",
  ins: "wis",
  itm: "cha",
  inv: "int",
  med: "wis",
  nat: "int",
  prc: "wis",
  prf: "cha",
  per: "cha",
  rel: "int",
  slt: "dex",
  ste: "dex",
  sur: "wis",
};

function slugifyIdentifier(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function shortId(len = 16) {
  let out = "";
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let i = 0; i < len; i++) out += chars[(Math.random() * chars.length) | 0];
  return out;
}

function mapAbilityNameToCode(name) {
  const n = String(name || "").toLowerCase();
  if (["str", "dex", "con", "int", "wis", "cha"].includes(n)) return n;
  const map = {
    strength: "str",
    dexterity: "dex",
    constitution: "con",
    intelligence: "int",
    wisdom: "wis",
    charisma: "cha",
  };
  return map[n] || "";
}

// Normalizers used for allowlist checks
const NAME_KEY_NORMALIZER = /[^a-z0-9]+/g;
const FEAT_NAME_KEY = (name) =>
  String(name || '').toLowerCase().replace(NAME_KEY_NORMALIZER, '');
const SPELL_NAME_KEY = (name) =>
  String(name || '').toLowerCase().replace(NAME_KEY_NORMALIZER, '');

function buildFoundryAbilities(state) {
  const src = state.system?.abilities || {};
  const saveSet = new Set();
  (state.classes || []).forEach((cls) => {
    (cls.saving_throws || []).forEach((sv) => {
      saveSet.add(mapAbilityNameToCode(sv));
    });
  });
  const extraSaves = state.system?.attributes?.saves || [];
  extraSaves.forEach((sv) => saveSet.add(mapAbilityNameToCode(sv)));
  const base = {
    check: { roll: { min: null, max: null, mode: 0 } },
    save: { roll: { min: null, max: null, mode: 0 } },
    bonuses: { check: "", save: "" },
    max: null,
  };
  const out = {};
  ["str", "dex", "con", "int", "wis", "cha"].forEach((ab) => {
    const val = src?.[ab]?.value ?? 10;
    out[ab] = {
      value: val,
      proficient: saveSet.has(ab) ? 1 : 0,
      ...base,
    };
  });
  return out;
}

function buildFoundrySkills(state) {
  const profs = new Set(Array.isArray(state.system?.skills) ? state.system.skills : []);
  const expertise = new Set(
    Array.isArray(state.system?.expertise) ? state.system.expertise : []
  );
  const base = { roll: { min: null, max: null, mode: 0 }, bonuses: { check: "", passive: "" } };
  const out = {};
  for (const [name, code] of Object.entries(SKILL_CODE_BY_NAME)) {
    const val = expertise.has(name) ? 2 : profs.has(name) ? 1 : 0;
    out[code] = { ability: SKILL_ABILITY[code], value: val, ...base };
  }
  return out;
}

function toolKeyFromName(name) {
  const n = String(name || "").toLowerCase();
  const map = {
    "thieves' tools": "thief",
    "tinker's tools": "tink",
    "herbalism kit": "herb",
    "poisoner's kit": "pois",
    "navigator's tools": "navg",
    "disguise kit": "disg",
    "forgery kit": "forg",
    "cook's utensils": "cook",
    "alchemist's supplies": "alch",
    "smith's tools": "smith",
    "brewer's supplies": "brew",
    "mason's tools": "mason",
    "carpenter's tools": "carp",
    "calligrapher's supplies": "calli",
    "cartographer's tools": "cart",
    "cobbler's tools": "cobb",
    "glassblower's tools": "glass",
    "jeweler's tools": "jewel",
    "leatherworker's tools": "leath",
    "painter's supplies": "paint",
    "potter's tools": "potter",
    "weaver's tools": "weav",
    "woodcarver's tools": "wood",
  };
  if (map[n]) return map[n];
  // Fallback slug
  return n.replace(/[^a-z0-9]+/g, "").slice(0, 12) || "tool";
}

function buildFoundryTools(state) {
  const toolsArr = Array.isArray(state.system?.tools) ? state.system.tools : [];
  const out = {};
  toolsArr.forEach((t) => {
    const key = toolKeyFromName(t);
    out[key] = {
      value: 1,
      ability: "int",
      roll: { min: null, max: null, mode: 0 },
      bonuses: { check: "" },
    };
  });
  return out;
}

function toLanguageKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function buildFoundrySystem(state) {
  const sys = state.system || {};
  const spellState = sys.spells || {};
  const slotEntry = (key) => {
    const src = spellState[key] || {};
    const out = {
      value: src.value ?? 0,
      max: src.max ?? 0,
    };
    if (Object.prototype.hasOwnProperty.call(src, "override")) {
      out.override = src.override;
    }
    return out;
  };

  const pactState = spellState.pact || {};
  const movementState = sys.attributes?.movement || {};
  const hpState = sys.attributes?.hp || {};

  const system = {
    currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0, ...(sys.currency || {}) },
    abilities: buildFoundryAbilities(state),
    bonuses: {
      mwak: { attack: "", damage: "" },
      rwak: { attack: "", damage: "" },
      msak: { attack: "", damage: "" },
      rsak: { attack: "", damage: "" },
      abilities: { check: "", save: "", skill: "" },
      spell: { dc: "" },
    },
    skills: buildFoundrySkills(state),
    tools: buildFoundryTools(state),
    spells: {
      spell1: slotEntry("spell1"),
      spell2: slotEntry("spell2"),
      spell3: slotEntry("spell3"),
      spell4: slotEntry("spell4"),
      spell5: slotEntry("spell5"),
      spell6: slotEntry("spell6"),
      spell7: slotEntry("spell7"),
      spell8: slotEntry("spell8"),
      spell9: slotEntry("spell9"),
      pact: {
        value: pactState.value ?? 0,
        max: pactState.max ?? 0,
        level: pactState.level ?? 0,
      },
    },
    attributes: {
      ac: { calc: "default" },
      init: { ability: "", roll: { min: null, max: null, mode: 0 }, bonus: "" },
      movement: {
        burrow: movementState.burrow ?? null,
        climb: movementState.climb ?? null,
        fly: movementState.fly ?? null,
        swim: movementState.swim ?? null,
        walk: movementState.walk ?? null,
        units: movementState.units ?? null,
        hover: Boolean(movementState.hover),
        ignoredDifficultTerrain: Array.isArray(
          movementState.ignoredDifficultTerrain
        )
          ? [...movementState.ignoredDifficultTerrain]
          : [],
      },
      attunement: { max: 3 },
      senses: {
        darkvision: null,
        blindsight: null,
        tremorsense: null,
        truesight: null,
        units: null,
        special: "",
      },
      spellcasting: sys.attributes?.spellcasting || "",
      exhaustion: 0,
      concentration: {
        ability: "",
        roll: { min: null, max: null, mode: 0 },
        bonuses: { save: "" },
        limit: 1,
      },
      loyalty: {},
      hp: {
        value: hpState.value ?? 0,
        max: hpState.max ?? null,
        temp: hpState.temp ?? 0,
        tempmax: hpState.tempmax ?? 0,
        bonuses: hpState.bonuses ? { ...hpState.bonuses } : {},
      },
      death: {
        roll: { min: null, max: null, mode: 0 },
        success: 0,
        failure: 0,
        bonuses: { save: "" },
      },
      inspiration: false,
    },
    bastion: { name: "", description: "" },
    details: {
      biography: { value: sys.details?.backstory || "", public: "" },
      alignment: sys.details?.alignment || "",
      ideal: sys.details?.ideal || "",
      bond: sys.details?.bond || "",
      flaw: sys.details?.flaw || "",
      race: null, // backfilled later when items are created
      background: null, // backfilled later
      originalClass: null, // backfilled later
      xp: { value: sys.details?.xp?.value ?? 0 },
      appearance: sys.details?.appearance || "",
      trait: sys.details?.trait || "",
    },
    traits: {
      size: sys.traits?.size || "med",
      di: { value: [], custom: "", bypasses: [] },
      dr: { value: [], custom: "", bypasses: [] },
      dv: { value: [], custom: "", bypasses: [] },
      dm: { amount: {}, bypasses: [] },
      ci: { value: [], custom: "" },
      languages: {
        value: (sys.traits?.languages?.value || []).map(toLanguageKey),
        custom: "",
        communication: {},
      },
      weaponProf: { value: [], custom: "", mastery: { value: [], bonus: [] } },
      armorProf: { value: [], custom: "" },
    },
    resources: {
      primary: { value: 0, max: 0, sr: false, lr: false, label: "" },
      secondary: { value: 0, max: 0, sr: false, lr: false, label: "" },
      tertiary: { value: 0, max: 0, sr: false, lr: false, label: "" },
    },
    favorites: [],
  };
  return system;
}

function entriesArrayToHtml(entries) {
  if (!Array.isArray(entries)) return '';
  const parts = [];
  const walk = (arr) => {
    arr.forEach((e) => {
      if (!e) return;
      if (typeof e === 'string') parts.push(`<p>${e}</p>`);
      else if (e.entry) parts.push(`<p>${e.entry}</p>`);
      else if (Array.isArray(e.entries)) walk(e.entries);
      else if (Array.isArray(e.items)) walk(e.items);
      else if (e.description) parts.push(`<p>${e.description}</p>`);
    });
  };
  walk(entries);
  return parts.join('\n');
}

function classImage(name) {
  const slug = slugifyIdentifier(name);
  return `assets/classes/${slug}.png`;
}

function raceImage(name) {
  const slug = slugifyIdentifier(name);
  return `assets/races/${slug}.png`;
}

// Minimal equipment mapping to proper item types and quantities
const EQUIPMENT_KNOWN = {
  // weapons
  'dagger': { type: 'weapon' },
  'javelin': { type: 'weapon' },
  'handaxe': { type: 'weapon' },
  'mace': { type: 'weapon' },
  'quarterstaff': { type: 'weapon' },
  'sickle': { type: 'weapon' },
  'spear': { type: 'weapon' },
  'light crossbow': { type: 'weapon' },
  'shortbow': { type: 'weapon' },
  'longbow': { type: 'weapon' },
  'greatsword': { type: 'weapon' },
  'greataxe': { type: 'weapon' },
  'longsword': { type: 'weapon' },
  'rapier': { type: 'weapon' },
  'scimitar': { type: 'weapon' },
  'shortsword': { type: 'weapon' },
  'warhammer': { type: 'weapon' },
  'maul': { type: 'weapon' },
  'flail': { type: 'weapon' },
  'glaive': { type: 'weapon' },
  'pike': { type: 'weapon' },
  'trident': { type: 'weapon' },
  'war pick': { type: 'weapon' },
  'whip': { type: 'weapon' },
  'morningstar': { type: 'weapon' },
  'club': { type: 'weapon' },
  'dart': { type: 'weapon' },
  'light hammer': { type: 'weapon' },
  // armor & shields
  'leather armor': { type: 'equipment', subtype: 'light' },
  'studded leather armor': { type: 'equipment', subtype: 'light' },
  'hide armor': { type: 'equipment', subtype: 'medium' },
  'scale mail': { type: 'equipment', subtype: 'medium' },
  'chain shirt': { type: 'equipment', subtype: 'medium' },
  'breastplate': { type: 'equipment', subtype: 'medium' },
  'half plate': { type: 'equipment', subtype: 'medium' },
  'ring mail': { type: 'equipment', subtype: 'heavy' },
  'chain mail': { type: 'equipment', subtype: 'heavy' },
  'splint': { type: 'equipment', subtype: 'heavy' },
  'plate': { type: 'equipment', subtype: 'heavy' },
  'shield': { type: 'equipment', subtype: 'shield' },
  // tools / kits
  "thieves' tools": { type: 'tool' },
  "tinker's tools": { type: 'tool' },
  "alchemist's supplies": { type: 'tool' },
  "brewer's supplies": { type: 'tool' },
  "calligrapher's tools": { type: 'tool' },
  "carpenter's tools": { type: 'tool' },
  "cartographer's tools": { type: 'tool' },
  "cobbler's tools": { type: 'tool' },
  "cook's utensils": { type: 'tool' },
  "glassblower's tools": { type: 'tool' },
  "jeweler's tools": { type: 'tool' },
  "leatherworker's tools": { type: 'tool' },
  "mason's tools": { type: 'tool' },
  "painter's supplies": { type: 'tool' },
  "potter's tools": { type: 'tool' },
  "smith's tools": { type: 'tool' },
  "weaver's tools": { type: 'tool' },
  "woodcarver's tools": { type: 'tool' },
  // misc gear (treated as loot/equipment)
  'holy symbol': { type: 'equipment' },
  'arcane focus': { type: 'equipment' },
  'component pouch': { type: 'equipment' },
  'backpack': { type: 'loot' },
  'rope (50 feet)': { type: 'loot' },
  'waterskin': { type: 'loot' },
  'tinderbox': { type: 'loot' },
  'torches (10)': { type: 'loot' },
  'rations (10 days)': { type: 'loot' },
};

// Basic weapon stat table to enrich mundane weapons with damage/properties
const WEAPON_STATS = {
  'dagger': { dmg: '1d4', type: 'piercing', properties: ['fin', 'lgt', 'thr'], range: { value: 20, long: 60 } },
  'club': { dmg: '1d4', type: 'bludgeoning', properties: ['lgt'] },
  'sickle': { dmg: '1d4', type: 'slashing', properties: ['lgt'] },
  'whip': { dmg: '1d4', type: 'slashing', properties: ['fin', 'rch'] },
  'shortsword': { dmg: '1d6', type: 'piercing', properties: ['fin', 'lgt'] },
  'handaxe': { dmg: '1d6', type: 'slashing', properties: ['lgt', 'thr'], range: { value: 20, long: 60 } },
  'mace': { dmg: '1d6', type: 'bludgeoning', properties: [] },
  'javelin': { dmg: '1d6', type: 'piercing', properties: ['thr'], range: { value: 30, long: 120 } },
  'spear': { dmg: '1d6', type: 'piercing', properties: ['thr', 'ver'], range: { value: 20, long: 60 }, versatile: '1d8' },
  'quarterstaff': { dmg: '1d6', type: 'bludgeoning', properties: ['ver'], versatile: '1d8' },
  'scimitar': { dmg: '1d6', type: 'slashing', properties: ['fin', 'lgt'] },
  'rapier': { dmg: '1d8', type: 'piercing', properties: ['fin'] },
  'longsword': { dmg: '1d8', type: 'slashing', properties: ['ver'], versatile: '1d10' },
  'warhammer': { dmg: '1d8', type: 'bludgeoning', properties: ['ver'], versatile: '1d10' },
  'battleaxe': { dmg: '1d8', type: 'slashing', properties: ['ver'], versatile: '1d10' },
  'war pick': { dmg: '1d8', type: 'piercing', properties: [] },
  'flail': { dmg: '1d8', type: 'bludgeoning', properties: [] },
  'glaive': { dmg: '1d10', type: 'slashing', properties: ['hvy', 'two', 'rch'] },
  'pike': { dmg: '1d10', type: 'piercing', properties: ['hvy', 'two', 'rch'] },
  'trident': { dmg: '1d6', type: 'piercing', properties: ['thr', 'ver'], range: { value: 20, long: 60 }, versatile: '1d8' },
  'maul': { dmg: '2d6', type: 'bludgeoning', properties: ['hvy', 'two'] },
  'greatsword': { dmg: '2d6', type: 'slashing', properties: ['hvy', 'two'] },
  'greataxe': { dmg: '1d12', type: 'slashing', properties: ['hvy', 'two'] },
  'light crossbow': { dmg: '1d8', type: 'piercing', properties: ['amm', 'two', 'lod'], range: { value: 80, long: 320 } },
  'heavy crossbow': { dmg: '1d10', type: 'piercing', properties: ['amm', 'two', 'hvy', 'lod'], range: { value: 100, long: 400 } },
  'hand crossbow': { dmg: '1d6', type: 'piercing', properties: ['amm', 'lgt', 'lod'], range: { value: 30, long: 120 } },
  'shortbow': { dmg: '1d6', type: 'piercing', properties: ['amm', 'two'], range: { value: 80, long: 320 } },
  'longbow': { dmg: '1d8', type: 'piercing', properties: ['amm', 'two', 'hvy'], range: { value: 150, long: 600 } },
  'dart': { dmg: '1d4', type: 'piercing', properties: ['thr', 'fin'], range: { value: 20, long: 60 } },
  'sling': { dmg: '1d4', type: 'bludgeoning', properties: ['amm'], range: { value: 30, long: 120 } },
};

let CUSTOM_WEAPON_STATS = null;
async function loadCustomWeaponStats() {
  if (CUSTOM_WEAPON_STATS !== null) return CUSTOM_WEAPON_STATS;
  CUSTOM_WEAPON_STATS = {};
  try {
    const json = await fetchJsonWithRetry('data/weapon-stats.json', 'weapon stats');
    if (json && typeof json === 'object') {
      Object.entries(json).forEach(([k, v]) => {
        if (!k || !v) return;
        CUSTOM_WEAPON_STATS[String(k).toLowerCase()] = v;
      });
    }
  } catch (_) { /* optional */ }
  return CUSTOM_WEAPON_STATS;
}

function singularize(name) {
  const n = String(name || '').trim();
  if (/handaxes$/i.test(n)) return n.replace(/handaxes$/i, 'handaxe');
  if (/daggers$/i.test(n)) return n.replace(/daggers$/i, 'dagger');
  if (/javelins$/i.test(n)) return n.replace(/javelins$/i, 'javelin');
  if (/darts$/i.test(n)) return n.replace(/darts$/i, 'dart');
  if (/arrows$/i.test(n)) return n; // keep plural for ammo
  if (/bolts$/i.test(n)) return n; // keep plural for ammo
  return n.replace(/s$/i, '');
}

function parseEquipmentLine(line) {
  const out = [];
  if (!line) return out;
  let text = String(line).trim();
  // handle patterns: "Two daggers", "Javelins (4)", "Light crossbow and 20 bolts"
  const twoMatch = text.match(/^two\s+(.+)$/i);
  if (twoMatch) {
    const name = singularize(twoMatch[1].trim());
    out.push({ name, quantity: 2 });
    return out;
  }
  const qtyMatch = text.match(/^(.*)\((\d+)\)$/);
  if (qtyMatch) {
    const name = singularize(qtyMatch[1].trim());
    const qty = Number(qtyMatch[2]) || 1;
    out.push({ name, quantity: qty });
    return out;
  }
  const andMatch = text.match(/^(.*) and (\d+) (bolts|arrows)$/i);
  if (andMatch) {
    const base = andMatch[1].trim();
    const qty = Number(andMatch[2]) || 0;
    const ammo = andMatch[3].toLowerCase().includes('arrow') ? 'Arrows' : 'Bolts';
    out.push({ name: singularize(base), quantity: 1 });
    out.push({ name: ammo, quantity: qty, type: 'consumable' });
    return out;
  }
  out.push({ name: singularize(text) });
  return out;
}

function enrichEquipmentEntry(e) {
  const key = String(e.name || '').toLowerCase();
  const def = EQUIPMENT_KNOWN[key];
  const type = e.type || def?.type || 'loot';
  const sys = {
    quantity: Number(e.quantity) || 1,
    attunement: '',
    equipped: Boolean(e.equipped) || false,
    rarity: '',
    identified: true,
    ...(e.system || {}),
  };
  if (def?.subtype) sys.type = { value: def.subtype };
  if (type === 'consumable') {
    // Infer ammo subtype
    let subtype = 'ammo';
    if (/arrow/i.test(key)) subtype = 'arrow';
    else if (/bolt/i.test(key)) subtype = 'crossbowBolt';
    sys.type = { value: 'ammo', subtype };
  }
  if (key === 'backpack') {
    // Represent backpack as a basic container
    return {
      name: 'Backpack',
      type: 'container',
      system: {
        ...sys,
        capacity: { weight: { value: 30, units: 'lb' }, volume: { units: 'cubicFoot' } },
        currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      },
    };
  }
  // Enrich weapon damage/properties for mundane weapons
  if (type === 'weapon') {
    const w = (CUSTOM_WEAPON_STATS && CUSTOM_WEAPON_STATS[key]) || WEAPON_STATS[key];
    if (w) {
      sys.damage = { parts: [[w.dmg, w.type]], versatile: w.versatile || '' };
      if (w.range) sys.range = { value: w.range.value, long: w.range.long, units: 'ft' };
      // dnd5e v13 uses abbreviated property codes in system.properties
      sys.properties = Array.isArray(w.properties) ? [...w.properties] : [];
    }
  }
  return { name: e.name, type, system: sys };
}

// Attach limited mechanics to well-known class features to make them usable immediately
function attachFeatureMechanics(item, { className = '', classLevels = {}, featureLevel = 1, abilityMods = {} } = {}) {
  const name = String(item?.name || '').toLowerCase();
  const levels = classLevels || {};

  const pushActivity = (act) => {
    const acts = item.activities || [];
    acts.push(act);
    item.activities = acts;
  };

  const pushEffect = (effName, changes) => {
    const efe = {
      name: effName,
      disabled: false,
      transfer: true,
      duration: {},
      changes: changes.map((c) => ({ key: c.key, mode: c.mode || 'ADD', value: c.value })),
    };
    const arr = Array.isArray(item.effects) ? item.effects : [];
    arr.push(efe);
    item.effects = arr;
  };

  // Fighter: Second Wind (Lv 1)
  if (className === 'Fighter' && /second wind/i.test(item.name)) {
    item.system.uses = { value: 0, max: '1', recovery: ['sr'], spent: 0 };
    pushActivity({
      name: 'Second Wind',
      type: 'heal',
      activation: { type: 'bonus' },
      healing: { parts: [[`1d10 + ${levels.Fighter || featureLevel}`, 'healing']] },
    });
    return;
  }

  // Fighter: Action Surge (Lv 2, 17+ two uses)
  if (className === 'Fighter' && /action surge/i.test(item.name)) {
    const lvl = levels.Fighter || featureLevel;
    const max = lvl >= 17 ? '2' : '1';
    item.system.uses = { value: 0, max, recovery: ['sr'], spent: 0 };
    pushActivity({ name: 'Action Surge', type: 'utility', activation: { type: 'special' } });
    return;
  }

  // Barbarian: Rage (uses per LR; simple progression)
  if (className === 'Barbarian' && /rage/i.test(item.name)) {
    const lvl = levels.Barbarian || featureLevel;
    let max = 2; // 1-2: 2 uses, 3-5: 2 uses; adjust from 6 onward
    if (lvl >= 6) max = 3;
    if (lvl >= 12) max = 4;
    if (lvl >= 17) max = 5;
    if (lvl >= 20) max = 6; // cap at 6 as an approximation
    item.system.uses = { value: 0, max: String(max), recovery: ['lr'], spent: 0 };
    pushActivity({ name: 'Rage', type: 'utility', activation: { type: 'bonus' } });
    return;
  }

  // Bard: Bardic Inspiration (Lv 1) — uses = CHA mod (min 1), die d6
  if (className === 'Bard' && /bardic inspiration/i.test(item.name)) {
    const cha = Number(abilityMods?.cha ?? 0);
    const max = Math.max(1, cha);
    item.system.uses = { value: 0, max: String(max), recovery: ['lr'], spent: 0 };
    pushActivity({ name: 'Bardic Inspiration (d6)', type: 'utility', activation: { type: 'bonus' } });
    return;
  }

  // Paladin: Divine Sense (Lv 1) — uses = 1 + CHA mod
  if (className === 'Paladin' && /divine sense/i.test(item.name)) {
    const cha = Number(abilityMods?.cha ?? 0);
    const max = Math.max(1, 1 + cha);
    item.system.uses = { value: 0, max: String(max), recovery: ['lr'], spent: 0 };
    pushActivity({ name: 'Divine Sense', type: 'utility', activation: { type: 'action' } });
    return;
  }

  // Paladin: Lay on Hands (Lv 1) — pool 5 * level
  if (className === 'Paladin' && /lay on hands/i.test(item.name)) {
    const lvl = levels.Paladin || featureLevel;
    const pool = Math.max(5, 5 * lvl);
    item.system.uses = { value: 0, max: String(pool), recovery: ['lr'], spent: 0 };
    pushActivity({ name: 'Lay on Hands', type: 'heal', activation: { type: 'action' }, healing: { parts: [['1', 'healing']] } });
    return;
  }

  // Rogue: Sneak Attack (Lv 1) — 1d6 + scaling; here we set 1d6 as baseline
  if (className === 'Rogue' && /sneak attack/i.test(item.name)) {
    const lvl = levels.Rogue || featureLevel;
    const dice = Math.ceil(lvl / 2); // 1d6 at 1, 2d6 at 3, etc.
    pushActivity({ name: `Sneak Attack (${dice}d6)`, type: 'damage', activation: { type: 'special' }, damage: { parts: [[`${dice}d6`, 'piercing']] } });
    return;
  }

  // Wizard: Arcane Recovery (Lv 1)
  if (className === 'Wizard' && /arcane recovery/i.test(item.name)) {
    item.system.uses = { value: 0, max: '1', recovery: ['lr'], spent: 0 };
    pushActivity({ name: 'Arcane Recovery', type: 'utility', activation: { type: 'special' } });
    return;
  }

  // Fighter: Fighting Style — Archery (Lv 1): +2 bonus to ranged weapon attack rolls
  if (/fighting style/i.test(item.name) && /archery/i.test(item.name)) {
    pushEffect('Archery', [
      { key: 'system.bonuses.rwak.attack', value: '+2' },
    ]);
    return;
  }

  // Fighter: Fighting Style — Defense (Lv 1): +1 AC while wearing armor (approximate as unconditional)
  if (/fighting style/i.test(item.name) && /defense/i.test(item.name)) {
    pushEffect('Defense', [
      { key: 'system.attributes.ac.bonus', value: '+1' },
    ]);
    return;
  }

  // Fighter: Fighting Style — Dueling (Lv 1): +2 damage with a one-handed melee weapon (approximate as unconditional)
  if (/fighting style/i.test(item.name) && /dueling/i.test(item.name)) {
    pushEffect('Dueling', [
      { key: 'system.bonuses.mwak.damage', value: '+2' },
    ]);
    return;
  }

  // Monk: Martial Arts (Lv 1): add an Unarmed Strike (1d4) activity (bonus action)
  if (className === 'Monk' && /martial arts/i.test(item.name)) {
    pushActivity({
      name: 'Unarmed Strike (1d4)',
      type: 'damage',
      activation: { type: 'bonus' },
      damage: { parts: [['1d4', 'bludgeoning']] },
    });
    return;
  }

  // Warlock (Hexblade): Hexblade's Curse (Lv 1): 1/short rest, bonus action
  if (/hexblade.*curse/i.test(item.name) || /hexblade's curse/i.test(item.name)) {
    item.system.uses = { value: 0, max: '1', recovery: ['sr'], spent: 0 };
    pushActivity({ name: "Hexblade's Curse", type: 'utility', activation: { type: 'bonus' } });
    return;
  }
}

export async function exportFoundryActorV13(state) {
  finalizeState(state);
  const system = buildFoundrySystem(state);

  const items = [];
  const classLevelMap = {};
  // Build ability modifiers for feature mechanics
  const abilityMods = (() => {
    const out = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    try {
      const abs = state.system?.abilities || {};
      for (const k of Object.keys(out)) {
        const v = Number(abs?.[k]?.value) || 10;
        out[k] = Math.floor((v - 10) / 2);
      }
    } catch (_) { /* ignore */ }
    return out;
  })();
  // Load optional custom weapon stats before enriching equipment
  try { await loadCustomWeaponStats(); } catch (_) { /* ignore */ }
  const defaultIcon = (type) => {
    if (type === "spell") return "icons/svg/book.svg";
    if (type === "weapon") return "icons/svg/sword.svg";
    if (type === "armor") return "icons/svg/shield.svg";
    if (type === "equipment") return "icons/svg/chest.svg";
    if (type === "tool") return "icons/svg/hammer.svg";
    if (type === "loot") return "icons/svg/coins.svg";
    if (type === "class") return "icons/svg/upgrade.svg";
    if (type === "subclass") return "icons/svg/downgrade.svg";
    if (type === "background") return "icons/svg/book.svg";
    if (type === "race") return "icons/svg/mystery-man.svg";
    return "icons/svg/item-bag.svg";
  };
  const makeItem = (name, type, systemData = {}, img) => ({
    _id: shortId(),
    name,
    type,
    system: systemData,
    effects: [],
    activities: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    img: img || defaultIcon(type),
  });

  // Race item and link into details.race
  const raceName = state.system?.details?.race || state.flags?.fcc?.race || "";
  if (raceName) {
    let descHtml = "";
    try {
      // Try to locate the race definition to build a description
      const all = Object.values(DATA?.races || {}).flat();
      const entry = all.find((r) => r?.name === raceName);
      const path = entry?.path;
      if (path) {
        const raw = await fetchJsonWithRetry(path, `race at ${path}`);
        if (raw?.entries) descHtml = entriesArrayToHtml(raw.entries);
        if (!system.traits?.size && raw?.size) system.traits = system.traits || {}; // conservative
      }
    } catch (_) { /* ignore */ }
    const race = makeItem(raceName, "race", {
      description: { value: descHtml, chat: "" },
      movement: { walk: 30, units: "ft" },
      type: { value: "humanoid", subtype: "", custom: "" },
      senses: { darkvision: 0, units: "ft" },
    }, raceImage(raceName));
    items.push(race);
    system.details.race = race._id;
  }

  // Background item and link
  const bgName = state.system?.details?.background || state.flags?.fcc?.background || "";
  if (bgName) {
    const bg = makeItem(bgName, "background", { description: { value: "", chat: "" } });
    items.push(bg);
    system.details.background = bg._id;
  }

  // Class and subclass items
  const CLASS_IDENTIFIERS = {
    Barbarian: "barbarian",
    Bard: "bard",
    Cleric: "cleric",
    Druid: "druid",
    Fighter: "fighter",
    Monk: "monk",
    Paladin: "paladin",
    Ranger: "ranger",
    Rogue: "rogue",
    Sorcerer: "sorcerer",
    Warlock: "warlock",
    Wizard: "wizard",
    Artificer: "artificer",
    "Blood Hunter": "bloodhunter",
  };
  for (let i = 0; i < (state.classes || []).length; i++) {
    const cls = state.classes[i];
    // Build map of class levels for feature mechanics
    classLevelMap[cls.name] = Number(cls.level) || 0;
    const idf = CLASS_IDENTIFIERS[cls.name] || slugifyIdentifier(cls.name);
    let classDesc = '';
    try {
      const found = (DATA?.classes || []).find((c) => c?.name === cls.name);
      if (found?.description) classDesc = found.description;
    } catch (_) { /* ignore */ }
    const classItem = makeItem(cls.name, "class", {
      identifier: idf,
      levels: Number(cls.level) || 1,
      description: { value: classDesc, chat: "" },
    }, classImage(cls.name));
    items.push(classItem);
    if (i === 0) system.details.originalClass = classItem._id;
    const sc = cls.subclass || "";
    if (sc) {
      let scDesc = '';
      try {
        const derived = await deriveSubclassData(cls.name, sc);
        if (derived?.description) scDesc = derived.description;
      } catch (_) { /* ignore */ }
      const scItem = makeItem(sc, "subclass", {
        identifier: slugifyIdentifier(sc),
        classIdentifier: idf,
        description: { value: scDesc, chat: "" },
      });
      items.push(scItem);
    }
  }

  // Feats
  const allowedFeatSet = new Set(
    (DATA.feats || []).map((f) =>
      FEAT_NAME_KEY(typeof f === 'string' ? f : f?.name || f)
    )
  );
  for (const feat of state.feats || []) {
    const name = typeof feat === 'string' ? feat : feat.name;
    const source =
      (typeof feat === 'object' && (feat.source || feat.system?.source?.book)) || '';
    let built = null;
    if (!allowedFeatSet.size || allowedFeatSet.has(FEAT_NAME_KEY(name))) {
      try {
        built = await buildPlutoniumFeatItem(name, { source });
      } catch (err) {
        console.warn('Failed to build Plutonium feat', name, err);
      }
    }

    if (built) {
      const item = makeItem(built.name, built.type, built.system, built.img);
      item.effects = built.effects || [];
      item.activities = built.activities || [];
      item.flags = { ...(built.flags || {}) };
      items.push(item);
      continue;
    }

    let desc = '';
    try {
      const detail = await loadFeatDetails(name);
      if (detail?.entries) desc = entriesArrayToHtml(detail.entries);
    } catch (_) { /* ignore */ }
    const sys = typeof feat === 'string' ? {} : feat.system || {};
    if (!sys.description) sys.description = { value: desc };
    items.push(makeItem(name, 'feat', sys));
  }

  // Infusions as feats
  (state.infusions || []).forEach((inf) => {
    const name = typeof inf === "string" ? inf : inf.name;
    const sys = typeof inf === "string" ? {} : inf.system || {};
    items.push(makeItem(name, "feat", sys));
  });

  // Equipment
  const eqLines = (state.equipment || []).map((e) => (typeof e === 'string' ? e : e.name));
  for (const line of eqLines) {
    for (const parsed of parseEquipmentLine(line)) {
      const enriched = enrichEquipmentEntry(parsed);
      const item = makeItem(enriched.name, enriched.type, enriched.system);
      // Merge Plutonium item details if available (DATA.equipmentDetails)
      try {
        const detailsMap = DATA?.equipmentDetails || {};
        const details = detailsMap[enriched.name];
        if (details && details.system && typeof details.system === 'object') {
          // Shallow merge is sufficient for common cases; enhance as needed
          item.system = { ...item.system, ...details.system };
        }
        if (details?.effects) item.effects = details.effects;
        if (details?.activities) item.activities = details.activities;
        if (details?.img) item.img = details.img;
      } catch (_) { /* ignore */ }
      items.push(item);
    }
  }

  // Race and Class features -------------------------------------------------
  try {
    // Race features from race JSON entries
    if (raceName) {
      const all = Object.values(DATA?.races || {}).flat();
      const entry = all.find((r) => r?.name === raceName);
      const path = entry?.path;
      if (path) {
        const raw = await fetchJsonWithRetry(path, `race at ${path}`);
        (raw?.entries || [])
          .filter((e) => e && e.name && Array.isArray(e.entries))
          .forEach((e) => {
            const html = entriesArrayToHtml(e.entries);
            const feat = makeItem(String(e.name), 'feat', {
              description: { value: html, chat: '' },
              type: { value: 'race', subtype: '' },
              requirements: raceName,
              uses: { max: '', recovery: [], spent: 0 },
              properties: [],
              activities: {},
              advancement: [],
              prerequisites: { items: [], repeatable: false },
            });
            items.push(feat);
          });
      }
    }
  } catch (_) { /* ignore */ }

  try {
    // Class and Subclass feature items up to selected levels
    for (const cls of state.classes || []) {
      const lvl = Number(cls.level) || 1;
      const found = (DATA?.classes || []).find((c) => c?.name === cls.name);
      const addFeatures = (featuresByLevel, prefixName = cls.name) => {
        if (!featuresByLevel) return;
        for (const [levelStr, feats] of Object.entries(featuresByLevel)) {
          const fl = Number(levelStr) || 0;
          if (fl > lvl) continue;
          (feats || []).forEach((f) => {
            const html = f.entries ? entriesArrayToHtml(f.entries) : (f.description ? `<p>${f.description}</p>` : '');
            const feat = makeItem(String(f.name), 'feat', {
              description: { value: html, chat: '' },
              type: { value: 'class', subtype: '' },
              requirements: `${prefixName} ${fl}`,
              uses: { max: '', recovery: [], spent: 0 },
              properties: [],
              activities: {},
              advancement: [],
              prerequisites: { items: [], repeatable: false },
            });
            attachFeatureMechanics(feat, { className: cls.name, classLevels: classLevelMap, featureLevel: fl, abilityMods });
            items.push(feat);
          });
        }
      };
      if (found?.features_by_level) addFeatures(found.features_by_level, cls.name);
      if (cls.subclass) {
        try {
          const sc = await deriveSubclassData(cls.name, cls.subclass);
          if (sc?.features_by_level) addFeatures(sc.features_by_level, `${cls.name} (${cls.subclass})`);
        } catch (_) { /* ignore */ }
      }
    }
  } catch (_) { /* ignore */ }

  // Spells
  const allowedSpellSet = new Set(
    (Array.isArray(DATA.spells) ? DATA.spells : []).map((s) =>
      SPELL_NAME_KEY(typeof s === 'string' ? s : s?.name || s)
    )
  );
  const addSpell = async (name, lvlHint = null, options = {}) => {
    if (allowedSpellSet.size && !allowedSpellSet.has(SPELL_NAME_KEY(name))) return;
    const tryBuild = async () => {
      const ability = options.ability || system.attributes?.spellcasting || '';
      const preparationMode = options.preparationMode || 'prepared';
      const prepared = options.prepared ?? true;
      return buildPlutoniumSpellItem(name, {
        source: options.source || '',
        ability,
        preparationMode,
        prepared,
      });
    };

    let built = null;
    try {
      built = await tryBuild();
    } catch (err) {
      console.warn('Failed to build Plutonium spell', name, err);
    }

    if (built) {
      const item = makeItem(built.name, built.type, built.system, built.img);
      item.effects = built.effects || [];
      item.activities = built.activities || [];
      item.flags = { ...(built.flags || {}) };
      items.push(item);
      return;
    }

    const getLvl = (nm, hint) => {
      if (hint != null) return Number(hint) || 0;
      try {
        const list = globalThis.DATA?.spells;
        if (Array.isArray(list)) {
          const m = list.find(
            (s) => s && String(s.name).toLowerCase() === String(nm).toLowerCase()
          );
          if (m && m.level != null) return Number(m.level) || 0;
        }
      } catch (_) { /* ignore */ }
      return 0;
    };
    const level = getLvl(name, lvlHint);
    items.push(makeItem(name, 'spell', { level, preparation: {} }));
  };

  // From structured knownSpells map (className -> { level: [names] })
  if (state.knownSpells) {
    for (const byLevel of Object.values(state.knownSpells)) {
      for (const [lvl, names] of Object.entries(byLevel)) {
        for (const name of names || []) {
          await addSpell(name, Number(lvl));
        }
      }
    }
  }
  // From cantrips array on system
  for (const name of state.system?.spells?.cantrips || []) {
    await addSpell(name, 0, { preparationMode: 'innate', prepared: true });
  }
  // From race choices
  for (const name of state.raceChoices?.spells || []) {
    await addSpell(name, null);
  }
  // From feats that declare granted spells
  for (const f of state.feats || []) {
    const sp = f?.spells || f?.system?.spells;
    if (!sp) continue;
    for (const value of Object.values(sp)) {
      if (Array.isArray(value)) {
        for (const spellName of value) {
          await addSpell(spellName, null);
        }
      } else if (typeof value === 'string') {
        await addSpell(value, null);
      }
    }
  }

  const actor = {
    name: state.name,
    type: state.type || "character",
    img: state.img || "icons/svg/mystery-man.svg",
    system,
    prototypeToken: {
      name: state.name,
      actorLink: true,
      disposition: 1,
    },
    items,
    flags: {
      fcc: {
        race: state.system?.details?.race || "",
        background: state.system?.details?.background || "",
        bonusAbilities: JSON.parse(JSON.stringify(state.bonusAbilities || {})),
        baseAbilities: JSON.parse(JSON.stringify(state.baseAbilities || {})),
        languages: JSON.parse(
          JSON.stringify(state.system?.traits?.languages?.value || [])
        ),
        raceChoices: JSON.parse(JSON.stringify(state.raceChoices || {})),
        knownSpells: JSON.parse(JSON.stringify(state.knownSpells || {})),
        tools: JSON.parse(JSON.stringify(state.system?.tools || [])),
        skills: JSON.parse(JSON.stringify(state.system?.skills || [])),
        feats: JSON.parse(
          JSON.stringify((state.feats || []).map((f) => f.name || f))
        ),
        ...(state.infusions && state.infusions.length
          ? {
              infusions: JSON.parse(
                JSON.stringify((state.infusions || []).map((i) => i.name || i))
              ),
            }
          : {}),
      },
    },
  };

  validateActor({
    ...actor,
    // Validate minimal structure using the original validator's expectations
    system: state.system || {},
    items: [],
    prototypeToken: actor.prototypeToken,
  });

  return actor;
}
