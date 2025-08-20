import { showStep, loadFormData } from './ui.js';
import { loadDropdownData, renderEntityList } from './common.js';
import { createHeader, createParagraph } from './domHelpers.js';
import {
  updateSubclasses,
  renderClassFeatures,
  displayRaceTraits,
  generateFinalJson,
  initializeValues,
  renderFinalRecap
} from './script.js';
import { resetSelectedData } from './state.js';
import './step4.js';
import './step5.js';
import './step7.js';

let classSelectionConfirmed = false;
let raceSelectionConfirmed = false;
let backgroundSelectionConfirmed = false;
window.equipmentSelectionConfirmed = false;
window.racialBonusesConfirmed = false;

function renderEntitySection(jsonPath, containerId, modalIds, detailRenderer) {
  let pendingPath = '';
  const { modalId, detailsId, closeId } = modalIds;

  async function openModal(name, path) {
    pendingPath = path;
    const modal = document.getElementById(modalId);
    const details = document.getElementById(detailsId);
    if (!modal || !details) return;
    details.textContent = '';
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      detailRenderer(details, data);
    } catch (e) {
      details.textContent = 'Errore caricando i dettagli.';
    }
    modal.classList.remove('hidden');
  }

  function closeModal() {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }

  renderEntityList(jsonPath, containerId, openModal);

  if (closeId) {
    const closeBtn = document.getElementById(closeId);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
  }

  return {
    getPendingPath: () => pendingPath,
    closeModal
  };
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Main.js caricato!');

  const requiredStep1 = ['userName', 'characterName', 'origin', 'age'];
  function isStepComplete(idx) {
    switch (idx) {
      case 0:
        return requiredStep1.every(id => document.getElementById(id)?.value.trim());
      case 1:
        return classSelectionConfirmed;
      case 2:
        return raceSelectionConfirmed;
      case 3:
        return backgroundSelectionConfirmed;
      case 4:
        return window.equipmentSelectionConfirmed;
      case 5:
        const remaining = parseInt(document.getElementById('pointsRemaining')?.textContent) || 0;
        return remaining === 0 && window.racialBonusesConfirmed;
      default:
        return true;
    }
  }

  function validateStepsUpTo(targetIdx) {
    for (let i = 0; i < targetIdx; i++) {
      if (!isStepComplete(i)) {
        alert(`Completa Step ${i + 1} prima di procedere!`);
        return false;
      }
    }
    return true;
  }

  loadDropdownData('data/races.json', 'raceSelect');
  loadDropdownData('data/classes.json', 'classSelect');
  const classSection = renderEntitySection(
    'data/classes.json',
    'classList',
    { modalId: 'classModal', detailsId: 'classModalDetails', closeId: 'closeClassModal' },
    (details, data) => {
      details.appendChild(createHeader(data.name, 3));
      details.appendChild(createParagraph(data.description));
      details.appendChild(createParagraph(`Hit Die: ${data.hit_die}`));
      details.appendChild(
        createParagraph(`Saving Throws: ${data.saving_throws.join(', ')}`)
      );
    }
  );
  const raceSection = renderEntitySection(
    'data/races.json',
    'raceList',
    { modalId: 'raceModal', detailsId: 'raceModalDetails', closeId: 'closeRaceModal' },
    (details, data) => {
      details.appendChild(createHeader(data.name, 3));
    }
  );
  const backgroundSection = renderEntitySection(
    'data/backgrounds.json',
    'backgroundList',
    {
      modalId: 'backgroundModal',
      detailsId: 'backgroundModalDetails',
      closeId: 'closeBackgroundModal'
    },
    (details, data) => {
      details.appendChild(createHeader(data.name, 3));
      if (data.skills) {
        details.appendChild(
          createParagraph(`Abilità: ${data.skills.join(', ')}`)
        );
      }
      if (data.tools && data.tools.length) {
        details.appendChild(
          createParagraph(`Strumenti: ${data.tools.join(', ')}`)
        );
      }
    }
  );

  ['step1','step2','step3','step4','step5','step6','step7'].forEach((stepId, idx) => {
    const btn = document.getElementById(`btnStep${idx + 1}`);
    if (btn) btn.addEventListener('click', () => {
      if (!validateStepsUpTo(idx)) return;
      showStep(stepId);
      if (stepId === 'step7') renderFinalRecap();
    });
  });

  const classSelectElem = document.getElementById('classSelect');
  const levelSelectElem = document.getElementById('levelSelect');
  if (classSelectElem)
    classSelectElem.addEventListener('change', () => {
      classSelectionConfirmed = false;
      resetSelectedData();
      const confirmBtn = document.getElementById('confirmClassSelection');
      if (confirmBtn) confirmBtn.style.display = 'inline-block';
      updateSubclasses();
    });
  if (levelSelectElem)
    levelSelectElem.addEventListener('change', () => {
      renderClassFeatures();
    });

  const raceSelectElem = document.getElementById('raceSelect');
  if (raceSelectElem)
    raceSelectElem.addEventListener('change', () => {
      raceSelectionConfirmed = false;
      const confirmBtn = document.getElementById('confirmRaceSelection');
      if (confirmBtn) confirmBtn.style.display = 'inline-block';
      displayRaceTraits();
    });

  const bgSelectElem = document.getElementById('backgroundSelect');
  if (bgSelectElem)
    bgSelectElem.addEventListener('change', () => {
      backgroundSelectionConfirmed = false;
      const confirmBtn = document.getElementById('confirmBackgroundSelection');
      if (confirmBtn) confirmBtn.style.display = 'inline-block';
    });

  ['racialBonus1', 'racialBonus2', 'racialBonus3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => {
      window.racialBonusesConfirmed = false;
    });
  });

  initializeValues();
  const lastStep = loadFormData();
  const stepMap = {
    nameStep: 'step1',
    classStep: 'step2',
    raceStep: 'step3',
    backgroundStep: 'step4',
    equipmentStep: 'step5',
    pointBuyStep: 'step6',
    recapStep: 'step7'
  };
  const normalizedStep = stepMap[lastStep] || lastStep;
  showStep(normalizedStep || 'step1');
  if ((normalizedStep || 'step1') === 'step7') renderFinalRecap();

  document.getElementById('levelSelect').addEventListener('change', () => displayRaceTraits());
  document.getElementById('generateJson').addEventListener('click', generateFinalJson);
  document.getElementById('addClassButton').addEventListener('click', () => {
    const classSelect = document.getElementById('classSelect');
    if (classSelect) {
      classSelect.value = classSection.getPendingPath();
      classSelect.dispatchEvent(new Event('change'));
    }
    classSection.closeModal();
  });

  document.getElementById('addRaceButton').addEventListener('click', () => {
    const raceSelect = document.getElementById('raceSelect');
    if (raceSelect) {
      raceSelect.value = raceSection.getPendingPath();
      displayRaceTraits();
      const confirmBtn = document.getElementById('confirmRaceSelection');
      if (confirmBtn) confirmBtn.style.display = 'inline-block';
      raceSelectionConfirmed = false;
    }
    raceSection.closeModal();
  });

  document.getElementById('addBackgroundButton').addEventListener('click', () => {
    const bgSelect = document.getElementById('backgroundSelect');
    if (bgSelect) {
      bgSelect.value = backgroundSection.getPendingPath();
      bgSelect.dispatchEvent(new Event('change'));
      const confirmBtn = document.getElementById('confirmBackgroundSelection');
      if (confirmBtn) confirmBtn.style.display = 'inline-block';
      backgroundSelectionConfirmed = false;
    }
    backgroundSection.closeModal();
  });

  document.getElementById('confirmClassSelection').addEventListener('click', async () => {
    const classSelect = document.getElementById('classSelect');
    const subclassSelect = document.getElementById('subclassSelect');
    const level = parseInt(document.getElementById('levelSelect')?.value) || 1;
    if (!classSelect.value) {
      alert('⚠️ Seleziona una classe prima di procedere!');
      return;
    }
    if (document.querySelector('#classFeatures .needs-selection, #classExtrasAccordion .needs-selection')) {
      alert('⚠️ Completa tutte le scelte della classe prima di procedere!');
      return;
    }
    const className = classSelect.selectedOptions[0]?.text || '';
    const subclassLevels = { Cleric: 1, Warlock: 1, Sorcerer: 1 };
    const requiredLevel = subclassLevels[className] || 3;
    if (subclassSelect && level >= requiredLevel && !subclassSelect.value) {
      alert('⚠️ Seleziona una sottoclasse prima di procedere!');
      return;
    }
    classSelectionConfirmed = true;
    await renderClassFeatures();
    const confirmBtn = document.getElementById('confirmClassSelection');
    if (confirmBtn) confirmBtn.style.display = 'none';
  });

  document.getElementById('confirmRaceSelection').addEventListener('click', () => {
    const selectedRace = document.getElementById('raceSelect').value;
    if (!selectedRace) {
      alert('⚠️ Seleziona una razza prima di procedere!');
      return;
    }
    if (document.querySelector('#raceTraits .needs-selection.incomplete')) {
      alert('⚠️ Completa tutte le scelte della razza prima di procedere!');
      return;
    }
    raceSelectionConfirmed = true;
    document.getElementById('confirmRaceSelection').style.display = 'none';
  });

  document.getElementById('confirmBackgroundSelection').addEventListener('click', () => {
    const bgSelect = document.getElementById('backgroundSelect').value;
    if (!bgSelect) {
      alert('⚠️ Seleziona un background prima di procedere!');
      return;
    }
    if (document.querySelector('#step4 .needs-selection.incomplete')) {
      alert('⚠️ Completa tutte le scelte del background prima di procedere!');
      return;
    }
    backgroundSelectionConfirmed = true;
    document.getElementById('confirmBackgroundSelection').style.display = 'none';
  });

});
