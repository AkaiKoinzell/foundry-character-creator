import {
  DATA,
  CharacterState,
  loadClasses,
  logCharacterState,
  loadFeats,
  totalLevel,
  updateSpellSlots,
  updateProficiencyBonus,
  MAX_CHARACTER_LEVEL,
} from './data.js';
import { t } from './i18n.js';
import { createElement, createAccordionItem } from './ui-helpers.js';

const abilityMap = {
  Strength: 'str',
  Dexterity: 'dex',
  Constitution: 'con',
  Intelligence: 'int',
  Wisdom: 'wis',
  Charisma: 'cha',
};

// Snapshot of the character's proficiencies and abilities before any class
// data is applied. This allows us to cleanly rebuild the derived state when a
// class is edited or removed.
const baseState = {
  skills: [],
  tools: [],
  languages: [],
  cantrips: [],
  feats: [],
  abilities: {},
};

function refreshBaseState() {
  baseState.skills = [...CharacterState.system.skills];
  baseState.tools = [...CharacterState.system.tools];
  baseState.languages = [...CharacterState.system.traits.languages.value];
  baseState.cantrips = Array.isArray(CharacterState.system.spells.cantrips)
    ? [...CharacterState.system.spells.cantrips]
    : [];
  baseState.feats = Array.isArray(CharacterState.feats)
    ? [...CharacterState.feats]
    : [];
  for (const [ab, obj] of Object.entries(CharacterState.system.abilities)) {
    baseState.abilities[ab] = obj.value || 0;
  }
}

function rebuildFromClasses() {
  const skills = new Set(baseState.skills);
  const tools = new Set(baseState.tools);
  const languages = new Set(baseState.languages);
  const cantrips = new Set(baseState.cantrips);
  const feats = new Set(baseState.feats);
  const abilities = { ...baseState.abilities };

  (CharacterState.classes || []).forEach(cls => {
    (cls.skills || []).forEach(s => skills.add(s));
    if (Array.isArray(cls.fixed_proficiencies)) {
      cls.fixed_proficiencies.forEach(l => languages.add(l));
    }
    if (cls.choiceSelections) {
      Object.values(cls.choiceSelections).forEach(entries => {
        entries.forEach(e => {
          if (e.type === 'skills') skills.add(e.option);
          else if (e.type === 'tools') tools.add(e.option);
          else if (e.type === 'languages') languages.add(e.option);
          else if (e.type === 'cantrips') cantrips.add(e.option);
          if (e.feat) feats.add(e.feat);
        });
      });
    }
    const bonuses = cls.asiBonuses || {};
    for (const ab of Object.keys(abilities)) {
      abilities[ab] += bonuses[ab] || 0;
    }
  });

  CharacterState.system.skills = Array.from(skills);
  CharacterState.system.tools = Array.from(tools);
  CharacterState.system.traits.languages.value = Array.from(languages);
  CharacterState.system.spells.cantrips = Array.from(cantrips);
  CharacterState.feats = Array.from(feats);
  for (const [ab, val] of Object.entries(abilities)) {
    CharacterState.system.abilities[ab].value = val;
  }
  updateSpellSlots();
  updateProficiencyBonus();
}

function validateTotalLevel(pendingClass) {
  const pending = pendingClass?.level || 0;
  const existing = totalLevel();
  if (existing + pending > MAX_CHARACTER_LEVEL) {
    const allowed = Math.max(0, MAX_CHARACTER_LEVEL - existing);
    if (pendingClass) pendingClass.level = allowed;
    if (typeof alert !== 'undefined')
      alert(t('levelCap', { max: MAX_CHARACTER_LEVEL }));
    return false;
  }
  return true;
}

function getProficiencyList(type) {
  if (type === 'skills') return CharacterState.system.skills;
  if (type === 'tools') return CharacterState.system.tools;
  if (type === 'languages') return CharacterState.system.traits.languages.value;
  if (type === 'cantrips') return CharacterState.system.spells.cantrips;
  return [];
}

