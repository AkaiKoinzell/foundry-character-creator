import { showStep, loadFormData } from './ui.js';
import { loadDropdownData, loadLanguages, renderEntityList } from './common.js';
import { createHeader, createParagraph } from './domHelpers.js';
import {
  updateSubclasses,
  renderClassFeatures,
  displayRaceTraits,
  generateFinalJson,
  initializeValues,
  setAvailableLanguages,
  renderFinalRecap
} from './script.js';
import { getSelectedData, resetSelectedData } from './state.js';
import './step4.js';
import './step5.js';
import './step7.js';

let classSelectionConfirmed = false;
let pendingClassPath = '';
let pendingRacePath = '';
let pendingBackgroundPath = '';

function renderClassList() {
  renderEntityList('data/classes.json', 'classes', 'classList', showClassModal);
}

function renderRaceList() {
  renderEntityList('data/races.json', 'races', 'raceList', showRaceModal);
}

async function showRaceModal(name, path) {
  pendingRacePath = path;
  const modal = document.getElementById('raceModal');
  const details = document.getElementById('raceModalDetails');
  if (!modal || !details) return;
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    details.textContent = '';
    details.appendChild(createHeader(data.name, 3));
  } catch (e) {
    details.textContent = 'Errore caricando i dettagli della razza.';
  }
  modal.classList.remove('hidden');
}

function closeRaceModal() {
  const modal = document.getElementById('raceModal');
  if (modal) modal.classList.add('hidden');
}

function renderBackgroundList() {
  renderEntityList('data/backgrounds.json', 'backgrounds', 'backgroundList', showBackgroundModal);
}

async function showBackgroundModal(name, path) {
  pendingBackgroundPath = path;
  const modal = document.getElementById('backgroundModal');
  const details = document.getElementById('backgroundModalDetails');
  if (!modal || !details) return;
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    details.textContent = '';
    details.appendChild(createHeader(data.name, 3));
    if (data.skills) {
      details.appendChild(createParagraph(`Abilità: ${data.skills.join(', ')}`));
    }
    if (data.tools && data.tools.length) {
      details.appendChild(createParagraph(`Strumenti: ${data.tools.join(', ')}`));
    }
  } catch (e) {
    details.textContent = 'Errore caricando i dettagli del background.';
  }
  modal.classList.remove('hidden');
}

function closeBackgroundModal() {
  const modal = document.getElementById('backgroundModal');
  if (modal) modal.classList.add('hidden');
}

function openEquipmentModal() {
  const modal = document.getElementById('equipmentModal');
  if (modal) modal.classList.remove('hidden');
}

function closeEquipmentModal() {
  const modal = document.getElementById('equipmentModal');
  if (modal) modal.classList.add('hidden');
}

async function showClassModal(name, path) {
  pendingClassPath = path;
  const modal = document.getElementById('classModal');
  const details = document.getElementById('classModalDetails');
  if (!modal || !details) return;
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    details.textContent = '';
    details.appendChild(createHeader(data.name, 3));
    details.appendChild(createParagraph(data.description));
    details.appendChild(createParagraph(`Hit Die: ${data.hit_die}`));
    details.appendChild(createParagraph(`Saving Throws: ${data.saving_throws.join(', ')}`));
  } catch (e) {
    details.textContent = 'Errore caricando i dettagli della classe.';
  }
  modal.classList.remove('hidden');
}

function closeClassModal() {
  const modal = document.getElementById('classModal');
  if (modal) modal.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Main.js caricato!');

  loadDropdownData('data/races.json', 'raceSelect', 'races');
  loadDropdownData('data/classes.json', 'classSelect', 'classes');
  renderClassList();
  renderRaceList();
  renderBackgroundList();
  loadLanguages(langs => {
    setAvailableLanguages(langs);
  });

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

  document.getElementById('closeClassModal').addEventListener('click', closeClassModal);
  document.getElementById('closeRaceModal').addEventListener('click', closeRaceModal);
  document.getElementById('closeBackgroundModal').addEventListener('click', closeBackgroundModal);
  document.getElementById('closeEquipmentModal').addEventListener('click', closeEquipmentModal);
  document.getElementById('addClassButton').addEventListener('click', () => {
    const classSelect = document.getElementById('classSelect');
    if (classSelect) {
      classSelect.value = pendingClassPath;
      classSelect.dispatchEvent(new Event('change'));
    }
    closeClassModal();
  });

  document.getElementById('addRaceButton').addEventListener('click', () => {
    const raceSelect = document.getElementById('raceSelect');
    if (raceSelect) {
      raceSelect.value = pendingRacePath;
      displayRaceTraits();
      const confirmBtn = document.getElementById('confirmRaceSelection');
      if (confirmBtn) confirmBtn.style.display = 'inline-block';
    }
    closeRaceModal();
  });

  document.getElementById('addBackgroundButton').addEventListener('click', () => {
    const bgSelect = document.getElementById('backgroundSelect');
    if (bgSelect) {
      bgSelect.value = pendingBackgroundPath;
      bgSelect.dispatchEvent(new Event('change'));
      const confirmBtn = document.getElementById('confirmBackgroundSelection');
      if (confirmBtn) confirmBtn.style.display = 'inline-block';
    }
    closeBackgroundModal();
  });

  document.getElementById('openEquipmentModal').addEventListener('click', openEquipmentModal);

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

  document.getElementById('confirmEquipment').addEventListener('click', () => {
    closeEquipmentModal();
    const list = document.getElementById('equipmentList');
    const eq = getSelectedData().equipment;
    if (list && eq) {
      const items = [...(eq.standard || []), ...(eq.class || []), ...(eq.upgrades || [])];
      list.innerHTML = items.length
        ? `<p><strong>Equipaggiamento scelto:</strong> ${items.join(', ')}</p>`
        : '';
    }
  });

});
