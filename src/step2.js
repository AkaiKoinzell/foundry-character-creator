import { DATA, CharacterState, loadClasses } from './data.js';

function createElement(tag, text) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  return el;
}

function createAccordionItem(title, content, isChoice = false) {
  const item = document.createElement('div');
  item.className = 'accordion-item' + (isChoice ? ' user-choice' : '');

  const header = document.createElement('button');
  header.className = 'accordion-header';
  header.textContent = title;
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
    const text = `scegli ${cls.skill_proficiencies.choose}: ${cls.skill_proficiencies.options.join(', ')}`;
    featuresContainer.appendChild(
      createAccordionItem('Competenze nelle abilità', text, true)
    );
  }

  if (cls.tool_proficiencies?.options) {
    const text = `scegli ${cls.tool_proficiencies.choose}: ${cls.tool_proficiencies.options.join(', ')}`;
    featuresContainer.appendChild(
      createAccordionItem('Competenze negli strumenti', text, true)
    );
  }

  if (Array.isArray(cls.subclasses) && cls.subclasses.length) {
    const text = `Scegli una sottoclasse: ${cls.subclasses.map(sc => sc.name).join(', ')}`;
    featuresContainer.appendChild(
      createAccordionItem('Sottoclasse', text, true)
    );
  }

  for (let lvl = 1; lvl <= level; lvl++) {
    const features = cls.features_by_level?.[lvl] || [];
    features.forEach(f => {
      featuresContainer.appendChild(
        createAccordionItem(`Livello ${lvl}: ${f.name}`, f.description || '')
      );
    });

    const levelChoices = (cls.choices || []).filter(c => c.level === lvl);
    levelChoices.forEach(choice => {
      const text = `${choice.description} Opzioni: ${choice.selection.join(', ')}`;
      featuresContainer.appendChild(
        createAccordionItem(
          `Livello ${choice.level}: ${choice.name}`,
          text,
          true
        )
      );
    });
  }
}

/**
 * Inizializza lo Step 2: Selezione Classe
 */
export async function loadStep2() {
  const classListContainer = document.getElementById('classList');
  const featuresContainer = document.getElementById('classFeatures');
  if (!classListContainer || !featuresContainer) return;
  classListContainer.innerHTML = '';
  featuresContainer.innerHTML = '';

  // Ensure the class data has been loaded before rendering
  try {
    await loadClasses();
  } catch (err) {
    console.error('Dati classi non disponibili.', err);
    return;
  }

  const classes = Array.isArray(DATA.classes) ? DATA.classes : [];
  if (!classes.length) {
    console.error('Dati classi non disponibili.');
    return;
  }

  if (CharacterState.class) {
    classListContainer.classList.add('hidden');
    featuresContainer.classList.remove('hidden');
    const selected = classes.find(c => c.name === CharacterState.class.name);
    if (selected) renderClassFeatures(selected);
    return;
  } else {
    classListContainer.classList.remove('hidden');
    featuresContainer.classList.add('hidden');
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
  if (cls.tool_proficiencies) {
    const toolText = Array.isArray(cls.tool_proficiencies)
      ? cls.tool_proficiencies.join(', ')
      : cls.tool_proficiencies.options
          ? `scegli ${cls.tool_proficiencies.choose}: ${cls.tool_proficiencies.options.join(', ')}`
          : '';
    if (toolText) details.appendChild(createElement('p', `Strumenti: ${toolText}`));
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

  const levelSelect = document.getElementById('levelSelect');
  const level = levelSelect ? parseInt(levelSelect.value, 10) || 1 : 1;

  CharacterState.level = level;
  CharacterState.class = {
    name: cls.name,
    level,
    fixed_proficiencies: cls.language_proficiencies?.fixed || [],
    skill_choices: cls.skill_proficiencies || [],
    tool_choices: cls.tool_proficiencies || [],
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

  loadStep2();
}
