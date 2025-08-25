import {
  DATA,
  CharacterState,
  loadClasses,
  logCharacterState,
  loadFeats,
  totalLevel,
  updateSpellSlots,
  updateProficiencyBonus,
} from './data.js';
import { t } from './i18n.js';

/**
 * Temporary state for the currently edited class
 */
let currentClass = null;
const savedSelections = { skills: [], subclass: '', choices: {} };

/**
 * Reset base data from CharacterState before applying classes
 */
function refreshBaseState() {
  // Take snapshot of original proficiencies and abilities
  CharacterState._base = {
    skills: [...CharacterState.system.skills],
    tools: [...CharacterState.system.tools],
    languages: [...CharacterState.system.traits.languages.value],
    cantrips: [...(CharacterState.system.spells.cantrips || [])],
    feats: [...(CharacterState.feats || [])],
    abilities: Object.fromEntries(
      Object.entries(CharacterState.system.abilities).map(([k, v]) => [k, v.value || 0])
    )
  };
}

/**
 * Rebuilds the entire character state from selected classes
 */
function rebuildFromClasses() {
  const base = CharacterState._base || {};
  const skills = new Set(base.skills || []);
  const tools = new Set(base.tools || []);
  const languages = new Set(base.languages || []);
  const cantrips = new Set(base.cantrips || []);
  const feats = new Set(base.feats || []);
  const abilities = { ...(base.abilities || {}) };

  (CharacterState.classes || []).forEach(cls => {
    (cls.skills || []).forEach(s => skills.add(s));
    if (cls.fixed_proficiencies) cls.fixed_proficiencies.forEach(l => languages.add(l));
    if (cls.choiceSelections) {
      Object.values(cls.choiceSelections).forEach(entries =>
        entries.forEach(e => {
          if (e.type === 'skills') skills.add(e.option);
          if (e.type === 'tools') tools.add(e.option);
          if (e.type === 'languages') languages.add(e.option);
          if (e.type === 'cantrips') cantrips.add(e.option);
          if (e.feat) feats.add(e.feat);
        })
      );
    }
    if (cls.asiBonuses) {
      for (const [ab, val] of Object.entries(cls.asiBonuses)) {
        abilities[ab] = (abilities[ab] || 0) + val;
      }
    }
  });

  CharacterState.system.skills = [...skills];
  CharacterState.system.tools = [...tools];
  CharacterState.system.traits.languages.value = [...languages];
  CharacterState.system.spells.cantrips = [...cantrips];
  CharacterState.feats = [...feats];
  for (const [ab, val] of Object.entries(abilities)) {
    CharacterState.system.abilities[ab].value = val;
  }

  updateSpellSlots();
  updateProficiencyBonus();
  renderSelectedClasses();
}

/**
 * Main entrypoint for Step 2
 */
export async function loadStep2(refresh = true) {
  const classListContainer = document.getElementById('classList');
  const featuresContainer = document.getElementById('classFeatures');
  const classActions = document.getElementById('classActions');
  const confirmClassBtn = document.getElementById('confirmClassButton');
  const levelContainer = document.getElementById('levelContainer');
  const levelSelect = document.getElementById('levelSelect');
  const addClassPrompt = document.getElementById('addClassPrompt');
  const addClassLink = document.getElementById('addClassLink');
  const changeClassBtn = document.getElementById('changeClassButton');

  if (refresh) refreshBaseState();
  classListContainer.innerHTML = '';
  featuresContainer.innerHTML = '';

  try {
    await loadClasses();
    await loadFeats();
  } catch (err) {
    console.error('Dati classi non disponibili.', err);
    return;
  }

  renderSelectedClasses();

  // --- If editing/adding a class
  if (currentClass) {
    classListContainer.classList.add('hidden');
    featuresContainer.classList.remove('hidden');
    classActions.classList.remove('hidden');
    levelContainer.classList.remove('hidden');
    confirmClassBtn.classList.remove('hidden');
    changeClassBtn.classList.add('hidden');
    addClassPrompt.classList.remove('hidden');

    // Hook add-class link (multiclass)
    addClassLink.onclick = e => {
      e.preventDefault();
      confirmClassSelection(true);
      showClassSelectionModal();
    };

    // Level selector
    if (levelSelect) {
      levelSelect.value = currentClass.level || '1';
      levelSelect.onchange = () => {
        const lvl = parseInt(levelSelect.value, 10) || 1;
        currentClass.level = lvl;
        if (totalLevel() + lvl > 20) {
          alert('Total level cannot exceed 20');
          levelSelect.value = currentClass.level;
        }
        renderClassFeatures(currentClass);
      };
    }

    renderClassFeatures(currentClass);

    confirmClassBtn.onclick = confirmClassSelection;
    return;
  }

  // --- If classes already confirmed
  if (CharacterState.classes.length) {
    classListContainer.classList.add('hidden');
    featuresContainer.classList.add('hidden');
    classActions.classList.remove('hidden');
    levelContainer.classList.add('hidden');
    confirmClassBtn.classList.add('hidden');
    changeClassBtn.classList.add('hidden');
    addClassPrompt.classList.remove('hidden');

    addClassLink.onclick = e => {
      e.preventDefault();
      showClassSelectionModal();
    };
    return;
  }

  // --- First-time landing: show list of all classes
  classListContainer.classList.remove('hidden');
  featuresContainer.classList.add('hidden');
  classActions.classList.add('hidden');
  levelContainer.classList.add('hidden');

  (DATA.classes || []).forEach(cls => {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.addEventListener('click', () => showClassModal(cls));
    card.appendChild(createElement('h3', cls.name));
    card.appendChild(createElement('p', cls.description || 'Nessuna descrizione.'));
    classListContainer.appendChild(card);
  });
}

