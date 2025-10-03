// --- Internal helpers ----------------------------------------------------
import { DATA, loadFeatDetails, fetchJsonWithRetry, deriveSubclassData } from './data.js';

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
  return { name: e.name, type, system: sys };
}

export async function exportFoundryActorV13(state) {
  finalizeState(state);
  const system = buildFoundrySystem(state);

  const items = [];
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
  for (const feat of (state.feats || [])) {
    const name = typeof feat === 'string' ? feat : feat.name;
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
      items.push(makeItem(enriched.name, enriched.type, enriched.system));
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
  const addSpell = (name, lvlHint = null) => {
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
    items.push(
      makeItem(name, "spell", { level, preparation: {} })
    );
  };

  // From structured knownSpells map (className -> { level: [names] })
  if (state.knownSpells) {
    Object.values(state.knownSpells).forEach((byLevel) => {
      Object.entries(byLevel).forEach(([lvl, names]) => {
        (names || []).forEach((name) => addSpell(name, Number(lvl)));
      });
    });
  }
  // From cantrips array on system
  (state.system?.spells?.cantrips || []).forEach((name) => addSpell(name, 0));
  // From race choices
  (state.raceChoices?.spells || []).forEach((name) => addSpell(name, null));
  // From feats that declare granted spells
  (state.feats || []).forEach((f) => {
    const sp = f?.spells || f?.system?.spells;
    if (!sp) return;
    Object.values(sp).forEach((v) => {
      if (Array.isArray(v)) v.forEach((n) => addSpell(n, null));
      else if (typeof v === "string") addSpell(v, null);
    });
  });

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
