import { getSelectedData, setSelectedData, saveSelectedData } from './state.js';
import { showStep } from './ui.js';
import { displayRaceTraits, renderClassFeatures, getTakenProficiencies, initializeAccordion } from './script.js';

export const extraCategoryAliases = {
  "Cantrip": "Cantrips",
  "Cantrips": "Cantrips",
  "Skill Proficiency": "Skill Proficiency",
  "Tool Proficiency": "Tool Proficiency",
  "Fighting Style": "Fighting Style",
  "Additional Fighting Style": "Fighting Style",
  "Divine Domain": "Divine Domain",
  "Metamagic": "Metamagic",
};

export const extraCategoryDescriptions = {
  "Cantrips": "Scegli i tuoi cantrip.",
  "Skill Proficiency": "Seleziona le competenze nelle abilità.",
  "Tool Proficiency": "Seleziona le competenze negli strumenti.",
  "Fighting Style": "Scegli il tuo stile di combattimento.",
  "Divine Domain": "Seleziona il tuo dominio divino.",
  "Metamagic": "Scegli le opzioni di Metamagia.",
};

let selectedData = getSelectedData();
let extraSelections = [];
let currentSelectionIndex = 0;
let extraModalContext = '';

const prevTraitEl = document.getElementById('prevTrait');
const nextTraitEl = document.getElementById('nextTrait');
const closeModalEl = document.getElementById('closeModal');

export function openExtrasModal(selections, context = 'race') {
  if (!selections || selections.length === 0) {
    console.warn('⚠️ Nessuna selezione extra disponibile, il pop-up non verrà mostrato.');
    return;
  }

  extraSelections = selections;
  currentSelectionIndex = 0;
  extraModalContext = context;

  const containerId = context === 'class' ? 'classExtrasAccordion' : 'raceExtraTraitsContainer';
  const container = document.getElementById(containerId);
  if (!container) return;
  container.classList.remove('hidden');

  selections.forEach(selection => {
    const key = extraCategoryAliases[selection.name] || selection.name;
    if (!selectedData[key]) {
      selectedData[key] = [];
    }
  });

  container.innerHTML = '';

  selections.forEach((selection) => {
    const categoryKey = extraCategoryAliases[selection.name] || selection.name;
    const item = document.createElement('div');
    item.classList.add('accordion-item', 'user-choice');

    const header = document.createElement('button');
    header.type = 'button';
    header.classList.add('accordion-header');
    header.textContent = selection.name;
    item.appendChild(header);

    const content = document.createElement('div');
    content.classList.add('accordion-content');

    for (let i = 0; i < selection.count; i++) {
      const sel = document.createElement('select');
      sel.classList.add('extra-selection');
      sel.dataset.category = categoryKey;
      sel.dataset.index = i;
      sel.innerHTML = `<option value="">Seleziona...</option>` +
        selection.selection.map(opt => `<option value="${opt}">${opt}</option>`).join('');
      content.appendChild(sel);

      sel.addEventListener('change', e => {
        const category = e.target.dataset.category;
        const index = e.target.dataset.index;
        if (!selectedData[category]) {
          selectedData[category] = [];
        }
        selectedData[category][index] = e.target.value;
        saveSelectedData();
        updateExtraSelectionsView();
      });
    }

    item.appendChild(content);
    container.appendChild(item);
  });

  initializeAccordion(container);
  updateExtraSelectionsView();
}

