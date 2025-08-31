/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/i18n.js', () => ({ t: (k) => k }));

const CharacterState = { system: { attributes: { saves: ['dex'] } }, feats: [] };
const DATA = {};

jest.unstable_mockModule('../src/data.js', () => ({
  CharacterState,
  DATA,
  loadFeatDetails: async () => ({
    savingThrowProficiencies: [
      { choose: { from: ['str', 'dex'] } },
    ],
    entries: [],
  }),
  loadSpells: async () => {},
  loadOptionalFeatures: async () => {},
  logCharacterState: jest.fn(),
}));

const { renderFeatChoices } = await import('../src/feat.js');

describe('feat saving throw proficiencies', () => {
  beforeEach(() => {
    CharacterState.system.attributes.saves = ['dex'];
    CharacterState.feats = [];
  });

  test('selects and applies save proficiency', async () => {
    const div = document.createElement('div');
    const renderer = await renderFeatChoices('TestFeat', div, () => {});
    expect(renderer.saveSelects.length).toBe(1);
    const sel = renderer.saveSelects[0];
    const opts = Array.from(sel.options).map((o) => o.value);
    expect(opts).toContain('str');
    expect(opts).not.toContain('dex');
    expect(renderer.isComplete()).toBe(false);
    sel.value = 'str';
    expect(renderer.isComplete()).toBe(true);
    renderer.apply();
    expect(CharacterState.system.attributes.saves).toContain('str');
  });
});
