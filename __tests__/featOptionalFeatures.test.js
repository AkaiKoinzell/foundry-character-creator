/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/i18n.js', () => ({ t: (k) => k }));

const CharacterState = { feats: [] };
const DATA = { optionalFeatures: { TEST: ['OptA', 'OptB'] } };

jest.unstable_mockModule('../src/data.js', () => ({
  CharacterState,
  DATA,
  loadFeatDetails: async () => ({
    optionalfeatureProgression: [
      { name: 'Test', featureType: ['TEST'], progression: { '*': 1 } },
    ],
    entries: [],
  }),
  loadSpells: async () => {},
  loadOptionalFeatures: async () => {},
  logCharacterState: jest.fn(),
  loadEquipment: jest.fn(),
}));
jest.unstable_mockModule('../src/step5.js', () => ({
  loadEquipmentData: jest.fn().mockResolvedValue([]),
}));

const { renderFeatChoices } = await import('../src/feat.js');

describe('feat optional features', () => {
  beforeEach(() => {
    CharacterState.feats = [];
  });

  test('requires selection and saves to CharacterState', async () => {
    const div = document.createElement('div');
    const renderer = await renderFeatChoices('TestFeat', div, () => {});
    expect(renderer.optionalFeatureSelects.length).toBe(1);
    expect(renderer.isComplete()).toBe(false);
    const sel = renderer.optionalFeatureSelects[0];
    sel.value = 'OptB';
    expect(renderer.isComplete()).toBe(true);
    renderer.apply();
    expect(CharacterState.feats[0].optionalFeatures).toEqual(['OptB']);
  });
});
