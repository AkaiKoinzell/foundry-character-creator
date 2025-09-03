/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/i18n.js', () => ({ t: (k) => k }));

const CharacterState = { system: {}, feats: [] };
const DATA = {};

jest.unstable_mockModule('../src/data.js', () => ({
  CharacterState,
  DATA,
  loadFeatDetails: async () => ({}),
  loadSpells: async () => {},
  loadOptionalFeatures: async () => {},
  logCharacterState: jest.fn(),
}));
jest.unstable_mockModule('../src/step5.js', () => ({
  loadEquipmentData: jest.fn().mockResolvedValue([]),
}));

const { renderProficiencyChoices } = await import('../src/feat.js');

describe('renderProficiencyChoices', () => {
  beforeEach(() => {
    CharacterState.system = { attributes: { saves: ['dex'] }, skills: ['Stealth'] };
    CharacterState.feats = [];
  });

  test('handles saving throw selection', () => {
    const div = document.createElement('div');
    const feat = { savingThrowProficiencies: [{ choose: { from: ['str', 'dex'] } }] };
    const { saveSelects } = renderProficiencyChoices(feat, div, () => {});
    expect(saveSelects.length).toBe(1);
    const sel = saveSelects[0];
    const opts = Array.from(sel.options).map((o) => o.value);
    expect(opts).toContain('str');
    expect(opts).not.toContain('dex');
  });

  test('updates expertise options based on skill selection', () => {
    const div = document.createElement('div');
    const feat = {
      skillProficiencies: [{ choose: { from: ['arcana', 'acrobatics'] } }],
      expertise: [{ anyProficientSkill: 1 }],
    };
    const { skillSelects, expertiseSelects } = renderProficiencyChoices(
      feat,
      div,
      () => {}
    );
    expect(skillSelects.length).toBe(1);
    expect(expertiseSelects.length).toBe(1);
    let opts = Array.from(expertiseSelects[0].options).map((o) => o.value);
    expect(opts).toContain('Stealth');
    expect(opts).not.toContain('Arcana');

    skillSelects[0].value = 'arcana';
    skillSelects[0].dispatchEvent(new Event('change'));
    opts = Array.from(expertiseSelects[0].options).map((o) => o.value);
    expect(opts).toContain('Arcana');
  });
});

