import { exportFoundryActor, exportFoundryActorV13 } from "../src/export.js";
import fs from "fs";

const template = JSON.parse(
  fs.readFileSync(new URL("./fixtures/sample-actor.json", import.meta.url))
);

describe("exportFoundryActor", () => {
  test("matches sample template", () => {
    const state = {
      playerName: "Alice",
      name: "Hero",
      type: "character",
      classes: [{ name: "Fighter", level: 1 }],
      feats: ["Lucky"],
      equipment: [{ name: "Dagger", type: "weapon" }],
      baseAbilities: {
        str: 8,
        dex: 8,
        con: 8,
        int: 8,
        wis: 8,
        cha: 8,
      },
      bonusAbilities: {
        str: 2,
        dex: 2,
        con: 2,
        int: 2,
        wis: 2,
        cha: 2,
      },
      backgroundChoices: { skills: [], tools: [], languages: [], feat: '' },
      raceChoices: { spells: [], spellAbility: "", size: "", alterations: {}, resist: "", tools: [], weapons: [], languages: [], skills: [], variants: [] },
      knownSpells: {},
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
          hp: { value: 10, max: 10 },
          init: { value: 0 },
          prof: 0,
          movement: { walk: 30 },
        },
        details: { background: "Sage", race: "Elf", alignment: "", origin: "Earth", age: 30 },
        traits: {
          size: "med",
          senses: { darkvision: 0 },
          languages: { value: ["Common", "Elvish"] },
        },
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
      prototypeToken: { name: "", actorLink: true, disposition: 1 },
    };

    const exported = exportFoundryActor(state);
    expect(exported).toEqual(template);
  });

  test("exports tools, skills, and feats in flags", () => {
    const state = {
      playerName: "Bob",
      name: "Tester",
      type: "character",
      feats: [{ name: "Alert" }, "Lucky"],
      system: {
        abilities: {},
        tools: ["Thieves' Tools"],
        skills: ["Stealth"],
        attributes: {},
        spells: {},
        traits: { languages: { value: [] } },
        details: {},
      },
      baseAbilities: {},
      bonusAbilities: {},
      prototypeToken: {},
    };

    const exported = exportFoundryActor(state);
    expect(exported.flags.fcc.tools).toEqual(["Thieves' Tools"]);
    expect(exported.flags.fcc.skills).toEqual(["Stealth"]);
    expect(exported.flags.fcc.feats).toEqual(["Alert", "Lucky"]);
  });

  test("exports infusions in flags and items", () => {
    const state = {
      playerName: "Bob",
      name: "Tester",
      type: "character",
      infusions: ["Enhanced Defense"],
      system: {
        abilities: {},
        tools: [],
        skills: [],
        attributes: {},
        spells: {},
        traits: { languages: { value: [] } },
        details: {},
      },
      baseAbilities: {},
      bonusAbilities: {},
      prototypeToken: {},
    };

    const exported = exportFoundryActor(state);
    expect(exported.flags.fcc.infusions).toEqual(["Enhanced Defense"]);
    expect(
      exported.items.find(
        (i) => i.name === "Enhanced Defense" && i.type === "feat"
      )
    ).toBeTruthy();
  });

  test("exportFoundryActorV13 preserves spell slots, movement, and hp", async () => {
    const baseAbility = (value = 10) => ({ value });
    const state = {
      playerName: "Alice",
      name: "Arcane Hero",
      type: "character",
      classes: [
        { name: "Wizard", level: 5 },
        { name: "Warlock", level: 3 },
      ],
      feats: [],
      equipment: [],
      knownSpells: {},
      baseAbilities: {
        str: 10,
        dex: 11,
        con: 12,
        int: 17,
        wis: 13,
        cha: 14,
      },
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
          str: baseAbility(10),
          dex: baseAbility(11),
          con: baseAbility(12),
          int: baseAbility(17),
          wis: baseAbility(13),
          cha: baseAbility(14),
        },
        skills: [],
        expertise: [],
        tools: [],
        details: {
          background: "Sage",
          race: "High Elf",
          backstory: "",
        },
        traits: {
          languages: { value: ["Common", "Elvish"] },
        },
        currency: {},
        attributes: {
          hp: { value: 12, max: 18, temp: 1, tempmax: 2, bonuses: { hitDice: "+1" } },
          movement: { walk: 30, fly: 40, swim: 20, units: "ft", hover: true },
          spellcasting: "int",
        },
        spells: {
          cantrips: ["Fire Bolt"],
          spell1: { value: 3, max: 4 },
          spell2: { value: 2, max: 3 },
          pact: { value: 2, max: 2, level: 2 },
        },
      },
      prototypeToken: { name: "Arcane Hero", actorLink: true, disposition: 1 },
    };

    const actor = await exportFoundryActorV13(state);

    expect(actor.system.spells.spell1).toMatchObject({ value: 3, max: 4 });
    expect(actor.system.spells.spell2).toMatchObject({ value: 2, max: 3 });
    expect(actor.system.spells.pact).toMatchObject({ value: 2, max: 2, level: 2 });

    expect(actor.system.attributes.movement.walk).toBe(30);
    expect(actor.system.attributes.movement.fly).toBe(40);
    expect(actor.system.attributes.movement.swim).toBe(20);
    expect(actor.system.attributes.movement.units).toBe("ft");
    expect(actor.system.attributes.movement.hover).toBe(true);

    expect(actor.system.attributes.hp.value).toBe(12);
    expect(actor.system.attributes.hp.max).toBe(18);
    expect(actor.system.attributes.hp.temp).toBe(1);
    expect(actor.system.attributes.hp.tempmax).toBe(2);
    expect(actor.system.attributes.hp.bonuses).toEqual({ hitDice: "+1" });
  });
});