function updateSkillSelectOptions(skillSelectsList, choiceSkillSelectsList = []) {
  // Track how many times each skill is already known/selected
  const counts = new Map();
  const add = val => {
    if (!val) return;
    counts.set(val, (counts.get(val) || 0) + 1);
  };
  const subtract = val => {
    if (!val) return;
    const newCount = (counts.get(val) || 0) - 1;
    if (newCount <= 0) counts.delete(val);
    else counts.set(val, newCount);
  };

  // Start from the character's known skills
  CharacterState.system.skills.forEach(add);

  // Remove the current class's selections before recounting
  skillSelectsList.forEach(sel => subtract(sel.value));
  choiceSkillSelectsList.forEach(sel => subtract(sel.value));

  // Add the current selections back once to track duplicates correctly
  skillSelectsList.forEach(sel => add(sel.value));
  choiceSkillSelectsList.forEach(sel => add(sel.value));

  skillSelectsList.forEach(sel => {
    Array.from(sel.options).forEach(opt => {
      if (!opt.value) return;
      const count = counts.get(opt.value) || 0;
      const isCurrent = sel.value === opt.value;
      // Disable options if already taken elsewhere or from state
      opt.disabled = !isCurrent && count > 0;
    });

    // If current selection conflicts with known skill, clear it
    const currentCount = counts.get(sel.value) || 0;
    if (sel.value && currentCount > 1) {
      sel.value = '';
      sel.dispatchEvent(new Event('change'));
    }
  });
}

function updateChoiceSelectOptions(
  selects,
  type,
  skillSelectsList = [],
  allSkillChoiceSelects = []
) {
  const counts = new Map();
  const add = val => {
    if (!val) return;
    counts.set(val, (counts.get(val) || 0) + 1);
  };
  const subtract = val => {
    if (!val) return;
    const newCount = (counts.get(val) || 0) - 1;
    if (newCount <= 0) counts.delete(val);
    else counts.set(val, newCount);
  };

  if (type === 'skills') {
    getProficiencyList('skills').forEach(add);
    skillSelectsList.forEach(sel => add(sel.value));
    allSkillChoiceSelects.forEach(sel => {
      if (!selects.includes(sel)) add(sel.value);
    });
  } else {
    getProficiencyList(type).forEach(add);
  }

  // Remove the current selections before recounting
  selects.forEach(sel => subtract(sel.value));

  // Add the current selections back once to track duplicates correctly
  selects.forEach(sel => add(sel.value));

  selects.forEach(sel => {
    Array.from(sel.options).forEach(opt => {
      if (!opt.value) return;
      const count = counts.get(opt.value) || 0;
      const isCurrent = sel.value === opt.value;
      opt.disabled = !isCurrent && count > 0;
    });

    const currentCount = (counts.get(sel.value) || 0) - 1;
    if (sel.value && currentCount > 0) {
      sel.value = '';
      sel.dispatchEvent(new Event('change'));
    }
  });
}

function getExistingFeats() {
  const feats = new Set(CharacterState.feats || []);
  (CharacterState.classes || []).forEach(cls => {
    if (cls.choiceSelections) {
      Object.values(cls.choiceSelections).forEach(entries => {
        entries.forEach(e => {
          if (e.feat) feats.add(e.feat);
        });
      });
    }
  });
  return feats;
}

function updateFeatSelectOptions() {
  const selects = document.querySelectorAll("select[data-type='asi-feat']");
  const takenFromState = getExistingFeats();
  selects.forEach(sel => {
    const taken = new Set(takenFromState);
    selects.forEach(other => {
      if (other !== sel && other.value) taken.add(other.value);
    });
    Array.from(sel.options).forEach(opt => {
      if (opt.value && opt.value !== sel.value && taken.has(opt.value)) {
        opt.disabled = true;
      } else {
        opt.disabled = false;
      }
    });
  });
}

function compileClassFeatures(cls) {
  const data = DATA.classes.find(c => c.name === cls.name);
  if (!data) return;
  cls.features = [];
  for (let lvl = 1; lvl <= (cls.level || 1); lvl++) {
    const feats = data.features_by_level?.[lvl] || [];
    feats.forEach(f => {
      cls.features.push({
        level: lvl,
        name: f.name,
        description: f.description || '',
      });
    });
  }
  if (cls.choiceSelections) {
    for (const [name, entries] of Object.entries(cls.choiceSelections)) {
      entries.forEach(e => {
        cls.features.push({
          level: e.level || null,
          name: `${name}: ${e.option}`,
          abilities: e.abilities,
          feat: e.feat,
        });
      });
    }
  }
}

