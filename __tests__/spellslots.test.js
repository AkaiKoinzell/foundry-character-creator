import { CharacterState, updateSpellSlots } from "../src/data.js";

describe("updateSpellSlots", () => {
  beforeEach(() => {
    CharacterState.classes = [];
    CharacterState.system.spells.pact.value = 0;
    CharacterState.system.spells.pact.max = 0;
    CharacterState.system.spells.pact.level = 0;
  });

  test("sets pact level for warlock", () => {
    CharacterState.classes = [{ name: "Warlock", level: 5 }];
    updateSpellSlots();
    expect(CharacterState.system.spells.pact.level).toBe(3);
    expect(CharacterState.system.spells.pact.max).toBe(2);
  });
});
