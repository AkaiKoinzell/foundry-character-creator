// --- Internal helpers ----------------------------------------------------

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
    const name = typeof inf === "string" ? inf : inf.name;
    const system = typeof inf === "string" ? {} : inf.system || {};
    actor.items.push({ name, type: "feat", system });
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