function createAbilitySelect() {
  const abilities = [
    'Strength',
    'Dexterity',
    'Constitution',
    'Intelligence',
    'Wisdom',
    'Charisma',
  ];
  const sel = document.createElement('select');
  sel.innerHTML = `<option value=''>${t('selectAbility')}</option>`;
  abilities.forEach(ab => {
    const o = document.createElement('option');
    o.value = ab;
    o.textContent = ab;
    sel.appendChild(o);
  });
  sel.dataset.type = 'asi-ability';
  return sel;
}

function createFeatSelect(current = '') {
  const sel = document.createElement('select');
  sel.innerHTML = `<option value=''>${t('selectFeat')}</option>`;
  const taken = getExistingFeats();
  (DATA.feats || []).forEach(feat => {
    if (!taken.has(feat) || feat === current) {
      const o = document.createElement('option');
      o.value = feat;
      o.textContent = feat;
      sel.appendChild(o);
    }
  });
  sel.dataset.type = 'asi-feat';
  return sel;
}

function handleASISelection(sel, container, entry, cls) {
  const existing = container.querySelectorAll(
    `select[data-parent='${sel.dataset.choiceId}']`
  );
  existing.forEach(e => e.remove());

  if (sel.value === 'Increase one ability score by 2') {
    const abilitySel = createAbilitySelect();
    abilitySel.dataset.parent = sel.dataset.choiceId;
    abilitySel.value = entry?.abilities?.[0] || '';
    abilitySel.addEventListener('change', () => {
      entry.abilities = [abilitySel.value];
      compileClassFeatures(cls);
      rebuildFromClasses();
      updateStep2Completion();
    });
    container.appendChild(abilitySel);
  } else if (sel.value === 'Increase two ability scores by 1') {
    for (let j = 0; j < 2; j++) {
      const abilitySel = createAbilitySelect();
      abilitySel.dataset.parent = sel.dataset.choiceId;
      abilitySel.value = entry?.abilities?.[j] || '';
      abilitySel.addEventListener('change', () => {
        const abilities = entry.abilities || [];
        abilities[j] = abilitySel.value;
        entry.abilities = abilities;
        compileClassFeatures(cls);
        rebuildFromClasses();
        updateStep2Completion();
      });
      container.appendChild(abilitySel);
    }
  } else if (sel.value === 'Feat') {
    const featSel = createFeatSelect(entry?.feat || '');
    featSel.dataset.parent = sel.dataset.choiceId;
    featSel.value = entry?.feat || '';
    featSel.addEventListener('change', () => {
      entry.feat = featSel.value;
      compileClassFeatures(cls);
      rebuildFromClasses();
      updateFeatSelectOptions();
      updateStep2Completion();
    });
    container.appendChild(featSel);
    updateFeatSelectOptions();
  }
}

