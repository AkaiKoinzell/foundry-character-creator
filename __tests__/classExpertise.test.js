/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/i18n.js', () => ({
  t: (k) => k,
  applyTranslations: jest.fn(),
  initI18n: jest.fn(),
}));

const { updateExpertiseSelectOptions, rebuildFromClasses, refreshBaseState } = await import('../src/step2.js');
const { CharacterState } = await import('../src/data.js');

describe('class expertise', () => {
  beforeEach(() => {
    CharacterState.system.skills = ['Stealth', 'Arcana'];
    CharacterState.system.expertise = ['Stealth'];
    CharacterState.classes = [];
    CharacterState.feats = [];
  });

  test('updateExpertiseSelectOptions limits to proficient skills and disables taken', () => {
    const sel1 = document.createElement('select');
    const sel2 = document.createElement('select');
    updateExpertiseSelectOptions([sel1, sel2]);
    const opts = Array.from(sel1.options).map((o) => o.value);
    expect(opts).toEqual(['', 'Arcana', 'Stealth']);
    expect(sel1.querySelector("option[value='Stealth']").disabled).toBe(true);
    sel2.value = 'Arcana';
    updateExpertiseSelectOptions([sel1, sel2]);
    expect(sel1.querySelector("option[value='Arcana']").disabled).toBe(true);
  });

  test('rebuildFromClasses aggregates expertise', () => {
    CharacterState.system.skills = [];
    CharacterState.system.expertise = [];
    refreshBaseState();
    CharacterState.classes = [{ name: 'Rogue', expertise: [{ id: 'e-1', level: 1, skill: 'Stealth' }], skills: [], choiceSelections: {} }];
    CharacterState.feats = [{ name: 'Feat', expertise: ['Arcana'] }];
    rebuildFromClasses();
    expect(CharacterState.system.expertise.sort()).toEqual(['Arcana', 'Stealth']);
  });
});
