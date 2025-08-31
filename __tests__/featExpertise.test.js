/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/i18n.js', () => ({ t: (k) => k }));

const CharacterState = { system: { skills: ['Stealth'] }, feats: [] };
const DATA = {};

jest.unstable_mockModule('../src/data.js', () => ({
  CharacterState,
  DATA,
  loadFeatDetails: async () => ({
    skillProficiencies: [{ choose: { from: ['arcana', 'acrobatics'] } }],
    expertise: [{ anyProficientSkill: 1 }],
    entries: [],
  }),
  loadSpells: async () => {},
  loadOptionalFeatures: async () => {},
  logCharacterState: jest.fn(),
}));

const { renderFeatChoices } = await import('../src/feat.js');

describe('feat expertise', () => {
  beforeEach(() => {
    CharacterState.system.skills = ['Stealth'];
    CharacterState.feats = [];
  });

  test('limits expertise to proficient skills and applies selection', async () => {
    const div = document.createElement('div');
    const renderer = await renderFeatChoices('Skill Expert', div, () => {});
    expect(renderer.skillSelects.length).toBe(1);
    expect(renderer.expertiseSelects.length).toBe(1);

    let opts = Array.from(renderer.expertiseSelects[0].options).map((o) => o.value);
    expect(opts).toContain('Stealth');
    expect(opts).not.toContain('Arcana');

    renderer.skillSelects[0].value = 'arcana';
    renderer.skillSelects[0].dispatchEvent(new Event('change'));
    opts = Array.from(renderer.expertiseSelects[0].options).map((o) => o.value);
    expect(opts).toContain('Arcana');

    renderer.expertiseSelects[0].value = 'Arcana';
    expect(renderer.isComplete()).toBe(true);
    renderer.apply();
    expect(CharacterState.feats[0].expertise).toEqual(['Arcana']);
    expect(CharacterState.system.skills).toContain('Arcana');
  });
});

