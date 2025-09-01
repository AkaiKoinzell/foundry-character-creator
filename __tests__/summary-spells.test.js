/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/export-pdf.js', () => ({ exportPdf: jest.fn() }));

const { CharacterState } = await import('../src/data.js');
await import('../src/main.js');

describe('renderCharacterSheet spells', () => {
  test('spells appear in summary', () => {
    document.body.innerHTML = '<div id="characterSheet"></div>';
    Object.assign(CharacterState, {
      playerName: 'Tester',
      name: 'Mage',
      classes: [],
      feats: [],
      equipment: [],
      system: {
        details: { origin: '', age: '', race: '', background: '' },
        abilities: {
          str: { value: 8 },
          dex: { value: 8 },
          con: { value: 8 },
          int: { value: 8 },
          wis: { value: 8 },
          cha: { value: 8 },
        },
        traits: { languages: { value: [] } },
        tools: [],
        skills: [],
      },
      knownSpells: { Wizard: { 0: ['Light'], 1: ['Magic Missile', 'Shield'] } },
    });
    renderCharacterSheet();
    const html = document.getElementById('characterSheet').innerHTML;
    expect(html).toContain('<h3>Spells</h3>');
    expect(html).toContain('Magic Missile');
    expect(html).toContain('Shield');
  });
});
