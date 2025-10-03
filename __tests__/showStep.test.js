/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

const loadStep3 = jest.fn();
const loadStep4 = jest.fn();
const loadStep5 = jest.fn();
const loadStep6 = jest.fn();

jest.unstable_mockModule('../src/step4.js', () => ({
  loadStep4,
  isStepComplete: jest.fn(),
  confirmStep: jest.fn(),
}));

jest.unstable_mockModule('../src/step5.js', () => ({
  loadStep5,
  isStepComplete: jest.fn(),
  confirmStep: jest.fn(),
  resetEquipmentDataCache: jest.fn(),
}));

jest.unstable_mockModule('../src/step6.js', () => ({
  loadStep6,
  commitAbilities: jest.fn(),
}));

jest.unstable_mockModule('../src/data.js', () => ({
  DATA: {},
  CharacterState: {},
  loadClasses: jest.fn(),
  loadBackgrounds: jest.fn(),
  fetchJsonWithRetry: jest.fn(),
  loadEquipment: jest.fn(),
  loadFeats: jest.fn(),
  loadRaces: jest.fn(),
  loadSpells: jest.fn(),
  loadFeatDetails: jest.fn(),
}));

jest.unstable_mockModule('../src/step2.js', () => ({
  loadStep2: jest.fn(),
  rebuildFromClasses: jest.fn(),
  refreshBaseState: jest.fn(),
  isStepComplete: jest.fn(),
  confirmStep: jest.fn(),
}));

jest.unstable_mockModule('../src/step3.js', () => ({
  loadStep3,
  isStepComplete: jest.fn(),
  confirmStep: jest.fn(),
}));

jest.unstable_mockModule('../src/i18n.js', () => ({
  t: (k) => k,
  initI18n: jest.fn(),
  applyTranslations: jest.fn(),
}));

jest.unstable_mockModule('../src/export.js', () => ({
  exportFoundryActor: jest.fn(),
  exportFoundryActorV13: jest.fn(),
}));

jest.unstable_mockModule('../src/export-pdf.js', () => ({
  exportPdf: jest.fn(),
}));

const { showStep } = await import('../src/main.js');

beforeEach(() => {
  document.body.innerHTML = `
    <div id="step3"></div>
    <div id="step4"></div>
    <div id="step5"></div>
    <div id="progressBar"></div>
  `;
  loadStep3.mockClear();
  loadStep4.mockClear();
  loadStep5.mockClear();
  loadStep6.mockClear();
});

test('loadStep3-5 receive firstVisit flag correctly', () => {
  showStep(3);
  showStep(3);
  showStep(4);
  showStep(4);
  showStep(5);
  showStep(5);
  expect(loadStep3).toHaveBeenNthCalledWith(1, true);
  expect(loadStep3).toHaveBeenNthCalledWith(2, false);
  expect(loadStep4).toHaveBeenNthCalledWith(1, true);
  expect(loadStep4).toHaveBeenNthCalledWith(2, false);
  expect(loadStep5).toHaveBeenNthCalledWith(1, true);
  expect(loadStep5).toHaveBeenNthCalledWith(2, false);
});
