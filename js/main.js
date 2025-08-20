import { showStep, loadFormData } from './ui.js';
import { loadDropdownData, loadLanguages } from './common.js';
import {
  updateSubclasses,
  renderClassFeatures,
  displayRaceTraits,
  generateFinalJson,
  initializeValues,
  setAvailableLanguages,
  renderFinalRecap
} from './script.js';
import './step4.js';
import './step5.js';
import './step7.js';

let classSelectionConfirmed = false;
let pendingClassPath = '';
let pendingRacePath = '';
let pendingBackgroundPath = '';

async function renderClassList() {
  try {
    const res = await fetch('data/classes.json');
    const data = await res.json();
    const list = document.getElementById('classList');
    if (!list) return;
    Object.entries(data.classes).forEach(([name, path]) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = name;
      btn.addEventListener('click', () => showClassModal(name, path));
      list.appendChild(btn);
    });
  } catch (err) {
    console.error('Errore caricando le classi', err);
  }
}

async function renderRaceList() {
  try {
    const res = await fetch('data/races.json');
    const data = await res.json();
    const list = document.getElementById('raceList');
    if (!list) return;
    Object.entries(data.races).forEach(([name, path]) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = name;
      btn.addEventListener('click', () => showRaceModal(name, path));
      list.appendChild(btn);
    });
  } catch (err) {
    console.error('Errore caricando le razze', err);
  }
}

async function showRaceModal(name, path) {
  pendingRacePath = path;
  const modal = document.getElementById('raceModal');
  const details = document.getElementById('raceModalDetails');
  if (!modal || !details) return;
  try {
    const res = await fetch(path);
    const data = await res.json();
    details.innerHTML = `<h3>${data.name}</h3>`;
  } catch (e) {
    details.textContent = 'Errore caricando i dettagli della razza.';
  }
  modal.classList.remove('hidden');
}

function closeRaceModal() {
  const modal = document.getElementById('raceModal');
  if (modal) modal.classList.add('hidden');
}

async function renderBackgroundList() {
  try {
    const res = await fetch('data/backgrounds.json');
    const data = await res.json();
    const list = document.getElementById('backgroundList');
    if (!list) return;
    Object.entries(data.backgrounds).forEach(([name, path]) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = name;
      btn.addEventListener('click', () => showBackgroundModal(name, path));
      list.appendChild(btn);
    });
  } catch (err) {
    console.error('Errore caricando i background', err);
  }
}

async function showBackgroundModal(name, path) {
  pendingBackgroundPath = path;
  const modal = document.getElementById('backgroundModal');
  const details = document.getElementById('backgroundModalDetails');
  if (!modal || !details) return;
  try {
    const res = await fetch(path);
    const data = await res.json();
    const skills = data.skills ? `<p><strong>Abilità:</strong> ${data.skills.join(', ')}</p>` : '';
    const tools = data.tools && data.tools.length ? `<p><strong>Strumenti:</strong> ${data.tools.join(', ')}</p>` : '';
    details.innerHTML = `<h3>${data.name}</h3>${skills}${tools}`;
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
    const data = await res.json();
    details.innerHTML = `<h3>${data.name}</h3><p>${data.description}</p><p><strong>Hit Die:</strong> ${data.hit_die}</p><p><strong>Saving Throws:</strong> ${data.saving_throws.join(', ')}</p>`;
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
      if (window.selectedData) {
        Object.keys(window.selectedData).forEach(k => delete window.selectedData[k]);
        sessionStorage.setItem('selectedData', JSON.stringify(window.selectedData));
      }
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
    const eq = window.selectedData?.equipment;
    if (list && eq) {
      const items = [...(eq.standard || []), ...(eq.class || []), ...(eq.upgrades || [])];
      list.innerHTML = items.length
        ? `<p><strong>Equipaggiamento scelto:</strong> ${items.join(', ')}</p>`
        : '';
    }
  });

});
