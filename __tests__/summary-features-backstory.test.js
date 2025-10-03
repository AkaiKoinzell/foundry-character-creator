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
      classes: [
        { name: 'Fighter', level: 1, features: [{ name: 'Second Wind' }] },
      ],
      raceFeatures: ['Darkvision'],
      feats: [{ name: 'Brave' }],
      equipment: [],
      system: {
        details: {
          origin: 'Village',
          backstory: 'Born in a small village.',
          age: '',
          race: '',
          background: '',
        },
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
      backgroundChoices: { skills: [], tools: [], languages: [], feat: '' },
      raceChoices: { spells: [], spellAbility: '', size: '', alterations: {}, resist: '', tools: [], weapons: [], languages: [], skills: [], variants: [] },
    });
    renderCharacterSheet();
    const html = document.getElementById('characterSheet').innerHTML;
    expect(html).toContain('<h3>Features</h3>');
    expect(html).toContain('Brave (Feat)');
    expect(html).toContain('Second Wind (Class: Fighter)');
    expect(html).toContain('Darkvision (Race)');
    expect(html).toContain('<h3>Backstory</h3>');
    expect(html).toContain('Born in a small village.');
  });

  test('race row shows subrace when present', () => {
    document.body.innerHTML = '<div id="characterSheet"></div>';
    Object.assign(CharacterState, {
      playerName: 'Tester',
      name: 'Hero',
      classes: [],
      raceFeatures: [],
      feats: [],
      equipment: [],
      system: {
        details: {
          race: 'Half-Elf',
          subrace: 'Half-Elf (Variant; Drow Descent)',
          origin: '',
          backstory: '',
          age: '',
          background: '',
        },
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
        spells: { cantrips: [] },
      },
      knownSpells: {},
      backgroundChoices: { skills: [], tools: [], languages: [], feat: '' },
      raceChoices: { spells: [], spellAbility: '', size: '', alterations: {}, resist: '', tools: [], weapons: [], languages: [], skills: [], variants: [] },
      infusions: [],
    });
    renderCharacterSheet();
    const raceRow = Array.from(
      document.querySelector('.char-header')?.querySelectorAll('div') || []
    ).find((div) => div.textContent.startsWith('Race:'));
    expect(raceRow?.textContent).toBe('Race: Half-Elf (Variant; Drow Descent)');
  });
});