/**
 * Render summary of selected classes
 */
function renderSelectedClasses() {
  const container = document.getElementById('selectedClasses');
  if (!container) return;
  container.innerHTML = '';

  if (CharacterState.classes.length) {
    const summaryText = CharacterState.classes
      .map(c => `${c.name} ${c.level}`)
      .join(', ');
    container.appendChild(createElement('p', `${t('selectedClasses', { classes: summaryText, level: totalLevel() })}`));
    container.appendChild(createElement('p', t('proficiencyBonus', { value: CharacterState.system.attributes.prof })));
  }

  CharacterState.classes.forEach((cls, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'saved-class';
    const header = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = `${cls.name} (${t('level')} ${cls.level})`;
    header.appendChild(title);

    const actions = document.createElement('div');
    const editBtn = createElement('button', t('edit'));
    editBtn.className = 'btn btn-primary';
    editBtn.onclick = () => editClass(idx);
    const removeBtn = createElement('button', t('remove'));
    removeBtn.className = 'btn btn-danger';
    removeBtn.onclick = () => removeClass(idx);
    actions.appendChild(editBtn);
    actions.appendChild(removeBtn);

    header.appendChild(actions);
    wrapper.appendChild(header);
    container.appendChild(wrapper);
  });
}

// Duplicate-selection prevention
export function updateSkillSelectOptions(skillSelectsList, choiceSkillSelectsList = []) {
  const taken = new Set(CharacterState.system.skills);
  choiceSkillSelectsList.forEach(sel => {
    if (sel.value) taken.add(sel.value);
  });
  skillSelectsList.forEach(sel => {
    if (sel.value) taken.add(sel.value);
  });
  skillSelectsList.forEach(sel => {
    Array.from(sel.options).forEach(opt => {
      if (opt.value && opt.value !== sel.value && taken.has(opt.value)) {
        opt.disabled = true;
      } else {
        opt.disabled = false;
      }
    });
  });
}

export function updateChoiceSelectOptions(
  selects,
  type,
  skillSelectsList = [],
  allSkillChoiceSelects = []
) {
  const taken = new Set();
  if (type === 'skills') {
    (CharacterState.system.skills || []).forEach(s => taken.add(s));
    skillSelectsList.forEach(sel => {
      if (sel.value) taken.add(sel.value);
    });
    allSkillChoiceSelects.forEach(sel => {
      if (!selects.includes(sel) && sel.value) taken.add(sel.value);
    });
  }
  selects.forEach(sel => {
    if (sel.value) taken.add(sel.value);
  });
  selects.forEach(sel => {
    Array.from(sel.options).forEach(opt => {
      if (opt.value && opt.value !== sel.value && taken.has(opt.value)) {
        opt.disabled = true;
      } else {
        opt.disabled = false;
      }
    });
  });
}

// --- Utilities (your existing createElement, showClassModal, selectClass, etc. stay unchanged)

function createElement(tag, text) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  return el;
}

function showClassModal(cls) {
  const modal = document.getElementById('classModal');
  const details = document.getElementById('classModalDetails');
  const addBtn = document.getElementById('addClassButton');
  if (!modal || !details || !addBtn) return;
  details.innerHTML = '';
  details.appendChild(createElement('h2', cls.name));
  details.appendChild(createElement('p', cls.description || 'Nessuna descrizione disponibile.'));
  addBtn.onclick = () => selectClass(cls);
  modal.classList.remove('hidden');
}

function selectClass(cls) {
  savedSelections.skills = [];
  savedSelections.subclass = '';
  savedSelections.choices = {};
  currentClass = { name: cls.name, level: 1 };
  document.getElementById('classModal')?.classList.add('hidden');
  loadStep2(false);
}

// Editing/removing
function editClass(index) {
  currentClass = CharacterState.classes.splice(index, 1)[0];
  loadStep2(false);
}
function removeClass(index) {
  CharacterState.classes.splice(index, 1);
  rebuildFromClasses();
  loadStep2(false);
}

// Placeholder: build features UI
function renderClassFeatures(cls) {
  const container = document.getElementById('classFeatures');
  if (!container) return;
  container.innerHTML = '';
  container.appendChild(createElement('h3', `${cls.name} (Level ${cls.level})`));
  // TODO: re-attach your feature-choice rendering here
}

function confirmClassSelection() {
  if (!currentClass) return;
  if (totalLevel() + currentClass.level > 20) {
    alert('Total level cannot exceed 20');
    return;
  }
  CharacterState.classes.push(currentClass);
  currentClass = null;
  rebuildFromClasses();
  logCharacterState();
  loadStep2(false);
}
