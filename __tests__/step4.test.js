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
  },
  logCharacterState: jest.fn(),
}));

jest.unstable_mockModule('../src/step2.js', () => ({
  refreshBaseState: jest.fn(),
  rebuildFromClasses: jest.fn(),
  updateChoiceSelectOptions: jest.fn(),
}));

jest.unstable_mockModule('../src/i18n.js', () => ({ t: (k) => k }));
jest.unstable_mockModule('../src/main.js', () => ({ showStep: jest.fn() }));

const { loadStep4 } = await import('../src/step4.js');
const { DATA } = await import('../src/data.js');

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

  test('repopulates list and shows search when changing background', () => {
    loadStep4();
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

  test('shows description and toggles details', () => {
    loadStep4();
    const card = document.querySelector('#backgroundList .class-card');
    const desc = card.querySelector('p');
    expect(desc.textContent).toBe('Devout servant');
    const detailsBtn = card.querySelector('button');
    expect(detailsBtn).not.toBeNull();
    detailsBtn.click();
    const detailsDiv = card.querySelector('.race-details');
    expect(detailsDiv.classList.contains('hidden')).toBe(false);
  });
});