function renderClassEditor(cls, index) {
  const card = document.createElement('div');
  card.className = 'saved-class';

  const header = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = `${cls.name}`;
  header.appendChild(title);

  const removeBtn = createElement('button', t('remove'));
  removeBtn.className = 'btn btn-danger';
  removeBtn.addEventListener('click', () => removeClass(index));
  header.appendChild(removeBtn);

  card.appendChild(header);

  const levelSel = document.createElement('select');
  for (let i = 1; i <= MAX_CHARACTER_LEVEL; i++) {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = i;
    levelSel.appendChild(o);
  }
  levelSel.value = cls.level || 1;
  levelSel.addEventListener('change', () => {
    const lvl = parseInt(levelSel.value, 10) || 1;
    if (!validateTotalLevel({ level: lvl })) {
      levelSel.value = cls.level || 1;
      return;
    }
    cls.level = lvl;
    if (cls.choiceSelections) {
      Object.keys(cls.choiceSelections).forEach(name => {
        cls.choiceSelections[name] = cls.choiceSelections[name].filter(
          e => (e.level || 1) <= cls.level
        );
        if (cls.choiceSelections[name].length === 0) delete cls.choiceSelections[name];
      });
    }
    compileClassFeatures(cls);
    rebuildFromClasses();
    updateStep2Completion();
  });
  card.appendChild(levelSel);

  const accordion = document.createElement('div');
  accordion.className = 'accordion';

  const skillSelects = [];
  const skillChoiceSelects = [];
  const skillChoiceSelectMap = new Map();

  const clsDef = DATA.classes.find(c => c.name === cls.name);
  if (clsDef) {
    if (clsDef.skill_proficiencies?.options) {
      const sContainer = document.createElement('div');
      const desc = document.createElement('p');
      desc.textContent = `${t('skillProficiencyExplanation')} ${t('chooseSkills', { count: clsDef.skill_proficiencies.choose })}`;
      sContainer.appendChild(desc);
      for (let i = 0; i < clsDef.skill_proficiencies.choose; i++) {
        const sel = document.createElement('select');
        sel.innerHTML = `<option value=''>${t('select')}</option>`;
        clsDef.skill_proficiencies.options.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          sel.appendChild(o);
        });
        sel.dataset.type = 'skill';
        sel.value = cls.skills?.[i] || '';
        skillSelects.push(sel);
        sel.addEventListener('change', () => {
          cls.skills = cls.skills || [];
          cls.skills[i] = sel.value;
          updateSkillSelectOptions(skillSelects, skillChoiceSelects);
          skillChoiceSelectMap.forEach(selects => {
            updateChoiceSelectOptions(selects, 'skills', skillSelects, skillChoiceSelects);
          });
          compileClassFeatures(cls);
          rebuildFromClasses();
          updateStep2Completion();
        });
        sContainer.appendChild(sel);
      }
      updateSkillSelectOptions(skillSelects, skillChoiceSelects);
      accordion.appendChild(
        createAccordionItem(t('skillProficiencies'), sContainer, true)
      );
    }

    if (Array.isArray(clsDef.subclasses) && clsDef.subclasses.length) {
      const subContainer = document.createElement('div');
      const desc = document.createElement('p');
      desc.textContent = t('chooseSubclass');
      subContainer.appendChild(desc);
      const sel = document.createElement('select');
      sel.innerHTML = `<option value=''>${t('select')}</option>`;
      clsDef.subclasses.forEach(sc => {
        const o = document.createElement('option');
        o.value = sc.name;
        o.textContent = sc.name;
        sel.appendChild(o);
      });
      sel.dataset.type = 'subclass';
      sel.value = cls.subclass || '';
      sel.addEventListener('change', () => {
        cls.subclass = sel.value;
        compileClassFeatures(cls);
        rebuildFromClasses();
        updateStep2Completion();
      });
      subContainer.appendChild(sel);
      accordion.appendChild(createAccordionItem(t('subclass'), subContainer, true));
    }

    for (let lvl = 1; lvl <= (cls.level || 1); lvl++) {
      const levelChoices = (clsDef.choices || []).filter(c => c.level === lvl);
      const features = (clsDef.features_by_level?.[lvl] || []).filter(
        f => !levelChoices.some(c => c.name === f.name)
      );
      features.forEach(f => {
        accordion.appendChild(
          createAccordionItem(`${t('level')} ${lvl}: ${f.name}`, f.description || '')
        );
      });

      levelChoices.forEach(choice => {
        const cContainer = document.createElement('div');
        const description = choice.description || t('choiceDescriptionDefault');
        const p = document.createElement('p');
        p.textContent = description;
        cContainer.appendChild(p);
        const count = choice.count || 1;
        const choiceSelects = [];
        cls.choiceSelections = cls.choiceSelections || {};
        const existing = cls.choiceSelections[choice.name] || [];
        for (let i = 0; i < count; i++) {
          const sel = document.createElement('select');
          sel.innerHTML = `<option value=''>${t('select')}</option>`;
          choice.selection.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            sel.appendChild(o);
          });
          sel.dataset.type = 'choice';
          sel.dataset.choiceName = choice.name;
          sel.dataset.choiceType = choice.type || '';
          const choiceId = `${choice.name}-${lvl}-${i}`;
          sel.dataset.choiceId = choiceId;
          const stored = existing[i];
          if (stored) sel.value = stored.option;
          choiceSelects.push(sel);
          if (choice.type === 'skills') {
            skillChoiceSelects.push(sel);
          }
          sel.addEventListener('change', () => {
            cls.choiceSelections[choice.name] = cls.choiceSelections[choice.name] || [];
            const arr = cls.choiceSelections[choice.name];
            const entry = arr[i] || { level: lvl, type: choice.type };
            entry.option = sel.value;
            arr[i] = entry;
            handleASISelection(sel, cContainer, entry, cls);
            updateChoiceSelectOptions(choiceSelects, choice.type, skillSelects, skillChoiceSelects);
            if (choice.type === 'skills') {
              updateSkillSelectOptions(skillSelects, skillChoiceSelects);
              skillChoiceSelectMap.forEach(selects => {
                updateChoiceSelectOptions(selects, 'skills', skillSelects, skillChoiceSelects);
              });
            }
            compileClassFeatures(cls);
            rebuildFromClasses();
            updateFeatSelectOptions();
            updateStep2Completion();
          });
          cContainer.appendChild(sel);
          if (stored) {
            handleASISelection(sel, cContainer, stored, cls);
          }
        }
        if (choice.type === 'skills') {
          skillChoiceSelectMap.set(choice.name, choiceSelects);
          updateSkillSelectOptions(skillSelects, skillChoiceSelects);
          skillChoiceSelectMap.forEach(selects => {
            updateChoiceSelectOptions(selects, 'skills', skillSelects, skillChoiceSelects);
          });
        } else {
          updateChoiceSelectOptions(choiceSelects, choice.type, skillSelects, skillChoiceSelects);
        }
        accordion.appendChild(
          createAccordionItem(
            `${t('level')} ${choice.level}: ${choice.name}`,
            cContainer,
            true,
            description
          )
        );
      });
    }
  }

  card.appendChild(accordion);
  return card;
}

