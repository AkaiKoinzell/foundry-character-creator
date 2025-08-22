import { DATA, CharacterState } from './data.js';

function createElement(tag, text) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  return el;
}

/**
 * Inizializza lo Step 2: Selezione Classe
 */
export function loadStep2() {
  const classListContainer = document.getElementById('classList');
  if (!classListContainer) return;
  classListContainer.innerHTML = '';

  if (!DATA.classes || !Array.isArray(DATA.classes)) {
    console.error('Dati classi non disponibili.');
    return;
  }

  DATA.classes.forEach(cls => {
    const classCard = document.createElement('div');
    classCard.className = 'class-card';
    if (CharacterState.class && CharacterState.class.name === cls.name) {
      classCard.classList.add('selected');
    }

    const title = createElement('h3', cls.name);
    const desc = createElement('p', cls.description || 'Nessuna descrizione disponibile.');

    const detailsBtn = createElement('button', 'Dettagli');
    detailsBtn.addEventListener('click', () => showClassModal(cls));

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
