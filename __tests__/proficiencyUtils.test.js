/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

const mockState = {
  system: {
    skills: [],
    tools: [],
    traits: { languages: { value: [] } },
    spells: { cantrips: [] },
  },
  feats: [],
};

jest.unstable_mockModule('../src/data.js', () => ({
  DATA: { languages: [], feats: [] },
  CharacterState: mockState,
  logCharacterState: jest.fn(),
  loadSpells: jest.fn(),
  fetchJsonWithRetry: jest.fn(),
  loadEquipment: jest.fn(),
}));
jest.unstable_mockModule('../src/step5.js', () => ({
  loadEquipmentData: jest.fn().mockResolvedValue([]),
}));

const {
  addUniqueProficiency,
  pendingReplacements,
  getAllOptions,
} = await import('../src/proficiency.js');
const { CharacterState, DATA } = await import('../src/data.js');

describe('addUniqueProficiency and pendingReplacements', () => {
  beforeEach(() => {
    CharacterState.system.skills = [];
    CharacterState.feats = [];
  });

  test('returns null when proficiency added normally', () => {
    const container = document.createElement('div');
    const res = addUniqueProficiency('skills', 'Stealth', container);
    expect(res).toBeNull();
    expect(CharacterState.system.skills).toContain('Stealth');
    expect(pendingReplacements('skills')).toBe(0);
  });

  test('tracks pending replacements when duplicate', () => {
    CharacterState.system.skills = ['Stealth'];
    const container = document.createElement('div');
    const sel = addUniqueProficiency('skills', 'Stealth', container);
    expect(sel).not.toBeNull();
    expect(pendingReplacements('skills')).toBe(1);
    sel.value = 'Arcana';
    sel.dispatchEvent(new Event('change'));
    expect(CharacterState.system.skills).toEqual(
      expect.arrayContaining(['Stealth', 'Arcana'])
    );
    expect(pendingReplacements('skills')).toBe(0);
  });
});

test('getAllOptions supplies feats and instruments', () => {
  DATA.feats = ['Lucky'];
  expect(getAllOptions('feats')).toEqual(['Lucky']);
  expect(getAllOptions('instruments')).toContain('Lute');
});