function removeClass(index) {
  const classes = CharacterState.classes || [];
  if (index < 0 || index >= classes.length) return;

  if (
    typeof window !== 'undefined' &&
    typeof window.confirm === 'function'
  ) {
    const proceed = window.confirm(
      'Removing this class will also remove any spells, feats, or other choices derived from it. Continue?'
    );
    if (!proceed) return;
  }

  classes.splice(index, 1);
  rebuildFromClasses();
  renderSelectedClasses();
  updateStep2Completion();
}

function renderSelectedClasses() {
  const container = document.getElementById('selectedClasses');
  if (!container) return;
  container.innerHTML = '';
  const classes = CharacterState.classes || [];
  if (classes.length) {
    const summaryText = classes
      .map(c => `${c.name} (${t('level')} ${c.level})`)
      .join(', ');
    container.appendChild(
      createElement(
        'p',
        t('selectedClasses', { classes: summaryText, level: totalLevel() })
      )
    );
    container.appendChild(
      createElement('p',
        t('proficiencyBonus', {
          value: CharacterState.system.attributes.prof,
        })
      )
    );
  }

  classes.forEach((cls, index) => {
    const card = renderClassEditor(cls, index);
    container.appendChild(card);
  });

  const addLink = document.createElement('a');
  addLink.href = '#';
  addLink.textContent = t('addAnotherClass');
  addLink.addEventListener('click', e => {
    e.preventDefault();
    showClassSelectionModal();
  });
  const linkWrapper = document.createElement('p');
  linkWrapper.appendChild(addLink);
  container.appendChild(linkWrapper);
}

