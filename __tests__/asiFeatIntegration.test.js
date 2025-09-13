/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

const setCurrentStepComplete = jest.fn();

jest.unstable_mockModule('../src/main.js', () => ({
  setCurrentStepComplete,
  showStep: jest.fn(),
  TOTAL_STEPS: 7,
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
            <td><span id="strBonusModifier"></span></td>
            <td id="strFinalScore"></td>
          </tr>
        </table>
      </div>
    `;

    loadStep6(true);

    expect(document.getElementById('strPoints').textContent).toBe('10');
    expect(document.getElementById('strBonusModifier').textContent).toBe('3');
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

  test('racial bonuses merge with existing ability bonuses', () => {
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
            <td><span id="strBonusModifier"></span></td>
            <td id="strFinalScore"></td>
          </tr>
          <tr>
            <td>DEX</td>
            <td><button class="btn">+</button><button class="btn">-</button></td>
            <td><span id="dexPoints"></span></td>
            <td><span id="dexBonusModifier"></span></td>
            <td id="dexFinalScore"></td>
          </tr>
          <tr>
            <td>CON</td>
            <td><button class="btn">+</button><button class="btn">-</button></td>
            <td><span id="conPoints"></span></td>
            <td><span id="conBonusModifier"></span></td>
            <td id="conFinalScore"></td>
          </tr>
        </table>
        <select id="bonusSelect1">
          <option value=""></option>
          <option value="dex">DEX</option>
        </select>
        <select id="bonusSelect2">
          <option value=""></option>
          <option value="dex">DEX</option>
        </select>
        <select id="bonusSelect3">
          <option value=""></option>
          <option value="con">CON</option>
        </select>
        <button id="applyBonus">apply</button>
      </div>
    `;

    document.getElementById('bonusSelect1').value = 'dex';
    document.getElementById('bonusSelect2').value = 'dex';
    document.getElementById('bonusSelect3').value = 'con';

    loadStep6(true);
    document.getElementById('applyBonus').click();

    expect(CharacterState.bonusAbilities.str).toBe(3);
    expect(CharacterState.bonusAbilities.dex).toBe(2);
    expect(CharacterState.bonusAbilities.con).toBe(1);
    expect(document.getElementById('strBonusModifier').textContent).toBe('3');
  });
});

