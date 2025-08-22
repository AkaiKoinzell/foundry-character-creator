import { DATA, CharacterState, loadClasses, logCharacterState, loadFeats } from './data.js';

// Temporary store for user selections while editing class features
const savedSelections = { skills: [], subclass: '', choices: {} };

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

function renderClassFeatures(cls) {
  const featuresContainer = document.getElementById('classFeatures');
  if (!featuresContainer) return;
  featuresContainer.innerHTML = '';

  const level = CharacterState.level || 1;

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
      });
      container.appendChild(sel);
    }
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
        const choiceId = `${choice.name}-${lvl}-${i}`;
        sel.dataset.choiceId = choiceId;
        const stored = savedSelections.choices[choiceId];
        if (stored) sel.value = stored.option;
        sel.addEventListener('change', () => {
          savedSelections.choices[choiceId] = { option: sel.value, level: lvl };
          handleASISelection(sel, container, savedSelections.choices[choiceId]);
        });
        container.appendChild(sel);
        if (stored) {
          handleASISelection(sel, container, stored);
        }
      }
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

function createFeatSelect() {
  const sel = document.createElement('select');
  sel.innerHTML = "<option value=''>Seleziona un talento</option>";
  (DATA.feats || []).forEach(feat => {
    const o = document.createElement('option');
    o.value = feat;
    o.textContent = feat;
    sel.appendChild(o);
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
    const featSel = createFeatSelect();
    featSel.dataset.parent = sel.dataset.choiceId;
    featSel.value = entry?.feat || '';
    featSel.addEventListener('change', () => {
      const rec = savedSelections.choices[sel.dataset.choiceId] || { option: sel.value, level: entry?.level };
      rec.feat = featSel.value;
      savedSelections.choices[sel.dataset.choiceId] = rec;
    });
    container.appendChild(featSel);
  }
}

function confirmClassSelection() {
  const features = document.getElementById('classFeatures');
  if (!features) return;

  // reset skills then gather selections
  CharacterState.skills = [];

  const skillSelects = features.querySelectorAll('select[data-type="skill"]');
  skillSelects.forEach(sel => {
    if (sel.value && !CharacterState.skills.includes(sel.value)) {
      CharacterState.skills.push(sel.value);
    }
  });

  const subclassSel = features.querySelector('select[data-type="subclass"]');
  if (subclassSel && subclassSel.value) {
    if (!CharacterState.class) CharacterState.class = {};
    CharacterState.class.subclass = subclassSel.value;
  }

  const choiceSelects = features.querySelectorAll('select[data-type="choice"]');
  const abilityMap = {
    Strength: 'str',
    Dexterity: 'dex',
    Constitution: 'con',
    Intelligence: 'int',
    Wisdom: 'wis',
    Charisma: 'cha'
  };

  if (choiceSelects.length) {
    if (!CharacterState.class) CharacterState.class = {};
    CharacterState.class.choiceSelections = {};

    // remove previous ASI bonuses from attributes
    const baseAttributes = { ...CharacterState.attributes };
    if (CharacterState.class.asiBonuses) {
      for (const [ability, bonus] of Object.entries(CharacterState.class.asiBonuses)) {
        baseAttributes[ability] -= bonus;
      }
    }

    const asiBonuses = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };

    choiceSelects.forEach(sel => {
      if (sel.value) {
        const name = sel.dataset.choiceName;
        const saved = savedSelections.choices[sel.dataset.choiceId];
        if (!CharacterState.class.choiceSelections[name]) {
          CharacterState.class.choiceSelections[name] = [];
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
        CharacterState.class.choiceSelections[name].push(entry);

        // track ASI bonuses for attributes
        if (entry.option === 'Increase one ability score by 2' && entry.abilities?.[0]) {
          const key = abilityMap[entry.abilities[0]];
          if (key) asiBonuses[key] += 2;
        } else if (entry.option === 'Increase two ability scores by 1' && Array.isArray(entry.abilities)) {
          entry.abilities.forEach(ab => {
            const key = abilityMap[ab];
            if (key) asiBonuses[key] += 1;
          });
        }
      }
    });

    CharacterState.class.asiBonuses = asiBonuses;
    for (const ability of Object.keys(baseAttributes)) {
      CharacterState.attributes[ability] = baseAttributes[ability] + (asiBonuses[ability] || 0);
    }
  }

  // store obtained features for the selected level
  const cls = DATA.classes.find(c => c.name === CharacterState.class?.name);
  if (cls) {
    CharacterState.class.features = [];
    for (let lvl = 1; lvl <= (CharacterState.level || 1); lvl++) {
      const feats = cls.features_by_level?.[lvl] || [];
      feats.forEach(f => {
        CharacterState.class.features.push({ level: lvl, name: f.name, description: f.description || '' });
      });
    }
    if (CharacterState.class.choiceSelections) {
      for (const [name, entries] of Object.entries(CharacterState.class.choiceSelections)) {
        entries.forEach(e => {
          CharacterState.class.features.push({
            level: e.level || null,
            name: `${name}: ${e.option}`,
            abilities: e.abilities,
            feat: e.feat
          });
        });
      }
    }
  }

  logCharacterState();
  alert('Classe confermata!');
}

/**
 * Inizializza lo Step 2: Selezione Classe
 */
export async function loadStep2() {
  const classListContainer = document.getElementById('classList');
  const featuresContainer = document.getElementById('classFeatures');
  const classActions = document.getElementById('classActions');
  const changeClassBtn = document.getElementById('changeClassButton');
  const confirmClassBtn = document.getElementById('confirmClassButton');
  const levelContainer = document.getElementById('levelContainer');
  const levelSelect = document.getElementById('levelSelect');
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

  if (levelSelect) {
    levelSelect.value = CharacterState.level || '1';
    levelSelect.onchange = () => {
      const lvl = parseInt(levelSelect.value, 10) || 1;
      CharacterState.level = lvl;
      trimSelections(lvl);
      if (CharacterState.class) {
        CharacterState.class.level = lvl;
        const cls = DATA.classes.find(c => c.name === CharacterState.class.name);
        if (cls) renderClassFeatures(cls);
      }
    };
  }

  const classes = Array.isArray(DATA.classes) ? DATA.classes : [];
  if (!classes.length) {
    console.error('Dati classi non disponibili.');
    return;
  }

  if (CharacterState.class) {
    classListContainer.classList.add('hidden');
    featuresContainer.classList.remove('hidden');
    classActions?.classList.remove('hidden');
    levelContainer?.classList.remove('hidden');
    const selected = classes.find(c => c.name === CharacterState.class.name);
    if (selected) renderClassFeatures(selected);
    if (changeClassBtn) {
      changeClassBtn.onclick = () => {
        CharacterState.class = null;
        CharacterState.skills = [];
        savedSelections.skills = [];
        savedSelections.subclass = '';
        savedSelections.choices = {};
        const btnStep3 = document.getElementById('btnStep3');
        if (btnStep3) btnStep3.disabled = true;
        logCharacterState();
        loadStep2();
      };
    }
    if (confirmClassBtn) {
      confirmClassBtn.onclick = confirmClassSelection;
    }
    return;
  } else {
    classListContainer.classList.remove('hidden');
    featuresContainer.classList.add('hidden');
    classActions?.classList.add('hidden');
    levelContainer?.classList.add('hidden');
  }

  classes.forEach(cls => {
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
  if (CharacterState.class && CharacterState.class.name !== cls.name) {
    const confirmChange = confirm('Sei sicuro di voler cambiare classe?');
    if (!confirmChange) return;
  }

  const level = CharacterState.level || 1;

  savedSelections.skills = [];
  savedSelections.subclass = '';
  savedSelections.choices = {};

  CharacterState.level = level;
  CharacterState.class = {
    name: cls.name,
    level,
    fixed_proficiencies: cls.language_proficiencies?.fixed || [],
    skill_choices: cls.skill_proficiencies || [],
    spellcasting: cls.spellcasting || {}
  };

  const modal = document.getElementById('classModal');
  modal?.classList.add('hidden');

  const confirmation = document.getElementById('selectedClass');
  if (confirmation) {
    confirmation.textContent = `Classe selezionata: ${cls.name}`;
  }

  const btnStep3 = document.getElementById('btnStep3');
  if (btnStep3) btnStep3.disabled = false;
  logCharacterState();
  loadStep2();
}
