/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/i18n.js', () => ({ t: (k) => k }));

const CharacterState = {
  system: {
    abilities: {
      str: { value: 10 },
      dex: { value: 10 },
      int: { value: 10 },
    },
    attributes: {},
  },
  bonusAbilities: { str: 0, dex: 0, int: 0 },
  baseAbilities: { str: 10, dex: 10, int: 10 },
};
const DATA = {};

jest.unstable_mockModule('../src/data.js', () => ({
  CharacterState,
  DATA,
  loadFeatDetails: async () => ({}),
  loadSpells: async () => {},
  loadOptionalFeatures: async () => {},
  logCharacterState: jest.fn(),
}));

const { renderAbilityBonuses } = await import('../src/feat.js');

describe('renderAbilityBonuses', () => {
  test('renders selects and applies fixed bonuses', () => {
    const div = document.createElement('div');
    const feat = {
      ability: [{ choose: { from: ['str', 'int'] } }, { dex: 1 }],
    };
    const { abilitySelects, fixedAbilityBonuses } = renderAbilityBonuses(
      feat,
      div,
      () => {}
    );
    expect(abilitySelects.length).toBe(1);
    expect(fixedAbilityBonuses).toEqual({ dex: 1 });
    expect(CharacterState.bonusAbilities.dex).toBe(1);
    expect(CharacterState.system.abilities.dex.value).toBe(11);
  });
});

