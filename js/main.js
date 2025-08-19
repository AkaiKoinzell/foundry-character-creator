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
  setAvailableLanguages
} from './script.js';
import './step4.js';
import './step5.js';

let classSelectionConfirmed = false;

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Main.js caricato!');
  const modal = document.getElementById('raceExtrasModal');
  if (modal) modal.style.display = 'none';

  if (sessionStorage.getItem('popupOpened') === 'true') {
    console.log('🛑 Il pop-up non verrà riaperto automaticamente.');
    sessionStorage.removeItem('popupOpened');
  }

  loadDropdownData('data/races.json', 'raceSelect', 'races');
  loadDropdownData('data/classes.json', 'classSelect', 'classes');
  loadLanguages(langs => {
    setAvailableLanguages(langs);
  });

  ['step1','step2','step3','step4','step5','step6','step7'].forEach((stepId, idx) => {
    const btn = document.getElementById(`btnStep${idx + 1}`);
    if (btn) btn.addEventListener('click', () => showStep(stepId));
  });

  const classSelectElem = document.getElementById('classSelect');
  const subclassSelectElem = document.getElementById('subclassSelect');
  const levelSelectElem = document.getElementById('levelSelect');
  if (classSelectElem) classSelectElem.addEventListener('change', updateSubclasses);
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

  document.getElementById('raceSelect').addEventListener('change', displayRaceTraits);
  document.getElementById('levelSelect').addEventListener('change', () => displayRaceTraits());
  document.getElementById('generateJson').addEventListener('click', generateFinalJson);

  document.getElementById('confirmClassSelection').addEventListener('click', async () => {
    const classSelect = document.getElementById('classSelect');
    const subclassSelect = document.getElementById('subclassSelect');
    if (!classSelect.value) {
      alert('⚠️ Seleziona una classe prima di procedere!');
      return;
    }
    if (subclassSelect.style.display !== 'none' && !subclassSelect.value) {
      alert('⚠️ Seleziona una sottoclasse prima di procedere!');
      return;
    }
    classSelectionConfirmed = true;
    const selections = await renderClassFeatures();
    if (selections.length > 0) {
      openExtrasModal(selections, 'class');
    }
    classSelect.disabled = true;
    subclassSelect.disabled = true;
    document.getElementById('confirmClassSelection').style.display = 'none';
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
        document.getElementById('raceTraits').style.display = 'none';
        const selections = gatherExtraSelections(raceData, 'race');
        if (raceData.spellcasting && raceData.spellcasting.spell_choices && raceData.spellcasting.spell_choices.type === 'filter') {
          loadSpells(spellList => {
            const filtered = filterSpells(spellList, raceData.spellcasting.spell_choices.filter).map(spell => spell.name);
            selections.push({ name: 'Cantrips', description: 'Choose a spell.', selection: filtered, count: 1 });
            sessionStorage.setItem('popupOpened', 'true');
            openExtrasModal(selections);
          });
        } else {
          sessionStorage.setItem('popupOpened', 'true');
          openExtrasModal(selections);
        }
        document.getElementById('confirmRaceSelection').style.display = 'none';
      })
      .catch(error => handleError('Errore caricando i dati della razza: ' + error));
  });

});
