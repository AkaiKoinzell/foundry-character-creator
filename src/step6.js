import { CharacterState, totalLevel } from './data.js';
import { t } from './i18n.js';
import * as main from './main.js';

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const COST = { 8:0, 9:1, 10:2, 11:3, 12:4, 13:5, 14:7, 15:9 };
let bonuses = {};

function calcRemaining() {
  const remaining = 27 - ABILITIES.reduce((sum, ab) => sum + (COST[CharacterState.baseAbilities[ab]] || 0), 0);
  const span = document.getElementById('pointsRemaining');
  if (span) span.textContent = remaining;
  main.setCurrentStepComplete?.(remaining === 0);
  return remaining;
}

function updateFinal(ab) {
  const base = CharacterState.baseAbilities[ab];
  const bonus = bonuses[ab] || 0;
  const finalVal = base + bonus;
  const baseSpan = document.getElementById(`${ab}Points`);
  const bonusSpan = document.getElementById(`${ab}RaceModifier`);
  const finalCell = document.getElementById(`${ab}FinalScore`);
  if (baseSpan) baseSpan.textContent = base;
  if (bonusSpan) bonusSpan.textContent = bonus;
  if (finalCell) finalCell.textContent = finalVal;
}

function adjustAbility(ab, delta) {
  const current = CharacterState.baseAbilities[ab];
  const next = current + delta;
  if (next < 8 || next > 15) return;
  const costDiff = (COST[next] || 0) - (COST[current] || 0);
  const remaining = calcRemaining();
  if (delta > 0 && costDiff > remaining) return;
  CharacterState.baseAbilities[ab] = next;
  updateFinal(ab);
  calcRemaining();
}

function confirmAbilities() {
  ABILITIES.forEach((ab) => {
    const base = CharacterState.baseAbilities[ab];
    const bonus = bonuses[ab] || 0;
    CharacterState.system.abilities[ab].value = base + bonus;
  });
  main.showStep?.(7);
}

export function loadStep6(force = false) {
  totalLevel();
  const container = document.getElementById('step6');
  if (!container) return;

  let confirmBtn = document.getElementById('confirmAbilities');
  if (!confirmBtn) {
    confirmBtn = document.createElement('button');
    confirmBtn.id = 'confirmAbilities';
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = t('confirmAbilities');
    container.appendChild(confirmBtn);
  }
  confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  confirmBtn = document.getElementById('confirmAbilities');
  confirmBtn.addEventListener('click', confirmAbilities);

  if (!CharacterState.baseAbilities || force) {
    CharacterState.baseAbilities = {};
    bonuses = {};
    ABILITIES.forEach((ab) => {
      const val = CharacterState.system.abilities[ab]?.value ?? 8;
      bonuses[ab] = val - 8;
      CharacterState.baseAbilities[ab] = 8;
    });
  } else {
    bonuses = {};
    ABILITIES.forEach((ab) => {
      const val = CharacterState.system.abilities[ab]?.value ?? 8;
      bonuses[ab] = val - CharacterState.baseAbilities[ab];
    });
  }

  ABILITIES.forEach((ab) => {
    updateFinal(ab);
    const baseSpan = document.getElementById(`${ab}Points`);
    const row = baseSpan?.closest('tr');
    if (!row) return;
    const btns = row.querySelectorAll('button');
    if (btns[0]) btns[0].replaceWith(btns[0].cloneNode(true));
    if (btns[1]) btns[1].replaceWith(btns[1].cloneNode(true));
    const newBtns = row.querySelectorAll('button');
    newBtns[0]?.addEventListener('click', () => adjustAbility(ab, 1));
    newBtns[1]?.addEventListener('click', () => adjustAbility(ab, -1));
  });

  calcRemaining();
}

export default { loadStep6 };
