/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/data.js', () => ({
  DATA: {},
  CharacterState: { classes: [{ name: 'Test', level: 1 }], equipment: [] },
  loadSpells: jest.fn(),
  fetchJsonWithRetry: jest.fn(),
}));

jest.unstable_mockModule('../src/i18n.js', () => ({ t: (k) => k }));

const showStep = jest.fn();
jest.unstable_mockModule('../src/main.js', () => ({ showStep }));

const { loadStep5 } = await import('../src/step5.js');
const { CharacterState } = await import('../src/data.js');

describe('step5 re-entry', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="equipmentSelections"></div><button id="confirmEquipment"></button>';
    global.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            standard: [],
            classes: { Test: { fixed: [], choices: [] } }
          })
      });
    CharacterState.classes = [{ name: 'Test', level: 1 }];
    showStep.mockClear();
  });

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
});
