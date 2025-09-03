/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/i18n.js', () => ({ t: (k) => k }));

const CharacterState = { feats: [], system: { weapons: [] } };
const DATA = {
  equipment: [
    { name: 'Longsword', type: 'martial weapon', miscellaneous: 'mundane' },
    { name: 'Shortsword', type: 'martial weapon', miscellaneous: 'mundane' },
    { name: 'Battleaxe', type: 'martial weapon', miscellaneous: 'mundane' },
    { name: 'Trident', type: 'martial weapon', miscellaneous: 'mundane' },
    { name: 'Magic Blaster', type: 'firearm', miscellaneous: 'magical' },
  ],
};

jest.unstable_mockModule('../src/data.js', () => ({
  CharacterState,
  DATA,
  loadFeatDetails: async () => ({}),
  loadSpells: async () => {},
  loadOptionalFeatures: async () => {},
  logCharacterState: jest.fn(),
}));
jest.unstable_mockModule('../src/step5.js', () => ({
  loadEquipmentData: jest.fn().mockResolvedValue(DATA.equipment),
}));

const { renderWeaponChoices } = await import('../src/feat.js');

describe('renderWeaponChoices', () => {
  test('selects unique weapons', () => {
    const div = document.createElement('div');
    const feat = {
      weaponProficiencies: [
        {
          choose: {
            fromFilter: 'type=martial weapon|miscellaneous=mundane',
            count: 4,
          },
        },
      ],
    };
    const { weaponSelects } = await renderWeaponChoices(feat, div, () => {});
    expect(weaponSelects.length).toBe(4);
    weaponSelects[0].value = 'Longsword';
    weaponSelects[0].dispatchEvent(new Event('change'));
    const opts2 = Array.from(weaponSelects[1].options).map((o) => o.value);
    expect(opts2).not.toContain('Longsword');
  });
});

