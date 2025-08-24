import { DATA, CharacterState, loadClasses, logCharacterState, loadFeats, totalLevel } from './data.js';

// Temporary store for user selections while editing class features
const savedSelections = { skills: [], subclass: '', choices: {} };

let currentClass = null;

function trimSelections(maxLevel) {
  Object.keys(savedSelections.choices).forEach(id => {
    if (savedSelections.choices[id].level > maxLevel) {
      delete savedSelections.choices[id];
    }
  });
}

function createElement(tag, text) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  return el;
}

function createAccordionItem(title, content, isChoice = false, description = '') {
  const item = document.createElement('div');
  item.className = 'accordion-item' + (isChoice ? ' user-choice' : '');

  const header = document.createElement('button');
  header.className = 'accordion-header';
  if (description) {
    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    const descSpan = document.createElement('small');
    descSpan.textContent = ` - ${description}`;
    header.appendChild(titleSpan);
    header.appendChild(descSpan);
  } else {
    header.textContent = title;
  }

  const body = document.createElement('div');
  body.className = 'accordion-content';
  if (typeof content === 'string') {
    body.textContent = content;
  } else {
    body.appendChild(content);
  }
  header.addEventListener('click', () => {
    header.classList.toggle('active');
    body.classList.toggle('show');
  });

  item.appendChild(header);
  item.appendChild(body);
  return item;
}

