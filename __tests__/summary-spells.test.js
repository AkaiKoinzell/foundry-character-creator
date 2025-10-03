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
      feats: [
        { name: 'Magic Initiate', spells: { cantrips: ['Prestidigitation'], level1: 'Shield' } },
      ],
      backgroundChoices: { skills: [], tools: [], languages: [], feat: '' },
      raceChoices: { spells: ['Gust of Wind'], spellAbility: '', size: '', alterations: {}, resist: '', tools: [], weapons: [], languages: [], variants: [], skills: [] },
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
        skills: [],
        spells: { cantrips: ['Light'] },
      },
      knownSpells: { Wizard: { 1: ['Magic Missile'] } },
    });
    renderCharacterSheet();
    const html = document.getElementById('characterSheet').innerHTML;
    expect(html).toContain('<h3>Spells</h3>');
    expect(html).toContain('Magic Missile (Class: Wizard)');
    expect(html).toContain('Shield (Feat: Magic Initiate)');
    expect(html).toContain('Light (Class)');
    expect(html).toContain('Gust of Wind (Race)');
    expect(html).toContain('Prestidigitation (Feat: Magic Initiate)');
  });
});