function showClassSelectionModal() {
  const modal = document.getElementById('classSelectionModal');
  const list = document.getElementById('classSelectionList');
  const closeBtn = document.getElementById('closeClassSelectionModal');
  if (!modal || !list) return;
  list.innerHTML = '';
  // Filter out classes that are already part of the character's build
  const taken = new Set((CharacterState.classes || []).map(c => c.name));

  (DATA.classes || []).forEach(cls => {
    if (taken.has(cls.name)) return;

    // Each remaining class is rendered as a clickable button
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = cls.name;
    btn.addEventListener('click', () => {
      modal.classList.add('hidden');
      selectClass(cls);
    });
    list.appendChild(btn);
  });

  // Reveal the modal and wire up the close action
  modal.classList.remove('hidden');
  if (closeBtn) {
    closeBtn.onclick = () => modal.classList.add('hidden');
  }
}

function classHasPendingChoices(cls) {
  const clsDef = DATA.classes.find(c => c.name === cls.name);
  if (!clsDef) return false;

  if (clsDef.skill_proficiencies?.options) {
    const required = clsDef.skill_proficiencies.choose || 0;
    if ((cls.skills || []).length < required) return true;
  }

  if (Array.isArray(clsDef.subclasses) && clsDef.subclasses.length && !cls.subclass) {
    return true;
  }

  const choices = (clsDef.choices || []).filter(c => c.level <= (cls.level || 1));
  for (const choice of choices) {
    const needed = choice.count || 1;
    const selections = cls.choiceSelections?.[choice.name] || [];
    if (selections.length < needed) return true;
    if (selections.some(s => !s.option)) return true;
    if (choice.type === 'asi') {
      for (const sel of selections) {
        if (
          sel.option === 'Increase one ability score by 2' &&
          !(sel.abilities && sel.abilities.length)
        )
          return true;
        if (
          sel.option === 'Increase two ability scores by 1' &&
          (!sel.abilities || sel.abilities.length !== 2)
        )
          return true;
        if (sel.option === 'Feat' && !sel.feat) return true;
      }
    }
  }
  return false;
}

function updateStep2Completion() {
  const btnStep3 = document.getElementById('btnStep3');
  const btnStep4 = document.getElementById('btnStep4');
  const progressBar = document.getElementById('progressBar');

  const incomplete = (CharacterState.classes || []).some(classHasPendingChoices);
  const hasClass = (CharacterState.classes || []).length > 0;

  if (btnStep3) btnStep3.disabled = incomplete;
  if (btnStep4)
    btnStep4.disabled =
      incomplete || !hasClass || !CharacterState.system.details.race;
  if (progressBar) {
    const width = (incomplete ? 1 : 2) / 6 * 100;
    progressBar.style.width = `${width}%`;
  }
}

/**
 * Inizializza lo Step 2: Selezione Classe
 */
export async function loadStep2(refresh = true) {
  const classListContainer = document.getElementById('classList');
  const selectedClassesContainer = document.getElementById('selectedClasses');
  let searchInput = document.getElementById('classSearch');
  if (!classListContainer || !selectedClassesContainer) return;
  classListContainer.innerHTML = '';
  selectedClassesContainer.innerHTML = '';

  // Ensure the class data has been loaded before rendering
  try {
    await loadClasses();
    await loadFeats();
  } catch (err) {
    console.error('Dati classi non disponibili.', err);
    return;
  }

  if (refresh) refreshBaseState();
  // Rebuild the selected classes list from the current character state
  renderSelectedClasses();
  updateStep2Completion();

  // Show either the class selection list or the already selected classes
  classListContainer.classList.toggle('hidden', CharacterState.classes.length !== 0);
  selectedClassesContainer?.classList.toggle('hidden', CharacterState.classes.length === 0);
  searchInput?.classList.toggle('hidden', CharacterState.classes.length !== 0);

  if (CharacterState.classes.length !== 0) {
    return;
  }

  const classes = Array.isArray(DATA.classes) ? DATA.classes : [];
  if (!classes.length) {
    console.error('Dati classi non disponibili.');
    return;
  }
  function renderClassCards(query = '') {
    classListContainer.innerHTML = '';
    const taken = new Set(CharacterState.classes.map(c => c.name));
    classes
      .filter(
        cls =>
          !taken.has(cls.name) &&
          cls.name.toLowerCase().includes(query.toLowerCase())
      )
      .forEach(cls => {
        const classCard = document.createElement('div');
        classCard.className = 'class-card';
        classCard.addEventListener('click', () => showClassModal(cls));

        const title = createElement('h3', cls.name);
        const desc = createElement(
          'p',
          cls.description || 'Nessuna descrizione disponibile.'
        );

        const detailsBtn = createElement('button', 'Dettagli');
        detailsBtn.className = 'btn btn-primary';
        detailsBtn.addEventListener('click', e => {
          e.stopPropagation();
          showClassModal(cls);
        });

        classCard.appendChild(title);
        classCard.appendChild(desc);
        classCard.appendChild(detailsBtn);

        classListContainer.appendChild(classCard);
      });
  }
  if (searchInput) {
    const newInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newInput, searchInput);
    searchInput = newInput;
    searchInput.addEventListener('input', () =>
      renderClassCards(searchInput.value)
    );
  }
  renderClassCards();
}

