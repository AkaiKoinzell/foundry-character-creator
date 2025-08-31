/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/i18n.js', () => ({ t: (k) => k }));

const CharacterState = { feats: [] };
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
  loadFeatDetails: async () => ({
    weaponProficiencies: [
      { choose: { fromFilter: 'type=martial weapon|miscellaneous=mundane', count: 4 } },
    ],
    entries: [],
  }),
  loadSpells: async () => {},
  loadOptionalFeatures: async () => {},
  logCharacterState: jest.fn(),
}));

const { renderFeatChoices } = await import('../src/feat.js');

describe('feat weapon proficiencies', () => {
  beforeEach(() => {
    CharacterState.feats = [];
  });

  test('selects unique weapons and applies', async () => {
    const div = document.createElement('div');
    const renderer = await renderFeatChoices('Weapon Master', div, () => {});
    expect(renderer.weaponSelects.length).toBe(4);
    renderer.weaponSelects[0].value = 'Longsword';
    renderer.weaponSelects[0].dispatchEvent(new Event('change'));
    const opts2 = Array.from(renderer.weaponSelects[1].options).map((o) => o.value);
    expect(opts2).not.toContain('Longsword');
    renderer.weaponSelects[1].value = 'Shortsword';
    renderer.weaponSelects[1].dispatchEvent(new Event('change'));
    renderer.weaponSelects[2].value = 'Battleaxe';
    renderer.weaponSelects[2].dispatchEvent(new Event('change'));
    renderer.weaponSelects[3].value = 'Trident';
    renderer.weaponSelects[3].dispatchEvent(new Event('change'));
    expect(renderer.isComplete()).toBe(true);
    renderer.apply();
    expect(CharacterState.feats[0].weapons).toEqual([
      'Longsword',
      'Shortsword',
      'Battleaxe',
      'Trident',
    ]);
  });
});
