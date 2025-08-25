import { CharacterState, totalLevel } from '../src/data.js';

describe('totalLevel', () => {
  beforeEach(() => {
    CharacterState.classes = [];
  });

  test('sums levels across multiple classes', () => {
    CharacterState.classes = [
      { name: 'Wizard', level: 3 },
      { name: 'Cleric', level: 2 },
    ];
    expect(totalLevel()).toBe(5);
  });
});
