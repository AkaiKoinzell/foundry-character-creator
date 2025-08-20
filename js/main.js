import { showStep, loadFormData } from './ui.js';
import { convertRaceData } from './raceData.js';
import { loadSpells, filterSpells } from './spellcasting.js';
import { loadDropdownData, loadLanguages, handleError } from './common.js';
import {
  gatherExtraSelections,
  updateSubclasses,
  renderClassFeatures,
  openExtrasModal,
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
  modal.classList.add('show');
}

function closeClassModal() {
  const modal = document.getElementById('classModal');
  if (modal) modal.classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Main.js caricato!');

  loadDropdownData('data/races.json', 'raceSelect', 'races');
  loadDropdownData('data/classes.json', 'classSelect', 'classes');
  renderClassList();
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
  const subclassSelectElem = document.getElementById('subclassSelect');
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
  if (subclassSelectElem)
    subclassSelectElem.addEventListener('change', async () => {
      const selections = await renderClassFeatures();
      if (classSelectionConfirmed && selections.length > 0) {
        openExtrasModal(selections, 'class');
      }
    });
  if (levelSelectElem)
    levelSelectElem.addEventListener('change', async () => {
      const selections = await renderClassFeatures();
      if (classSelectionConfirmed && selections.length > 0) {
        openExtrasModal(selections, 'class');
      }
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
  document.getElementById('addClassButton').addEventListener('click', () => {
    const classSelect = document.getElementById('classSelect');
    if (classSelect) {
      classSelect.value = pendingClassPath;
      classSelectionConfirmed = false;
      if (window.selectedData) {
        Object.keys(window.selectedData).forEach(k => delete window.selectedData[k]);
        sessionStorage.setItem('selectedData', JSON.stringify(window.selectedData));
      }
      updateSubclasses();
      const confirmBtn = document.getElementById('confirmClassSelection');
      if (confirmBtn) confirmBtn.style.display = 'inline-block';
    }
    closeClassModal();
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
    if (subclassSelect.style.display !== 'none' && level >= requiredLevel && !subclassSelect.value) {
      alert('⚠️ Seleziona una sottoclasse prima di procedere!');
      return;
    }
    classSelectionConfirmed = true;
    const selections = await renderClassFeatures();
    if (selections.length > 0) {
      openExtrasModal(selections, 'class');
    }
  });

  document.getElementById('confirmRaceSelection').addEventListener('click', () => {
    const selectedRace = document.getElementById('raceSelect').value;
    if (!selectedRace) {
      alert('⚠️ Seleziona una razza prima di procedere!');
      return;
    }

    fetch(selectedRace)
      .then(response => response.json())
      .then(data => {
        const raceData = convertRaceData(data);
        const selections = gatherExtraSelections(raceData, 'race');
        if (raceData.spellcasting && raceData.spellcasting.spell_choices && raceData.spellcasting.spell_choices.type === 'filter') {
          loadSpells(spellList => {
            const filtered = filterSpells(spellList, raceData.spellcasting.spell_choices.filter).map(spell => spell.name);
            selections.push({ name: 'Cantrips', description: 'Choose a spell.', selection: filtered, count: 1 });
            openExtrasModal(selections);
          });
        } else {
          openExtrasModal(selections);
        }
        document.getElementById('confirmRaceSelection').style.display = 'none';
      })
      .catch(error => handleError('Errore caricando i dati della razza: ' + error));
  });

});
