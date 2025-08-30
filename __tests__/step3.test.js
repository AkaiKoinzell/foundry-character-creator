/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

const mockFetch = jest.fn();
const mockLoadRaces = jest.fn().mockResolvedValue();
const mockShowStep = jest.fn();

jest.unstable_mockModule('../src/data.js', () => ({
  DATA: { races: {}, languages: [] },
  CharacterState: {
    system: {
      spells: { cantrips: [] },
      details: {},
      traits: { languages: { value: [] } },
      attributes: {},
      skills: [],
      tools: [],
      abilities: {
        str: { value: 8 },
        dex: { value: 8 },
        con: { value: 8 },
        int: { value: 8 },
        wis: { value: 8 },
        cha: { value: 8 },
      },
    },
    raceChoices: { spells: [], spellAbility: '', size: '' },
    bonusAbilities: {
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0,
    },
  },
  fetchJsonWithRetry: mockFetch,
  loadRaces: mockLoadRaces,
  logCharacterState: jest.fn(),
  loadClasses: jest.fn(),
  adjustResource: jest.fn(),
  updateSpellSlots: jest.fn(),
  loadBackgrounds: jest.fn(),
  loadSpells: jest.fn(),
}));

jest.unstable_mockModule('../src/step2.js', () => ({
  refreshBaseState: jest.fn(),
  rebuildFromClasses: jest.fn(),
  updateChoiceSelectOptions: jest.fn(),
  loadStep2: jest.fn(),
}));

jest.unstable_mockModule('../src/main.js', () => ({
  showStep: mockShowStep,
}));

const {
  renderBaseRaces,
  selectBaseRace,
  confirmStep,
  loadStep3,
  isStepComplete,
} = await import('../src/step3.js');
const { DATA, CharacterState } = await import('../src/data.js');
const { refreshBaseState, rebuildFromClasses } = await import('../src/step2.js');

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
    expect(cards[0].querySelector('h3').textContent).toBe('Elf (2)');
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
    expect(cards[0].querySelector('h3').textContent).toBe('Dwarf (1)');
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

describe('race size selection', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="raceList"></div>
      <div id="raceFeatures"></div>
      <button id="confirmRaceSelection"></button>
    `;
    DATA.races = {
      Sprite: [{ name: 'Sprite', path: 'sprite' }],
    };
    const race = { name: 'Sprite', entries: [], size: ['S', 'M'] };
    mockFetch.mockImplementation(() => Promise.resolve(race));
  });

  afterEach(() => {
    CharacterState.system.details = {};
    CharacterState.raceChoices = { spells: [], spellAbility: '', size: '' };
  });

  test('requires selecting size when multiple options', async () => {
    await selectBaseRace('Sprite');
    const card = document.querySelector('#raceList .class-card');
    card.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(await confirmStep()).toBe(false);
    const sel = document.querySelector('#raceFeatures select');
    sel.value = 'S';
    sel.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    expect(await confirmStep()).toBe(true);
    expect(CharacterState.system.traits.size).toBe('sm');
    expect(CharacterState.raceChoices.size).toBe('sm');
  });
});

describe('Aarakocra selections', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="raceList"></div>
      <div id="raceFeatures"></div>
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
    expect(await confirmStep()).toBe(false);
    const selects = document.querySelectorAll('#raceFeatures select');
    let langSel, abilitySel;
    selects.forEach((sel) => {
      const vals = [...sel.options].map((o) => o.value);
      if (vals.includes('int') && vals.includes('wis')) abilitySel = sel;
      else langSel = sel;
    });
    abilitySel.value = 'int';
    abilitySel.dispatchEvent(new Event('change'));
    langSel.value = 'Dwarvish';
    langSel.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    expect(await confirmStep()).toBe(true);
    expect(isStepComplete()).toBe(true);
  });
});

describe('High Elf cantrip choices', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="raceList"></div>
      <div id="raceFeatures"></div>
      <button id="confirmRaceSelection"></button>
    `;
    DATA.races = {
      Elf: [{ name: 'Elf (High)', path: 'elfHigh' }],
    };
    DATA.spells = [
      {
        name: 'Fire Bolt',
        level: 0,
        school: 'Evocation',
        spell_list: ['Wizard', 'Sorcerer'],
      },
      {
        name: 'Sacred Flame',
        level: 0,
        school: 'Evocation',
        spell_list: ['Cleric'],
      },
      {
        name: 'Mage Hand',
        level: 0,
        school: 'Conjuration',
        spell_list: ['Wizard'],
      },
      {
        name: 'Magic Missile',
        level: 1,
        school: 'Evocation',
        spell_list: ['Wizard'],
      },
    ];
    const race = {
      name: 'Elf (High)',
      entries: [],
      additionalSpells: [
        { ability: 'int', known: { 1: { _: [{ choose: 'level=0|class=Wizard' }] } } },
      ],
    };
    mockFetch.mockImplementation((p) => {
      if (p === 'elfHigh') return Promise.resolve(race);
      return Promise.resolve({});
    });
  });

  test('only wizard cantrips are offered', async () => {
    await selectBaseRace('Elf');
    const card = document.querySelector('#raceList .class-card');
    card.click();
    await new Promise((r) => setTimeout(r, 0));
    const sel = document.querySelector('#raceFeatures select');
    const values = [...sel.options].map((o) => o.value).filter((v) => v);
    expect(values).toEqual(['Fire Bolt', 'Mage Hand']);
  });
});

