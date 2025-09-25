import { CharacterState, totalLevel } from './data.js';
import { t } from './i18n.js';
import * as main from './main.js';
import { showConfirmation } from './ui-helpers.js';
import { PointBuyController, ABILITIES } from './pointbuy-controller.js';

const MAX_POINTS = 27;

let confirmBtn;
let controller;

function ensureAbilityState(force = false) {
  CharacterState.baseAbilities = CharacterState.baseAbilities || {};
  CharacterState.bonusAbilities = CharacterState.bonusAbilities || {};
  CharacterState.bonusPointAllocations = CharacterState.bonusPointAllocations || {};

  ABILITIES.forEach((ability) => {
    const bonus = CharacterState.bonusAbilities[ability] ?? 0;
    const value = CharacterState.system.abilities[ability]?.value ?? 8;
    if (force || CharacterState.baseAbilities[ability] == null) {
      CharacterState.baseAbilities[ability] = value - bonus;
    }
    if (CharacterState.bonusAbilities[ability] == null) {
      CharacterState.bonusAbilities[ability] = bonus;
    }
  });
}

export function updateFinal(ability) {
  if (controller) {
    controller.updateAbilityRow(ability);
    return;
  }
  const base = CharacterState.baseAbilities[ability];
  const bonus = CharacterState.bonusAbilities?.[ability] || 0;
  const finalVal = base + bonus;
  const baseSpan = document.getElementById(`${ability}Points`);
  const bonusSpan = document.getElementById(`${ability}BonusModifier`);
  const finalCell = document.getElementById(`${ability}FinalScore`);
  if (baseSpan) baseSpan.textContent = base;
  if (bonusSpan) bonusSpan.textContent = bonus;
  if (finalCell) finalCell.textContent = finalVal;
}

export function commitAbilities() {
  ABILITIES.forEach((ability) => {
    const base = CharacterState.baseAbilities[ability];
    const bonus = CharacterState.bonusAbilities?.[ability] || 0;
    CharacterState.system.abilities[ability].value = base + bonus;
  });
}

function confirmAbilities() {
  commitAbilities();
  main.showStep?.(main.TOTAL_STEPS);
}

function createController(container) {
  controller = new PointBuyController({
    container,
    maxPoints: MAX_POINTS,
    getBase: (ability) => CharacterState.baseAbilities?.[ability] ?? 8,
    setBase: (ability, value) => {
      CharacterState.baseAbilities = CharacterState.baseAbilities || {};
      CharacterState.baseAbilities[ability] = value;
    },
    getBonus: (ability) => CharacterState.bonusAbilities?.[ability] ?? 0,
    setBonus: (ability, value) => {
      CharacterState.bonusAbilities = CharacterState.bonusAbilities || {};
      CharacterState.bonusAbilities[ability] = value;
    },
    getAppliedBonusCounts: () => CharacterState.bonusPointAllocations || {},
    setAppliedBonusCounts: (counts) => {
      CharacterState.bonusPointAllocations = counts || {};
    },
    onRemainingChange: (remaining) => {
      main.setCurrentStepComplete?.(remaining === 0);
    },
    onValidityChange: (isValid) => {
      if (confirmBtn) confirmBtn.disabled = !isValid;
    },
    getLevel: () => totalLevel(),
    showMessage: (message) =>
      showConfirmation(message, {
        confirmText: t('ok'),
        cancelText: null,
      }),
    translate: (key) => t(key),
  });
  controller.init();
  controller.setConfirmButton(confirmBtn);
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

  ensureAbilityState(force);
  createController(container);
  controller.updateAll();
}

export default { loadStep6, commitAbilities };
