/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/data.js', () => ({
  DATA: { backgrounds: {} },
  CharacterState: {
    system: {
      details: {},
      skills: [],
      tools: [],
      traits: { languages: { value: [] } },
    },
    showHelp: true,
    backgroundChoices: { skills: [], tools: [], languages: [], feat: '' },
    raceChoices: {
      spells: [],
      spellAbility: '',
      size: '',
      alterations: {},
      resist: '',
      tools: [],
      weapons: [],
      languages: [],
      skills: [],
      variants: [],
    },
  },
  logCharacterState: jest.fn(),
  fetchJsonWithRetry: jest.fn(),
  loadSpells: jest.fn(),
  loadFeatDetails: jest.fn(),
  loadOptionalFeatures: jest.fn(),
  loadEquipment: jest.fn(),
  loadBackgrounds: jest.fn().mockResolvedValue(),
}));

jest.unstable_mockModule('../src/step2.js', () => ({
  refreshBaseState: jest.fn(),
  rebuildFromClasses: jest.fn(),
}));

jest.unstable_mockModule('../src/choice-select-helpers.js', () => ({
  updateChoiceSelectOptions: jest.fn(),
  filterDuplicateOptions: jest.fn(),
  updateSkillSelectOptions: jest.fn(),
}));

jest.unstable_mockModule('../src/i18n.js', () => ({ t: (k) => k }));
jest.unstable_mockModule('../src/main.js', () => ({
  showStep: jest.fn(),
  TOTAL_STEPS: 7,
  invalidateStep: jest.fn(),
  invalidateStepsFrom: jest.fn(),
}));

const { loadStep4 } = await import('../src/step4.js');
const { DATA, CharacterState } = await import('../src/data.js');

describe('change background button', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="backgroundSearch" />
      <div id="backgroundList"></div>
      <button id="confirmBackgroundSelection"></button>
      <button id="changeBackground" class="hidden"></button>
    `;
    DATA.backgrounds = {
      Acolyte: { name: 'Acolyte', skills: [], languages: [], featOptions: [] },
    };
  });

  test('repopulates list and shows search when changing background', async () => {
    await loadStep4();
    const card = document.querySelector('#backgroundList .class-card');
    card.click();
    DATA.backgrounds = {
      Acolyte: { name: 'Acolyte', skills: [], languages: [], featOptions: [] },
      Hermit: { name: 'Hermit', skills: [], languages: [], featOptions: [] },
    };
    const changeBtn = document.getElementById('changeBackground');
    changeBtn.click();
    const cards = document.querySelectorAll('#backgroundList .class-card');
    expect(cards).toHaveLength(2);
    const search = document.getElementById('backgroundSearch');
    expect(search.classList.contains('hidden')).toBe(false);
  });
});

describe('loadStep4 restoration', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="backgroundSearch" />
      <div id="backgroundList"></div>
      <div id="backgroundFeatures" class="hidden"></div>
      <button id="changeBackground" class="hidden"></button>
    `;
    DATA.backgrounds = {
      Scholar: {
        name: 'Scholar',
        entries: [],
        skillChoices: { choose: 1, options: ['Arcana', 'History'] },
        toolChoices: { choose: 1, options: ["Calligrapher's Supplies", "Painter's Supplies"] },
        languages: { choose: 1, options: ['Elvish', 'Dwarvish'] },
      },
    };
    CharacterState.system.details.background = 'Scholar';
    CharacterState.backgroundChoices = {
      skills: ['Arcana'],
      tools: ["Calligrapher's Supplies"],
      languages: ['Elvish'],
      feat: '',
    };
  });

  afterEach(() => {
    CharacterState.system.details.background = '';
    CharacterState.backgroundChoices = { skills: [], tools: [], languages: [], feat: '' };
  });

  test('shows previously selected background when revisiting step', async () => {
    await loadStep4(false);
    const list = document.getElementById('backgroundList');
    const features = document.getElementById('backgroundFeatures');
    expect(list.classList.contains('hidden')).toBe(true);
    expect(features.classList.contains('hidden')).toBe(false);
    const selectedValues = Array.from(
      features.querySelectorAll('select')
    ).map((sel) => sel.value);
    expect(selectedValues).toEqual(
      expect.arrayContaining(['Arcana', "Calligrapher's Supplies", 'Elvish'])
    );
  });
});

describe('renderBackgroundList description and details', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="backgroundSearch" />
      <div id="backgroundList"></div>
      <button id="confirmBackgroundSelection"></button>
      <button id="changeBackground" class="hidden"></button>
    `;
    DATA.backgrounds = {
      Acolyte: {
        name: 'Acolyte',
        description: 'Devout servant',
        skills: ['Insight'],
        languages: [],
        featOptions: [],
      },
    };
  });

  test('shows description and details even when help is hidden', async () => {
    CharacterState.showHelp = false;
    await loadStep4();
    const card = document.querySelector('#backgroundList .class-card');
    const desc = card.querySelector('p');
    expect(desc.textContent).toBe('Devout servant');
    const detailsBtn = card.querySelector('button');
    expect(detailsBtn).not.toBeNull();
    detailsBtn.click();
    const detailsDiv = card.querySelector('.race-details');
    expect(detailsDiv.classList.contains('hidden')).toBe(false);
    expect(detailsDiv.textContent).toContain('skills: Insight');
  });
});

describe('selectBackground feature descriptions', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="backgroundSearch" />
      <div id="backgroundList"></div>
      <button id="confirmBackgroundSelection"></button>
      <button id="changeBackground" class="hidden"></button>
    `;
    DATA.backgrounds = {
      Acolyte: {
        name: 'Acolyte',
        description: 'Devout servant',
        skills: ['Insight'],
        languages: [],
        featOptions: [],
        skillChoices: { choose: 1, options: ['Arcana'] },
        entries: [
          { name: 'Skill Proficiencies', description: 'Choose a skill description', entries: [] }
        ]
      },
    };
  });

  test('shows details and feature descriptions without help', async () => {
    CharacterState.showHelp = false;
    await loadStep4();
    const card = document.querySelector('#backgroundList .class-card');
    card.click();
    const detailsAcc = document.querySelector('#backgroundFeatures .accordion-item .accordion-content');
    expect(detailsAcc.textContent).toContain('skills: Insight');
    const skillAcc = document.querySelectorAll('#backgroundFeatures .accordion-item')[1];
    const skillDesc = skillAcc.querySelector('p');
    expect(skillDesc.textContent).toBe('Choose a skill description');
  });
});