function updateSkillSelectOptions(container = document) {
  const selects = container.querySelectorAll('select[data-type="skill"]');
  const taken = new Set(CharacterState.skills);
  document.querySelectorAll('select[data-choice-type="skills"]').forEach(sel => {
    if (sel.value) taken.add(sel.value);
  });
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

function updateChoiceSelectOptions(container, name, type) {
  const selects = container.querySelectorAll(`select[data-choice-name='${name}']`);
  const taken = new Set();
  if (type === 'skills') {
    CharacterState.skills.forEach(s => taken.add(s));
    document.querySelectorAll('select[data-type="skill"]').forEach(sel => {
      if (sel.value) taken.add(sel.value);
    });
    document.querySelectorAll('select[data-choice-type="skills"]').forEach(sel => {
      if (sel.dataset.choiceName !== name && sel.value) taken.add(sel.value);
    });
  } else if (type === 'tools') {
    CharacterState.tools.forEach(t => taken.add(t));
  } else if (type === 'languages') {
    CharacterState.languages.forEach(l => taken.add(l));
  } else if (type === 'cantrips' && Array.isArray(CharacterState.cantrips)) {
    CharacterState.cantrips.forEach(c => taken.add(c));
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
  Object.values(savedSelections.choices).forEach(c => {
    if (c.feat) feats.add(c.feat);
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

function renderClassFeatures(cls) {
  const featuresContainer = document.getElementById('classFeatures');
  if (!featuresContainer) return;
  featuresContainer.innerHTML = '';

  const level = currentClass?.level || 1;

  if (cls.skill_proficiencies?.options) {
    const container = document.createElement('div');
    const desc = document.createElement('p');
    desc.textContent = `Scegli ${cls.skill_proficiencies.choose} abilità`;
    container.appendChild(desc);
    for (let i = 0; i < cls.skill_proficiencies.choose; i++) {
      const sel = document.createElement('select');
      sel.innerHTML = "<option value=''>Seleziona</option>";
      cls.skill_proficiencies.options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        sel.appendChild(o);
      });
      sel.dataset.type = 'skill';
      sel.value = savedSelections.skills[i] || '';
      sel.addEventListener('change', () => {
        savedSelections.skills[i] = sel.value;
        updateSkillSelectOptions(container);
        document
          .querySelectorAll("select[data-choice-type='skills']")
          .forEach(choiceSel => {
            updateChoiceSelectOptions(
              choiceSel.parentElement,
              choiceSel.dataset.choiceName,
              'skills'
            );
          });
      });
      container.appendChild(sel);
    }
    updateSkillSelectOptions(container);
    featuresContainer.appendChild(
      createAccordionItem('Competenze nelle abilità', container, true)
    );
  }

  if (Array.isArray(cls.subclasses) && cls.subclasses.length) {
    const sel = document.createElement('select');
    sel.innerHTML = "<option value=''>Seleziona</option>";
    cls.subclasses.forEach(sc => {
      const o = document.createElement('option');
      o.value = sc.name;
      o.textContent = sc.name;
      sel.appendChild(o);
    });
    sel.dataset.type = 'subclass';
    sel.value = savedSelections.subclass || '';
    sel.addEventListener('change', () => {
      savedSelections.subclass = sel.value;
    });
    featuresContainer.appendChild(
      createAccordionItem('Sottoclasse', sel, true)
    );
  }

  for (let lvl = 1; lvl <= level; lvl++) {
    const levelChoices = (cls.choices || []).filter(c => c.level === lvl);
    const features = (cls.features_by_level?.[lvl] || []).filter(
      f => !levelChoices.some(c => c.name === f.name)
    );
    features.forEach(f => {
      featuresContainer.appendChild(
        createAccordionItem(`Livello ${lvl}: ${f.name}`, f.description || '')
      );
    });

    levelChoices.forEach(choice => {
      const container = document.createElement('div');
      if (choice.description) {
        const p = document.createElement('p');
        p.textContent = choice.description;
        container.appendChild(p);
      }
      const count = choice.count || 1;
      for (let i = 0; i < count; i++) {
        const sel = document.createElement('select');
        sel.innerHTML = "<option value=''>Seleziona</option>";
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
        const stored = savedSelections.choices[choiceId];
        if (stored) sel.value = stored.option;
        sel.addEventListener('change', () => {
          savedSelections.choices[choiceId] = { option: sel.value, level: lvl };
          handleASISelection(sel, container, savedSelections.choices[choiceId]);
          updateChoiceSelectOptions(container, choice.name, choice.type);
          if (choice.type === 'skills') {
            updateSkillSelectOptions();
            document
              .querySelectorAll("select[data-choice-type='skills']")
              .forEach(choiceSel => {
                updateChoiceSelectOptions(
                  choiceSel.parentElement,
                  choiceSel.dataset.choiceName,
                  'skills'
                );
              });
          }
        });
        container.appendChild(sel);
        if (stored) {
          handleASISelection(sel, container, stored);
        }
      }
      updateChoiceSelectOptions(container, choice.name, choice.type);
      featuresContainer.appendChild(
        createAccordionItem(
          `Livello ${choice.level}: ${choice.name}`,
          container,
          true,
          choice.description || ''
        )
      );
    });
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
  sel.innerHTML = "<option value=''>Seleziona caratteristica</option>";
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
  sel.innerHTML = "<option value=''>Seleziona un talento</option>";
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

function handleASISelection(sel, container, saved = null) {
  const existing = container.querySelectorAll(
    `select[data-parent='${sel.dataset.choiceId}']`
  );
  existing.forEach(e => e.remove());

  const entry = savedSelections.choices[sel.dataset.choiceId] || saved;

  if (sel.value === 'Increase one ability score by 2') {
    const abilitySel = createAbilitySelect();
    abilitySel.dataset.parent = sel.dataset.choiceId;
    abilitySel.value = entry?.abilities?.[0] || '';
    abilitySel.addEventListener('change', () => {
      const rec = savedSelections.choices[sel.dataset.choiceId] || { option: sel.value, level: entry?.level };
      rec.abilities = [abilitySel.value];
      savedSelections.choices[sel.dataset.choiceId] = rec;
    });
    container.appendChild(abilitySel);
  } else if (sel.value === 'Increase two ability scores by 1') {
    for (let j = 0; j < 2; j++) {
      const abilitySel = createAbilitySelect();
      abilitySel.dataset.parent = sel.dataset.choiceId;
      abilitySel.value = entry?.abilities?.[j] || '';
      abilitySel.addEventListener('change', () => {
        const rec = savedSelections.choices[sel.dataset.choiceId] || { option: sel.value, level: entry?.level };
        const abilities = rec.abilities || [];
        abilities[j] = abilitySel.value;
        rec.abilities = abilities;
        savedSelections.choices[sel.dataset.choiceId] = rec;
      });
      container.appendChild(abilitySel);
    }
  } else if (sel.value === 'Feat') {
    const featSel = createFeatSelect(entry?.feat || '');
    featSel.dataset.parent = sel.dataset.choiceId;
    featSel.value = entry?.feat || '';
    featSel.addEventListener('change', () => {
      const rec = savedSelections.choices[sel.dataset.choiceId] || { option: sel.value, level: entry?.level };
      rec.feat = featSel.value;
      savedSelections.choices[sel.dataset.choiceId] = rec;
      updateFeatSelectOptions();
    });
    container.appendChild(featSel);
    updateFeatSelectOptions();
  }
}

function confirmClassSelection(silent = false) {
  const features = document.getElementById('classFeatures');
  if (!features || !currentClass) return;

  const skillSelects = features.querySelectorAll('select[data-type="skill"]');
  currentClass.skills = [];
  skillSelects.forEach(sel => {
    if (sel.value) {
      if (!currentClass.skills.includes(sel.value)) currentClass.skills.push(sel.value);
      if (!CharacterState.skills.includes(sel.value)) CharacterState.skills.push(sel.value);
    }
  });

  const subclassSel = features.querySelector('select[data-type="subclass"]');
  if (subclassSel && subclassSel.value) {
    currentClass.subclass = subclassSel.value;
  }

  const choiceSelects = features.querySelectorAll('select[data-type="choice"]');
  const abilityMap = {
    Strength: 'str',
    Dexterity: 'dex',
    Constitution: 'con',
    Intelligence: 'int',
    Wisdom: 'wis',
    Charisma: 'cha',
  };

  if (choiceSelects.length) {
    currentClass.choiceSelections = {};

    if (!Array.isArray(CharacterState.feats)) CharacterState.feats = [];
    if (!Array.isArray(CharacterState.cantrips)) CharacterState.cantrips = [];

    const asiBonuses = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };

    choiceSelects.forEach(sel => {
      if (sel.value) {
        const name = sel.dataset.choiceName;
        const type = sel.dataset.choiceType;
        const saved = savedSelections.choices[sel.dataset.choiceId];
        if (!currentClass.choiceSelections[name]) {
          currentClass.choiceSelections[name] = [];
        }
        const entry = { option: sel.value };
        if (saved?.level) entry.level = saved.level;
        const details = features.querySelectorAll(
          `select[data-parent='${sel.dataset.choiceId}']`
        );
        details.forEach(dsel => {
          if (dsel.dataset.type === 'asi-ability' && dsel.value) {
            entry.abilities = entry.abilities || [];
            entry.abilities.push(dsel.value);
          } else if (dsel.dataset.type === 'asi-feat' && dsel.value) {
            entry.feat = dsel.value;
          }
        });
        currentClass.choiceSelections[name].push(entry);

        if (type === 'skills' && !CharacterState.skills.includes(sel.value)) {
          CharacterState.skills.push(sel.value);
        } else if (type === 'tools' && !CharacterState.tools.includes(sel.value)) {
          CharacterState.tools.push(sel.value);
        } else if (type === 'languages' && !CharacterState.languages.includes(sel.value)) {
          CharacterState.languages.push(sel.value);
        } else if (type === 'cantrips' && !CharacterState.cantrips.includes(sel.value)) {
          CharacterState.cantrips.push(sel.value);
        }

        if (entry.option === 'Increase one ability score by 2' && entry.abilities?.[0]) {
          const key = abilityMap[entry.abilities[0]];
          if (key) asiBonuses[key] += 2;
        } else if (entry.option === 'Increase two ability scores by 1' && Array.isArray(entry.abilities)) {
          entry.abilities.forEach(ab => {
            const key = abilityMap[ab];
            if (key) asiBonuses[key] += 1;
          });
        }

        if (entry.feat && !CharacterState.feats.includes(entry.feat)) {
          CharacterState.feats.push(entry.feat);
        }
      }
    });

    currentClass.asiBonuses = asiBonuses;
    for (const ability of Object.keys(CharacterState.attributes)) {
      CharacterState.attributes[ability] =
        (CharacterState.attributes[ability] || 0) + (asiBonuses[ability] || 0);
    }
  }

  const cls = DATA.classes.find(c => c.name === currentClass.name);
  if (cls) {
    currentClass.features = [];
    for (let lvl = 1; lvl <= (currentClass.level || 1); lvl++) {
      const feats = cls.features_by_level?.[lvl] || [];
      feats.forEach(f => {
        currentClass.features.push({
          level: lvl,
          name: f.name,
          description: f.description || '',
        });
      });
    }
    if (currentClass.choiceSelections) {
      for (const [name, entries] of Object.entries(currentClass.choiceSelections)) {
        entries.forEach(e => {
          currentClass.features.push({
            level: e.level || null,
            name: `${name}: ${e.option}`,
            abilities: e.abilities,
            feat: e.feat,
          });
        });
      }
    }
  }

  CharacterState.classes.push(currentClass);
  logCharacterState();
  if (!silent) alert('Classe confermata!');
  currentClass = null;
  savedSelections.skills = [];
  savedSelections.subclass = '';
  savedSelections.choices = {};
  loadStep2();
}

/**
 * Inizializza lo Step 2: Selezione Classe
 */
export async function loadStep2() {
  const classListContainer = document.getElementById('classList');
  const featuresContainer = document.getElementById('classFeatures');
  const classActions = document.getElementById('classActions');
  const confirmClassBtn = document.getElementById('confirmClassButton');
  const levelContainer = document.getElementById('levelContainer');
  const levelSelect = document.getElementById('levelSelect');
  const summary = document.getElementById('selectedClass');
  const addClassPrompt = document.getElementById('addClassPrompt');
  const addClassLink = document.getElementById('addClassLink');
  if (!classListContainer || !featuresContainer) return;
  classListContainer.innerHTML = '';
  featuresContainer.innerHTML = '';

  // Ensure the class data has been loaded before rendering
  try {
    await loadClasses();
    await loadFeats();
  } catch (err) {
    console.error('Dati classi non disponibili.', err);
    return;
  }

  if (summary) {
    if (CharacterState.classes.length) {
      const text = CharacterState.classes
        .map(c => `${c.name} ${c.level}`)
        .join(', ');
      summary.textContent = `Classi selezionate: ${text} (Totale livello ${totalLevel()})`;
    } else {
      summary.textContent = '';
    }
  }

  if (currentClass) {
    classListContainer.classList.add('hidden');
    featuresContainer.classList.remove('hidden');
    classActions?.classList.remove('hidden');
    levelContainer?.classList.remove('hidden');
    addClassPrompt?.classList.remove('hidden');
    if (addClassLink) {
      addClassLink.onclick = e => {
        e.preventDefault();
        confirmClassSelection(true);
      };
    }
    if (levelSelect) {
      levelSelect.value = currentClass.level || '1';
      levelSelect.onchange = () => {
        const lvl = parseInt(levelSelect.value, 10) || 1;
        currentClass.level = lvl;
        trimSelections(lvl);
        const cls = DATA.classes.find(c => c.name === currentClass.name);
        if (cls) renderClassFeatures(cls);
      };
    }
    const cls = DATA.classes.find(c => c.name === currentClass.name);
    if (cls) renderClassFeatures(cls);
    if (confirmClassBtn) {
      confirmClassBtn.onclick = confirmClassSelection;
    }
    return;
  } else {
    classListContainer.classList.remove('hidden');
    featuresContainer.classList.add('hidden');
    classActions?.classList.add('hidden');
    levelContainer?.classList.add('hidden');
    addClassPrompt?.classList.add('hidden');
  }

  const classes = Array.isArray(DATA.classes) ? DATA.classes : [];
  if (!classes.length) {
    console.error('Dati classi non disponibili.');
    return;
  }
  const taken = new Set(CharacterState.classes.map(c => c.name));
  classes.forEach(cls => {
    if (taken.has(cls.name)) return;
    const classCard = document.createElement('div');
    classCard.className = 'class-card';
    classCard.addEventListener('click', () => showClassModal(cls));

    const title = createElement('h3', cls.name);
    const desc = createElement('p', cls.description || 'Nessuna descrizione disponibile.');

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

  const title = createElement('h2', cls.name);
  const desc = createElement('p', cls.description || 'Nessuna descrizione disponibile.');

  details.appendChild(title);
  details.appendChild(desc);

  if (cls.weapon_proficiencies) {
    details.appendChild(
      createElement('p', `Armi: ${cls.weapon_proficiencies.join(', ')}`)
    );
  }
  if (cls.armor_proficiencies) {
    details.appendChild(
      createElement('p', `Armature: ${cls.armor_proficiencies.join(', ')}`)
    );
  }
  if (cls.skill_proficiencies) {
    let skillText = '';
    if (cls.skill_proficiencies.options) {
      skillText = `scegli ${cls.skill_proficiencies.choose}: ${cls.skill_proficiencies.options.join(', ')}`;
    } else if (cls.skill_proficiencies.fixed) {
      skillText = cls.skill_proficiencies.fixed.join(', ');
    }
    if (skillText) details.appendChild(createElement('p', `Abilità: ${skillText}`));
  }

  addBtn.onclick = () => selectClass(cls);
  modal.classList.remove('hidden');

  if (closeBtn) {
    closeBtn.onclick = () => modal.classList.add('hidden');
  }
}

/**
 * Salva la classe selezionata nel CharacterState
 */
function selectClass(cls) {
  savedSelections.skills = [];
  savedSelections.subclass = '';
  savedSelections.choices = {};

  currentClass = {
    name: cls.name,
    level: 1,
    fixed_proficiencies: cls.language_proficiencies?.fixed || [],
    skill_choices: cls.skill_proficiencies || [],
    spellcasting: cls.spellcasting || {},
  };

  const modal = document.getElementById('classModal');
  modal?.classList.add('hidden');

  const btnStep3 = document.getElementById('btnStep3');
  if (btnStep3) btnStep3.disabled = false;
  logCharacterState();
  loadStep2();
}
