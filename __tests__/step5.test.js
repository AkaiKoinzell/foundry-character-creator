/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

const showStep = jest.fn();
const showErrorBanner = jest.fn();
let loadStep5;
let CharacterState;
let fetchJsonWithRetry;

beforeEach(async () => {
  jest.resetModules();
  showStep.mockClear();
  showErrorBanner.mockClear();

  jest.unstable_mockModule('../src/data.js', () => ({
    DATA: {},
    CharacterState: { classes: [{ name: 'Test', level: 1 }], equipment: [] },
    loadSpells: jest.fn(),
    fetchJsonWithRetry: jest.fn(),
  }));
  jest.unstable_mockModule('../src/i18n.js', () => ({ t: (k) => k }));
  jest.unstable_mockModule('../src/main.js', () => ({ showStep, showErrorBanner }));

  ({ loadStep5 } = await import('../src/step5.js'));
  ({ CharacterState, fetchJsonWithRetry } = await import('../src/data.js'));

  document.body.innerHTML =
    '<div id="equipmentSelections"></div><button id="confirmEquipment"></button>';

  fetchJsonWithRetry.mockResolvedValue({
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
    expect(showStep).toHaveBeenCalledWith(6);
  });

  test('failed fetch surfaces error and allows retry', async () => {
    fetchJsonWithRetry.mockReset();
    fetchJsonWithRetry
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({
        standard: [],
        classes: { Test: { fixed: [], choices: [] } },
      });

    await loadStep5(true);

    expect(fetchJsonWithRetry).toHaveBeenCalledTimes(1);
    expect(showErrorBanner).toHaveBeenCalledWith('equipmentLoadError');

    await loadStep5(true);

    expect(fetchJsonWithRetry).toHaveBeenCalledTimes(2);
    const accs = document.querySelectorAll('#equipmentSelections .accordion');
    expect(accs).toHaveLength(1);
  });
});
