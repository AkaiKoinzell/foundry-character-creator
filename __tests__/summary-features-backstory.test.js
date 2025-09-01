/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/export-pdf.js', () => ({ exportPdf: jest.fn() }));

const { CharacterState } = await import('../src/data.js');
await import('../src/main.js');

describe('renderCharacterSheet features and backstory', () => {
  test('features and backstory appear in summary', () => {
    document.body.innerHTML = '<div id="characterSheet"></div>';
    Object.assign(CharacterState, {
      playerName: 'Tester',
      name: 'Hero',
      classes: [],
      feats: [{ name: 'Brave' }],
      equipment: [],
      system: {
        details: { origin: 'Born in a small village.', age: '', race: '', background: '' },
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
      knownSpells: {},
    });
    renderCharacterSheet();
    const html = document.getElementById('characterSheet').innerHTML;
    expect(html).toContain('<h3>Features</h3>');
    expect(html).toContain('Brave');
    expect(html).toContain('<h3>Backstory</h3>');
    expect(html).toContain('Born in a small village.');
  });
});
