import { PointBuyController, ABILITIES } from './pointbuy-controller.js';

const baseState = {};
const bonusState = {};

ABILITIES.forEach((ability) => {
  baseState[ability] = 8;
  bonusState[ability] = 0;
});

const MESSAGES = {
  selectThreeAbilities:
    'Seleziona tre caratteristiche prima di applicare i punteggi bonus.',
  invalidBonusDistribution:
    'La distribuzione selezionata non è valida. Usa +2/+1 oppure tre +1.',
  maxScoreLevel1:
    'Al livello 1 il punteggio totale non può superare 17.',
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('step6');
  if (!container) return;

  const controller = new PointBuyController({
    container,
    getBase: (ability) => baseState[ability] ?? 8,
    setBase: (ability, value) => {
      baseState[ability] = value;
    },
    getBonus: (ability) => bonusState[ability] ?? 0,
    setBonus: (ability, value) => {
      bonusState[ability] = value;
    },
    maxPoints: 27,
    onRemainingChange: () => {},
    onValidityChange: () => {},
    getLevel: () => 1,
    showMessage: (message) => {
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(message);
      }
    },
    translate: (key) => MESSAGES[key] ?? key,
  });

  controller.init();
});
