/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/data.js', () => {
  const CharacterState = {
    classes: [],
    feats: [],
    system: {
      abilities: {
        str: { value: 8 },
        dex: { value: 8 },
        con: { value: 8 },
        int: { value: 8 },
        wis: { value: 8 },
        cha: { value: 8 },
      },
      skills: [],
      tools: [],
      traits: { languages: { value: [] } },
      spells: { cantrips: [] },
      attributes: { prof: 2 },
    },
  };
  return {
    DATA: { classes: [{ name: 'Fighter', description: '' }], feats: [] },
    CharacterState,
    loadClasses: jest.fn().mockResolvedValue(),
    loadFeats: jest.fn().mockResolvedValue(),
    logCharacterState: jest.fn(),
    totalLevel: () => CharacterState.classes.reduce((s, c) => s + c.level, 0),
    updateSpellSlots: jest.fn(),
    updateProficiencyBonus: jest.fn(),
    MAX_CHARACTER_LEVEL: 20,
  };
});

const { loadStep2 } = await import('../src/step2.js');
const { CharacterState } = await import('../src/data.js');

describe('class search visibility', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="classSearch" class="form-control" />
      <div id="classList" class="class-list"></div>
      <div id="selectedClasses"></div>
    `;
    CharacterState.classes = [];
  });

  test('search bar visible with no classes selected', async () => {
    await loadStep2(true);
    expect(
      document.getElementById('classSearch').classList.contains('hidden')
    ).toBe(false);
  });

  test('search bar hidden after class selected', async () => {
    await loadStep2(true);
    CharacterState.classes = [{ name: 'Fighter', level: 1 }];
    await loadStep2(false);
    expect(
      document.getElementById('classSearch').classList.contains('hidden')
    ).toBe(true);
  });
});
