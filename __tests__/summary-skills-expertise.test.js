/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/export-pdf.js', () => ({ exportPdf: jest.fn() }));

const { CharacterState } = await import('../src/data.js');
await import('../src/main.js');

describe('renderCharacterSheet skill expertise', () => {
  test('expertise shows two checked boxes', () => {
    document.body.innerHTML = '<div id="characterSheet"></div>';
    Object.assign(CharacterState, {
      playerName: 'Tester',
      name: 'Rogue',
      classes: [],
      feats: [],
      equipment: [],
      system: {
        details: { origin: '', backstory: '', age: '', race: '', background: '' },
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
        skills: ['Stealth'],
        expertise: ['Stealth'],
      },
      knownSpells: {},
    });
    renderCharacterSheet();
    const li = [...document.querySelectorAll('section.skills li')].find(el =>
      el.textContent.includes('Stealth')
    );
    expect(li).toBeTruthy();
    const boxes = li.querySelectorAll('input[type="checkbox"]');
    expect(boxes.length).toBe(2);
    expect(boxes[0].checked).toBe(true);
    expect(boxes[1].checked).toBe(true);
  });
});
