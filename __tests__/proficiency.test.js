import { CharacterState, updateProficiencyBonus } from '../src/data.js';

describe('updateProficiencyBonus', () => {
  beforeEach(() => {
    CharacterState.classes = [];
    CharacterState.system.attributes.prof = 0;
  });

  test.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [12, 4],
    [13, 5],
    [16, 5],
    [17, 6],
    [20, 6],
  ])('total level %i results in prof %i', (lvl, expected) => {
    CharacterState.classes = [{ level: lvl }];
    updateProficiencyBonus();
    expect(CharacterState.system.attributes.prof).toBe(expected);
  });

  test('uses sum of multiclass levels', () => {
    CharacterState.classes = [
      { level: 2 },
      { level: 3 },
    ];
    updateProficiencyBonus();
    expect(CharacterState.system.attributes.prof).toBe(3);
  });
});
