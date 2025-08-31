import { CharacterState, totalLevel } from './data.js';
import { t } from './i18n.js';
import * as main from './main.js';

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const COST = { 8:0, 9:1, 10:2, 11:3, 12:4, 13:5, 14:7, 15:9 };

let confirmBtn;

function calcRemaining() {
  const remaining = 27 - ABILITIES.reduce((sum, ab) => sum + (COST[CharacterState.baseAbilities[ab]] || 0), 0);
  const span = document.getElementById('pointsRemaining');
  if (span) span.textContent = remaining;
  main.setCurrentStepComplete?.(remaining === 0);
  return remaining;
}

export function updateFinal(ab) {
  const base = CharacterState.baseAbilities[ab];
  const bonus = CharacterState.bonusAbilities?.[ab] || 0;
  const finalVal = base + bonus;
  const baseSpan = document.getElementById(`${ab}Points`);
  const bonusSpan = document.getElementById(`${ab}RaceModifier`);
  const finalCell = document.getElementById(`${ab}FinalScore`);
  if (baseSpan) baseSpan.textContent = base;
  if (bonusSpan) bonusSpan.textContent = bonus;
  if (finalCell) finalCell.textContent = finalVal;
}

function validateAbilities() {
  const isLevelOne = totalLevel() === 1;
  let invalid = false;
  ABILITIES.forEach((ab) => {
    const final =
      (CharacterState.baseAbilities[ab] || 0) +
      (CharacterState.bonusAbilities?.[ab] || 0);
    const finalCell = document.getElementById(`${ab}FinalScore`);
    const row = finalCell?.closest('tr');
    if (!row) return;
    let warn = finalCell.querySelector('small');
    if (!warn) {
      warn = document.createElement('small');
      warn.className = 'text-danger ms-2';
      finalCell.appendChild(warn);
    }
    if (isLevelOne && final > 17) {
      row.classList.add('incomplete');
      warn.textContent = t('maxScoreLevel1');
      invalid = true;
    } else {
      row.classList.remove('incomplete');
      warn.textContent = '';
    }
  });
  if (confirmBtn) confirmBtn.disabled = invalid;
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
  validateAbilities();
  calcRemaining();
}

function applyRacialBonus() {
  const selections = [
    document.getElementById('racialBonus1')?.value,
    document.getElementById('racialBonus2')?.value,
    document.getElementById('racialBonus3')?.value,
  ];
  if (selections.some((v) => !v)) {
    alert(t('selectThreeAbilities'));
    return;
  }
  const counts = selections.reduce((acc, ab) => {
    acc[ab] = (acc[ab] || 0) + 1;
    return acc;
  }, {});
  const values = Object.values(counts);
  const valid =
    (Object.keys(counts).length === 2 && values.includes(2) && values.includes(1)) ||
    (Object.keys(counts).length === 3 && values.every((v) => v === 1));
  if (!valid) {
    alert(t('invalidBonusDistribution'));
    return;
  }
  CharacterState.bonusAbilities = {};
  Object.entries(counts).forEach(([ab, val]) => {
    CharacterState.bonusAbilities[ab] = val;
  });
  ABILITIES.forEach(updateFinal);
  validateAbilities();
}

function confirmAbilities() {
  ABILITIES.forEach((ab) => {
    const base = CharacterState.baseAbilities[ab];
    const bonus = CharacterState.bonusAbilities?.[ab] || 0;
    CharacterState.system.abilities[ab].value = base + bonus;
  });
  main.showStep?.(7);
}

export function loadStep6(force = false) {
  totalLevel();
  const container = document.getElementById('step6');
  if (!container) return;

  confirmBtn = document.getElementById('confirmAbilities');
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
    CharacterState.baseAbilities = CharacterState.baseAbilities || {};
  }
  ABILITIES.forEach((ab) => {
    const bonus = CharacterState.bonusAbilities?.[ab] || 0;
    const val = CharacterState.system.abilities[ab]?.value ?? 8;
    if (!CharacterState.baseAbilities[ab] || force) {
      CharacterState.baseAbilities[ab] = val - bonus;
    }
  });

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

  let applyBtn = document.getElementById('applyRacialBonus');
  if (applyBtn) {
    applyBtn.replaceWith(applyBtn.cloneNode(true));
    applyBtn = document.getElementById('applyRacialBonus');
    applyBtn.addEventListener('click', applyRacialBonus);
  }

  validateAbilities();
  calcRemaining();
}

export default { loadStep6 };
