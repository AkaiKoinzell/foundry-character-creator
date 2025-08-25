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

  test('pools spell slots for multiclass casters', () => {
    CharacterState.classes = [
      { name: 'Wizard', level: 3 },
      { name: 'Cleric', level: 2 },
    ];
    for (let i = 1; i <= 9; i++) {
      const key = `spell${i}`;
      CharacterState.system.spells[key].value = 0;
      CharacterState.system.spells[key].max = 0;
    }
    updateSpellSlots();
    expect(CharacterState.system.spells.spell1.max).toBe(4);
    expect(CharacterState.system.spells.spell2.max).toBe(3);
    expect(CharacterState.system.spells.spell3.max).toBe(2);
  });
});
