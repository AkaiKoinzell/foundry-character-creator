/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

const setCurrentStepComplete = jest.fn();

jest.unstable_mockModule('../src/main.js', () => ({
  setCurrentStepComplete,
  showStep: jest.fn(),
}));

jest.unstable_mockModule('../src/i18n.js', () => ({ t: k => k }));

const { refreshBaseState, rebuildFromClasses } = await import('../src/step2.js');
const { loadStep6 } = await import('../src/step6.js');
const { CharacterState } = await import('../src/data.js');

const ABILITIES = ['str','dex','con','int','wis','cha'];

describe('ASI and feat bonuses', () => {
  beforeEach(() => {
    CharacterState.classes = [];
    CharacterState.feats = [];
    CharacterState.bonusAbilities = { str:0, dex:0, con:0, int:0, wis:0, cha:0 };
    ABILITIES.forEach(ab => {
      CharacterState.system.abilities[ab].value = 10;
    });
  });

  test('Step 6 shows combined bonuses', () => {
    CharacterState.feats = [{ name: 'TestFeat', ability: { str: 1 } }];
    CharacterState.classes = [{ name: 'Fighter', level: 4, asiBonuses: { str: 2 } }];
    refreshBaseState();
    rebuildFromClasses();

    document.body.innerHTML = `
      <div id="step6">
        <table>
          <tr>
            <td>STR</td>
            <td><button class="btn">+</button><button class="btn">-</button></td>
            <td><span id="strPoints"></span></td>
            <td><span id="strRaceModifier"></span></td>
            <td id="strFinalScore"></td>
          </tr>
        </table>
      </div>
    `;

    loadStep6(true);

    expect(document.getElementById('strPoints').textContent).toBe('10');
    expect(document.getElementById('strRaceModifier').textContent).toBe('3');
    expect(document.getElementById('strFinalScore').textContent).toBe('13');
  });

  test('rebuildFromClasses applies bonuses only once', () => {
    CharacterState.feats = [{ name: 'TestFeat', ability: { str: 1 } }];
    CharacterState.classes = [
      { name: 'Fighter', level: 4, asiBonuses: { str: 2 } },
    ];
    refreshBaseState();
    rebuildFromClasses();
    expect(CharacterState.system.abilities.str.value).toBe(13);
    refreshBaseState();
    rebuildFromClasses();
    expect(CharacterState.system.abilities.str.value).toBe(13);
    expect(CharacterState.bonusAbilities.str).toBe(3);
  });
});

