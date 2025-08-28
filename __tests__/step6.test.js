/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

const setCurrentStepComplete = jest.fn();
jest.unstable_mockModule('../src/main.js', () => ({
  setCurrentStepComplete,
  showStep: jest.fn(),
}));

jest.unstable_mockModule('../src/i18n.js', () => ({ t: (k) => k }));

const CharacterState = {
  baseAbilities: { str: 15, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
  bonusAbilities: { str: 3 },
  system: {
    abilities: {
      str: { value: 18 },
      dex: { value: 8 },
      con: { value: 8 },
      int: { value: 8 },
      wis: { value: 8 },
      cha: { value: 8 },
    },
  },
  classes: [{ level: 1 }],
};

jest.unstable_mockModule('../src/data.js', () => ({
  CharacterState,
  totalLevel: () => 1,
}));

const { loadStep6 } = await import('../src/step6.js');

describe('level 1 ability cap', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="step6">
        <table>
          <tr>
            <td>STR</td>
            <td><button class="btn">+</button><button class="btn">-</button></td>
            <td><span id="strPoints">15</span></td>
            <td><span id="strRaceModifier">3</span></td>
            <td id="strFinalScore">18</td>
          </tr>
        </table>
      </div>
    `;
  });

  test('disables confirm and warns when ability >17 and re-enables after fix', () => {
    loadStep6(true);

    const row = document.getElementById('strPoints').closest('tr');
    const warning = row.querySelector('#strFinalScore small');
    const btn = document.getElementById('confirmAbilities');

    expect(row.classList.contains('incomplete')).toBe(true);
    expect(warning).not.toBeNull();
    expect(warning.textContent).toBe('maxScoreLevel1');
    expect(btn.disabled).toBe(true);

    const minus = row.querySelectorAll('button')[1];
    minus.click();

    const warningAfter = row.querySelector('#strFinalScore small');
    expect(row.classList.contains('incomplete')).toBe(false);
    expect(warningAfter.textContent).toBe('');
    expect(btn.disabled).toBe(false);
  });
});
