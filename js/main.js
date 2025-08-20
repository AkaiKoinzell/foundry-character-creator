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

  document.getElementById('raceSelect').addEventListener('change', displayRaceTraits);
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
    document.getElementById('confirmRaceSelection').style.display = 'none';
  });

  document.getElementById('confirmBackgroundSelection').addEventListener('click', () => {
    const bgSelect = document.getElementById('backgroundSelect').value;
    if (!bgSelect) {
      alert('⚠️ Seleziona un background prima di procedere!');
      return;
    }
    document.getElementById('confirmBackgroundSelection').style.display = 'none';
  });

});
