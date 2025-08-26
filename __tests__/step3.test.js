/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

const mockFetch = jest.fn();
const mockLoadRaces = jest.fn().mockResolvedValue();

jest.unstable_mockModule('../src/data.js', () => ({
  DATA: { races: {}, languages: [] },
  CharacterState: {
    system: {
      spells: { cantrips: [] },
      details: {},
      traits: { languages: { value: [] } },
      attributes: {},
    },
    raceChoices: { spells: [] },
  },
  fetchJsonWithRetry: mockFetch,
  loadRaces: mockLoadRaces,
  logCharacterState: jest.fn(),
  loadClasses: jest.fn(),
  adjustResource: jest.fn(),
  updateSpellSlots: jest.fn(),
  loadBackgrounds: jest.fn(),
}));

jest.unstable_mockModule('../src/step2.js', () => ({
  refreshBaseState: jest.fn(),
  rebuildFromClasses: jest.fn(),
  updateChoiceSelectOptions: jest.fn(),
  loadStep2: jest.fn(),
}));

const { renderBaseRaces, selectBaseRace } = await import('../src/step3.js');
const { DATA } = await import('../src/data.js');

describe('race search behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="raceSearch" />
      <div id="raceList"></div>
      <div id="raceFeatures"></div>
      <button id="changeRace"></button>
    `;
    DATA.races = {
      Elf: [
        { name: 'Elf (Eladrin)', path: 'eladrin' },
        { name: 'Elf (Wood)', path: 'wood' },
      ],
      Dwarf: [{ name: 'Dwarf (Hill)', path: 'dwarfHill' }],
    };
    const raceData = {
      eladrin: { name: 'Elf (Eladrin)', entries: [] },
      wood: { name: 'Elf (Wood)', entries: [] },
      dwarfHill: { name: 'Dwarf (Hill)', entries: [] },
    };
    mockFetch.mockImplementation((p) => Promise.resolve(raceData[p]));
  });

  test('search term matches subrace and shows base race card', async () => {
    await renderBaseRaces('Eladrin');
    const cards = document.querySelectorAll('#raceList .class-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].querySelector('h3').textContent).toBe('Elf');
  });

  test('selecting base race clears search and shows all subraces', async () => {
    const search = document.getElementById('raceSearch');
    search.value = 'Eladrin';
    await selectBaseRace('Elf');
    expect(search.value).toBe('');
    const cards = document.querySelectorAll('#raceList .class-card');
    const names = [...cards].map((c) => c.querySelector('h3').textContent);
    expect(names).toEqual(
      expect.arrayContaining(['Elf (Eladrin)', 'Elf (Wood)'])
    );
  });
});

