import { exportFoundryActor } from "../src/export.js";
import fs from "fs";

const template = JSON.parse(
  fs.readFileSync(new URL("./fixtures/sample-actor.json", import.meta.url))
);

describe("exportFoundryActor", () => {
  test("matches sample template", () => {
    const state = {
      name: "Hero",
      type: "character",
      classes: [{ name: "Fighter", level: 1 }],
      feats: ["Lucky"],
      equipment: [{ name: "Dagger", type: "weapon" }],
      system: {
        abilities: {
          str: { value: 10 },
          dex: { value: 10 },
          con: { value: 10 },
          int: { value: 10 },
          wis: { value: 10 },
          cha: { value: 10 },
        },
        skills: [],
        currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
        attributes: {
          ac: 10,
          hp: { value: 10, max: 10 },
          init: { value: 0 },
          prof: 2,
          movement: { walk: 30 },
        },
        details: { background: "", race: "", alignment: "" },
        traits: {
          size: "med",
          senses: { darkvision: 0 },
          languages: { value: [] },
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
});
