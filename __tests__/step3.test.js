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
    raceChoices: { spells: [], spellAbility: '' },
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

  test('quick successive searches do not render duplicate cards', async () => {
    DATA.races = {
      Elf: [{ name: 'Elf (Eladrin)', path: 'eladrin' }],
      Dwarf: [{ name: 'Dwarf (Hill)', path: 'dwarfHill' }],
    };
    const resolvers = {};
    mockFetch.mockImplementation(
      (p) =>
        new Promise((resolve) => {
          resolvers[p] = resolve;
        })
    );
    const p1 = renderBaseRaces('Elf');
    const p2 = renderBaseRaces('Dwarf');
    resolvers['dwarfHill']({ name: 'Dwarf (Hill)', entries: [] });
    await p2;
    resolvers['eladrin']({ name: 'Elf (Eladrin)', entries: [] });
    await p1;
    const cards = document.querySelectorAll('#raceList .class-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].querySelector('h3').textContent).toBe('Dwarf');
  });
});

describe('race card details toggle', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="raceList"></div>
    `;
    DATA.races = {
      Elf: [{ name: 'Elf', path: 'elfPath' }],
    };
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        name: 'Elf',
        entries: ['A nimble folk.', { name: 'Keen Senses' }],
      })
    );
  });

  test('details are hidden and toggle on click', async () => {
    await renderBaseRaces();
    const card = document.querySelector('#raceList .class-card');
    const details = card.querySelector('.race-details');
    expect(details.classList.contains('hidden')).toBe(true);
    card.querySelector('button').click();
    expect(details.classList.contains('hidden')).toBe(false);
  });
});

describe('Aarakocra selections', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="raceList"></div>
      <div id="raceFeatures"></div>
      <button id="confirmRaceSelection"></button>
    `;
    DATA.races = {
      Aarakocra: [{ name: 'Aarakocra', path: 'aarakocra' }],
    };
    DATA.languages = [];
    const race = {
      name: 'Aarakocra',
      entries: [],
      additionalSpells: [
        { ability: { choose: ['int', 'wis', 'cha'] }, innate: { 3: ['gust of wind'] } },
      ],
      languageProficiencies: [{ common: true, anyStandard: 1 }],
    };
    mockFetch.mockImplementation((p) => {
      if (p === 'aarakocra') return Promise.resolve(race);
      if (p === 'data/languages.json')
        return Promise.resolve({ languages: ['Common', 'Dwarvish'] });
      return Promise.resolve({});
    });
  });

  test('requires ability and language selections', async () => {
    await selectBaseRace('Aarakocra');
    const card = document.querySelector('#raceList .class-card');
    card.click();
    await new Promise((r) => setTimeout(r, 0));
    const btn = document.getElementById('confirmRaceSelection');
    expect(btn.disabled).toBe(true);
    const selects = document.querySelectorAll('#raceFeatures select');
    let langSel, abilitySel;
    selects.forEach((sel) => {
      const vals = [...sel.options].map((o) => o.value);
      if (vals.includes('int') && vals.includes('wis')) abilitySel = sel;
      else langSel = sel;
    });
    abilitySel.value = 'int';
    abilitySel.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    expect(btn.disabled).toBe(true);
    langSel.value = 'Dwarvish';
    langSel.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    expect(btn.disabled).toBe(false);
  });
});