export function updateExtraSelectionsView() {
  selectedData = getSelectedData();

  function updateContainer(id, title, dataKey) {
    const container = document.getElementById(id);
    if (!container) return;
    const values = (selectedData[dataKey] || []).filter(v => v);
    if (values.length > 0) {
      container.innerHTML = `<p><strong>${title}:</strong> ${values.join(', ')}</p>`;
      container.classList.remove('hidden');
    } else {
      container.innerHTML = '';
      container.classList.add('hidden');
    }
  }

  const summaryMap = extraModalContext === 'class' ? {} : {
    'Languages': ['languageSelection', 'Lingue Extra'],
    'Skill Proficiency': ['skillSelectionContainer', 'Skill Proficiency'],
    'Tool Proficiency': ['toolSelectionContainer', 'Tool Proficiency'],
  };
  Object.entries(summaryMap).forEach(([key, [id, title]]) => {
    if (selectedData[key] !== undefined) {
      updateContainer(id, title, key);
    } else {
      const container = document.getElementById(id);
      if (container) container.classList.add('hidden');
    }
  });

  if (!extraSelections || extraSelections.length === 0) return;

  const titleElem = document.getElementById('extraSelectionTitle');
  const descElem = document.getElementById('extraSelectionDescription');
  const selectionElem = document.getElementById('extraSelectionContainer');
  if (!titleElem || !descElem || !selectionElem) return;

  const currentSelection = extraSelections[currentSelectionIndex];
  titleElem.innerText = currentSelection.name;
  const desc = currentSelection.description || extraCategoryDescriptions[currentSelection.name] || '';
  descElem.innerText = desc;
  selectionElem.innerHTML = '';

  if (currentSelection.selection) {
    const categoryKey = extraCategoryAliases[currentSelection.name] || currentSelection.name;
    const typeLookup = {
      Languages: 'languages',
      'Skill Proficiency': 'skills',
      'Tool Proficiency': 'tools',
    };
    const taken = new Set(getTakenProficiencies(typeLookup[categoryKey] || ''));
    const selectedValues = new Set((selectedData[categoryKey] || []).filter(v => v));
    taken.forEach(v => selectedValues.add(v));

    let dropdownHTML = '';
    for (let i = 0; i < currentSelection.count; i++) {
      dropdownHTML += `<select class="extra-selection" data-category="${categoryKey}" data-index="${i}">` +
                        `<option value="">Seleziona...</option>`;
      currentSelection.selection.forEach(option => {
        const disabled = selectedValues.has(option) && !selectedData[categoryKey]?.includes(option);
        dropdownHTML += `<option value="${option}" ${disabled ? 'disabled' : ''}>${option}</option>`;
      });
      dropdownHTML += `</select><br>`;
    }
    selectionElem.innerHTML = dropdownHTML;

    document.querySelectorAll('.extra-selection').forEach(select => {
      select.addEventListener('change', event => {
        const rawCategory = event.target.getAttribute('data-category');
        const category = extraCategoryAliases[rawCategory] || rawCategory;
        const index = event.target.getAttribute('data-index');
        if (!selectedData[category]) {
          selectedData[category] = [];
        }
        selectedData[category][index] = event.target.value;
        saveSelectedData();
        updateExtraSelectionsView();
      });
    });
  }

  if (prevTraitEl && nextTraitEl && closeModalEl) {
    prevTraitEl.disabled = (currentSelectionIndex === 0);
    nextTraitEl.disabled = (currentSelectionIndex === extraSelections.length - 1);

    const allChoicesFilled = extraSelections.every(sel =>
      selectedData[sel.name] && selectedData[sel.name].filter(v => v).length === sel.count
    );

    if (currentSelectionIndex === extraSelections.length - 1 && allChoicesFilled) {
      closeModalEl.style.display = 'inline-block';
    } else {
      closeModalEl.style.display = 'none';
    }
  }
}

export function showExtraSelection() {
  if (!extraSelections || extraSelections.length === 0) return;
  updateExtraSelectionsView();
}

if (prevTraitEl && nextTraitEl) {
  prevTraitEl.addEventListener('click', () => {
    if (currentSelectionIndex > 0) {
      currentSelectionIndex--;
      showExtraSelection();
    }
  });

  nextTraitEl.addEventListener('click', () => {
    if (currentSelectionIndex < extraSelections.length - 1) {
      currentSelectionIndex++;
      showExtraSelection();
    }
  });
}

if (closeModalEl) {
  closeModalEl.addEventListener('click', () => {
    const raceModal = document.getElementById('raceExtrasModal');
    if (raceModal) raceModal.classList.add('hidden');
    sessionStorage.removeItem('popupOpened');
    saveSelectedData();
    if (extraModalContext === 'race') {
      showStep('step3');
      setTimeout(() => {
        displayRaceTraits();
        setTimeout(() => {
          updateExtraSelectionsView();
        }, 500);
      }, 300);
    } else if (extraModalContext === 'class') {
      renderClassFeatures();
    }
  });
}

updateExtraSelectionsView();