describe('cantrip selection persistence', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="raceList"></div>
      <div id="raceFeatures"></div>
      <button id="confirmRaceSelection"></button>
    `;
    DATA.races = {
      Elf: [{ name: 'Elf (High)', path: 'elfHigh' }],
    };
    DATA.spells = [
      {
        name: 'Fire Bolt',
        level: 0,
        school: 'Evocation',
        spell_list: ['Wizard'],
      },
      {
        name: 'Mage Hand',
        level: 0,
        school: 'Conjuration',
        spell_list: ['Wizard'],
      },
    ];
    const race = {
      name: 'Elf (High)',
      entries: [],
      additionalSpells: [
        { choose: 'level=0|class=Wizard' },
        { choose: 'level=0|class=Wizard' },
      ],
    };
    mockFetch.mockImplementation((p) => {
      if (p === 'elfHigh') return Promise.resolve(race);
      return Promise.resolve({});
    });
  });

  test('selecting multiple cantrips retains earlier selections', async () => {
    await selectBaseRace('Elf');
    const card = document.querySelector('#raceList .class-card');
    card.click();
    await new Promise((r) => setTimeout(r, 0));
    const selects = document.querySelectorAll('#raceFeatures select');
    const [sel1, sel2] = selects;
    sel1.value = 'Fire Bolt';
    sel1.dispatchEvent(new Event('change'));
    sel2.value = 'Mage Hand';
    sel2.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    expect(sel1.value).toBe('Fire Bolt');
    expect(sel2.value).toBe('Mage Hand');
  });
});

describe('duplicate proficiency replacement', () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="raceList"></div>
      <div id="raceFeatures"></div>
      <div id="raceTraits"></div>
    `;
    DATA.races = {
      Elf: [{ name: 'Elf (High)', path: 'elfHigh' }],
    };
    DATA.languages = ['Common', 'Dwarvish'];
    CharacterState.system.details = {};
    CharacterState.raceChoices = { spells: [], spellAbility: '', size: '' };
    CharacterState.system.traits.languages.value = ['Elvish'];
    const race = {
      name: 'Elf (High)',
      entries: [],
      languageProficiencies: [{ elvish: true }],
    };
    mockFetch.mockImplementation((p) => Promise.resolve(race));
    await selectBaseRace('Elf');
    document.querySelector('#raceList .class-card').click();
    await new Promise((r) => setTimeout(r, 0));
  });

  test('waits for replacement selections before proceeding', () => {
    expect(confirmStep()).toBe(false);
    const repl = document.querySelector('#raceTraits select');
    expect(repl).toBeTruthy();
    expect(isStepComplete()).toBe(false);
    repl.value = 'Common';
    repl.dispatchEvent(new Event('change'));
    expect(isStepComplete()).toBe(true);
  });
});

describe('change race cleanup', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    document.body.innerHTML = `
      <div id="raceList"></div>
      <div id="raceFeatures"></div>
      <div id="raceTraits"></div>
      <input id="raceSearch" />
      <button id="changeRace"></button>
    `;
    DATA.races = {
      Lizardfolk: [{ name: 'Lizardfolk', path: 'lizard' }],
    };
    const race = {
      name: 'Lizardfolk',
      entries: [],
      skillProficiencies: [{ survival: true }],
      languageProficiencies: [{ draconic: true }],
      speed: { swim: 30 },
      ability: [{ str: 2 }],
    };
    CharacterState.system.details = {};
    CharacterState.raceChoices = { spells: [], spellAbility: '', size: '' };
    CharacterState.system.skills = [];
    CharacterState.system.traits.languages.value = [];
    CharacterState.system.attributes = {};
    CharacterState.system.abilities.str.value = 8;
    CharacterState.bonusAbilities.str = 0;
    mockFetch.mockImplementation(() => Promise.resolve(race));
    await loadStep3(true);
    await selectBaseRace('Lizardfolk');
    document.querySelector('#raceList .class-card').click();
    await new Promise((r) => setTimeout(r, 0));
    await confirmStep();
  });

  test('cleans up race metadata when changing race', async () => {
    // Ability scores should remain untouched during race confirmation
    expect(CharacterState.system.abilities.str.value).toBe(8);
    expect(CharacterState.bonusAbilities.str).toBe(0);
    // Other race features should still be applied
    expect(CharacterState.system.skills).toContain('Survival');
    expect(CharacterState.system.traits.languages.value).toContain('Draconic');
    expect(CharacterState.system.attributes.movement.swim).toBe(30);

    // Changing race should remove metadata but leave abilities unchanged
    document.getElementById('changeRace').click();
    await new Promise((r) => setTimeout(r, 0));

    expect(CharacterState.system.abilities.str.value).toBe(8);
    expect(CharacterState.bonusAbilities.str).toBe(0);
    expect(CharacterState.system.skills).not.toContain('Survival');
    expect(CharacterState.system.traits.languages.value).not.toContain('Draconic');
    expect(CharacterState.system.attributes.movement.swim).toBeUndefined();
    expect(refreshBaseState).toHaveBeenCalled();
    expect(rebuildFromClasses).toHaveBeenCalled();
  });
});

