import { exportFoundryActor } from "../src/export.js";
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
});
