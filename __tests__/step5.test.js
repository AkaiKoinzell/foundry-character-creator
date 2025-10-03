/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

const showStep = jest.fn();
const showErrorBanner = jest.fn();
let loadStep5;
let CharacterState;
let TOTAL_STEPS;
let loadEquipment;

beforeEach(async () => {
  jest.resetModules();
  showStep.mockClear();
  showErrorBanner.mockClear();

  loadEquipment = jest.fn();
  jest.unstable_mockModule('../src/data.js', () => ({
    DATA: {},
    CharacterState: {
      classes: [{ name: 'Test', level: 1 }],
      equipment: [],
      equipmentChoices: { className: '', choices: [] },
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
    loadSpells: jest.fn(),
    loadEquipment,
  }));
  jest.unstable_mockModule('../src/i18n.js', () => ({ t: (k) => k }));
  jest.unstable_mockModule('../src/main.js', () => ({
    showStep,
    showErrorBanner,
    TOTAL_STEPS: 7,
  }));

  ({ loadStep5 } = await import('../src/step5.js'));
  ({ CharacterState } = await import('../src/data.js'));
  ({ TOTAL_STEPS } = await import('../src/main.js'));

  document.body.innerHTML =
    '<div id="equipmentSelections"></div><button id="confirmEquipment"></button>';

  loadEquipment.mockResolvedValue({
    standard: [],
    classes: { Test: { fixed: [], choices: [] } },
  });
  CharacterState.classes = [{ name: 'Test', level: 1 }];
});

describe('step5 re-entry', () => {
  test('reloading step5 does not duplicate UI or listeners', async () => {
    await loadStep5(true);
    await loadStep5(true);
    const accs = document.querySelectorAll('#equipmentSelections .accordion');
    expect(accs).toHaveLength(1);

    const btn = document.getElementById('confirmEquipment');
    btn.click();
    expect(showStep).toHaveBeenCalledTimes(1);
    expect(showStep).toHaveBeenCalledWith(TOTAL_STEPS - 1);
  });

  test('failed fetch surfaces error and allows retry', async () => {
    loadEquipment.mockReset();
    loadEquipment
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({
        standard: [],
        classes: { Test: { fixed: [], choices: [] } },
      });

    await loadStep5(true);

    expect(loadEquipment).toHaveBeenCalledTimes(1);
    expect(showErrorBanner).toHaveBeenCalledWith('equipmentLoadError');

    await loadStep5(true);

    expect(loadEquipment).toHaveBeenCalledTimes(2);
    const accs = document.querySelectorAll('#equipmentSelections .accordion');
    expect(accs).toHaveLength(1);
  });

  test('restores prior selections when revisiting', async () => {
    loadEquipment.mockResolvedValueOnce({
      standard: [],
      classes: {
        Test: {
          fixed: [],
          choices: [
            {
              type: 'radio',
              label: 'Weapon Choice',
              options: [
                { value: 'Mace', label: 'Mace' },
                { value: 'Warhammer', label: 'Warhammer' },
              ],
            },
          ],
        },
      },
    });
    CharacterState.equipmentChoices = {
      className: 'Test',
      choices: [{ id: 'choice-0', type: 'radio', option: 'Warhammer', extras: [] }],
    };

    await loadStep5(true);

    const selected = document.querySelector('input[value="Warhammer"]');
    expect(selected?.checked).toBe(true);
  });
});