/**
 * Mostra il modal con i dettagli della classe
 */
function showClassModal(cls) {
  const modal = document.getElementById('classModal');
  const details = document.getElementById('classModalDetails');
  const addBtn = document.getElementById('addClassButton');
  const closeBtn = document.getElementById('closeClassModal');

  if (!modal || !details || !addBtn) return;

  details.innerHTML = '';

  // Title and description
  details.appendChild(createElement('h2', cls.name));
  details.appendChild(
    createElement('p', cls.description || 'Nessuna descrizione disponibile.')
  );

  // Proficiency information
  const profList = document.createElement('ul');
  if (Array.isArray(cls.armor_proficiencies) && cls.armor_proficiencies.length) {
    profList.appendChild(
      createElement('li', `Armature: ${cls.armor_proficiencies.join(', ')}`)
    );
  }
  if (Array.isArray(cls.weapon_proficiencies) && cls.weapon_proficiencies.length) {
    profList.appendChild(
      createElement('li', `Armi: ${cls.weapon_proficiencies.join(', ')}`)
    );
  }
  if (cls.skill_proficiencies) {
    let skillText = '';
    if (cls.skill_proficiencies.options) {
      skillText = `scegli ${cls.skill_proficiencies.choose}: ${cls.skill_proficiencies.options.join(', ')}`;
    } else if (cls.skill_proficiencies.fixed) {
      skillText = cls.skill_proficiencies.fixed.join(', ');
    }
    if (skillText) {
      profList.appendChild(createElement('li', `Abilità: ${skillText}`));
    }
  }
  if (profList.childNodes.length) {
    const profHeader = createElement('h3', 'Proficienze');
    details.appendChild(profHeader);
    details.appendChild(profList);
  }

  addBtn.onclick = () => {
    selectClass(cls);
    modal.classList.add('hidden');
  };
  modal.classList.remove('hidden');

  if (closeBtn) {
    closeBtn.onclick = () => modal.classList.add('hidden');
  }
}

/**
 * Salva la classe selezionata nel CharacterState
 */
function selectClass(cls) {
  const classes = CharacterState.classes || (CharacterState.classes = []);
  if (classes.some(c => c.name === cls.name)) {
    if (typeof alert !== 'undefined') {
      alert(`${cls.name} already selected.`);
    }
    loadStep2(false);
    return;
  }

  const newCls = {
    name: cls.name,
    level: 1,
    fixed_proficiencies: cls.language_proficiencies?.fixed || [],
    skill_choices: cls.skill_proficiencies || [],
    spellcasting: cls.spellcasting || {},
    skills: [],
    choiceSelections: {},
  };
  classes.push(newCls);
  compileClassFeatures(newCls);
  const modal = document.getElementById('classModal');
  modal?.classList.add('hidden');
  rebuildFromClasses();
  document.getElementById('classList')?.classList.add('hidden');
  document.getElementById('classSearch')?.classList.add('hidden');
  document.getElementById('selectedClasses')?.classList.remove('hidden');
  loadStep2(false);
  updateStep2Completion();
}

export {
  updateSkillSelectOptions,
  updateChoiceSelectOptions,
  validateTotalLevel,
  refreshBaseState,
  rebuildFromClasses,
  selectClass,
};
