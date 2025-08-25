import {
  DATA,
  CharacterState,
  fetchJsonWithRetry,
  loadRaces,
  logCharacterState
} from './data.js';
import { refreshBaseState, rebuildFromClasses } from './step2.js';
import { t } from './i18n.js';
import { showStep } from './main.js';

let selectedBaseRace = '';
let currentRaceData = null;

const ALL_SKILLS = [
  'Acrobatics',
  'Animal Handling',
  'Arcana',
  'Athletics',
  'Deception',
  'History',
  'Insight',
  'Intimidation',
  'Investigation',
  'Medicine',
  'Nature',
  'Perception',
  'Performance',
  'Persuasion',
  'Religion',
  'Sleight of Hand',
  'Stealth',
  'Survival',
];

const ALL_TOOLS = [
  "Alchemist's Supplies",
  "Brewer's Supplies",
  "Calligrapher's Supplies",
  "Carpenter's Tools",
  "Cartographer's Tools",
  "Cobbler's Tools",
  "Cook's Utensils",
  "Glassblower's Tools",
  "Jeweler's Tools",
  "Leatherworker's Tools",
  "Mason's Tools",
  "Painter's Supplies",
  "Potter's Tools",
  "Smith's Tools",
  "Tinker's Tools",
  "Weaver's Tools",
  "Woodcarver's Tools",
  'Disguise Kit',
  'Forgery Kit',
  'Herbalism Kit',
  "Navigator's Tools",
  "Poisoner's Kit",
  "Thieves' Tools",
];

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getProficiencyList(type) {
  if (type === 'skills') return CharacterState.system.skills;
  if (type === 'tools') return CharacterState.system.tools;
  if (type === 'languages') return CharacterState.system.traits.languages.value;
  if (type === 'cantrips') return CharacterState.system.spells.cantrips;
  return [];
}

function getAllOptions(type) {
  if (type === 'skills') return ALL_SKILLS;
  if (type === 'tools') return ALL_TOOLS;
  if (type === 'languages') return DATA.languages || [];
  return [];
}

function addUniqueProficiency(type, value, container) {
  if (!value) return;
  const list = getProficiencyList(type);
  if (!list.includes(value)) {
    list.push(value);
    logCharacterState();
    return;
  }
  const msg = document.createElement('div');
  const label = document.createElement('label');
  label.textContent = t('duplicateProficiency', {
    value,
    type: t(type.slice(0, -1))
  });
  const sel = document.createElement('select');
  sel.innerHTML = `<option value=''>${t('select')}</option>`;
  getAllOptions(type)
    .filter((opt) => !list.includes(opt))
    .forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    });
  sel.addEventListener('change', () => {
    if (sel.value && !list.includes(sel.value)) {
      list.push(sel.value);
      sel.disabled = true;
      logCharacterState();
    }
  });
  label.appendChild(sel);
  msg.appendChild(label);
  container.appendChild(msg);
}

function renderBaseRaces() {
  const container = document.getElementById('raceList');
  if (!container) return;
  container.innerHTML = '';
  Object.keys(DATA.races).forEach((base) => {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.textContent = base;
    card.addEventListener('click', () => selectBaseRace(base));
    container.appendChild(card);
  });
}

function selectBaseRace(base) {
  selectedBaseRace = base;
  const select = document.getElementById('raceSelect');
  const traits = document.getElementById('raceTraits');
  if (traits) traits.innerHTML = '';
  if (select) {
    select.classList.remove('hidden');
    select.innerHTML = `<option value="">${t('select')}</option>`;
    DATA.races[base].forEach(({ name, path }) => {
      const opt = document.createElement('option');
      opt.value = path;
      opt.textContent = name;
      select.appendChild(opt);
    });
  }
}

async function handleSubraceChange(e) {
  const path = e.target.value;
  const container = document.getElementById('raceTraits');
  if (!path || !container) return;
  currentRaceData = await fetchJsonWithRetry(path, `race at ${path}`);
  container.innerHTML = '';
  if (currentRaceData.entries) {
    const ul = document.createElement('ul');
    currentRaceData.entries.forEach((e) => {
      if (e.name) {
        const li = document.createElement('li');
        li.textContent = e.name;
        ul.appendChild(li);
      }
    });
    container.appendChild(ul);
  }
  if (currentRaceData.skillProficiencies) {
    const raceSkills = [];
    currentRaceData.skillProficiencies.forEach((obj) => {
      for (const k in obj) if (obj[k]) raceSkills.push(capitalize(k));
    });
    if (raceSkills.length) {
      const p = document.createElement('p');
      p.textContent = `${t('skills')}: ${raceSkills.join(', ')}`;
      container.appendChild(p);
    }
  }
  if (currentRaceData.languageProficiencies) {
    const raceLang = [];
    currentRaceData.languageProficiencies.forEach((obj) => {
      for (const k in obj) if (obj[k]) raceLang.push(capitalize(k));
    });
    if (raceLang.length) {
      const p = document.createElement('p');
      p.textContent = `${t('languages')}: ${raceLang.join(', ')}`;
      container.appendChild(p);
    }
  }
}

function confirmRaceSelection() {
  if (!currentRaceData || !selectedBaseRace) return;
  const container = document.getElementById('raceTraits');
  CharacterState.system.details.race = selectedBaseRace;
  CharacterState.system.details.subrace = currentRaceData.name;

  const sizeMap = { T: 'tiny', S: 'sm', M: 'med', L: 'lg', H: 'huge', G: 'grg' };
  if (currentRaceData.size) {
    const sz = Array.isArray(currentRaceData.size)
      ? currentRaceData.size[0]
      : currentRaceData.size;
    CharacterState.system.traits.size =
      sizeMap[sz] || CharacterState.system.traits.size;
  }

  const move = CharacterState.system.attributes.movement || {};
  const speed = currentRaceData.speed;
  if (typeof speed === 'number') move.walk = speed;
  else if (speed && typeof speed === 'object') {
    if (typeof speed.walk === 'number') move.walk = speed.walk;
    ['burrow', 'climb', 'fly', 'swim'].forEach((t) => {
      const val = speed[t];
      if (typeof val === 'number') move[t] = val;
      else if (val === true && typeof move.walk === 'number') move[t] = move.walk;
    });
  }
  CharacterState.system.attributes.movement = move;

  if (Array.isArray(currentRaceData.ability)) {
    currentRaceData.ability.forEach((obj) => {
      for (const [ab, val] of Object.entries(obj)) {
        if (typeof val === 'number' && CharacterState.system.abilities[ab]) {
          const abil = CharacterState.system.abilities[ab];
          abil.value = (abil.value || 0) + val;
        }
      }
    });
  }

  if (currentRaceData.darkvision)
    CharacterState.system.traits.senses.darkvision = currentRaceData.darkvision;
  if (currentRaceData.traitTags)
    CharacterState.system.traits.traitTags = [...currentRaceData.traitTags];

  if (currentRaceData.skillProficiencies) {
    currentRaceData.skillProficiencies.forEach((obj) => {
      for (const k in obj)
        if (obj[k]) addUniqueProficiency('skills', capitalize(k), container);
    });
  }
  if (currentRaceData.languageProficiencies) {
    currentRaceData.languageProficiencies.forEach((obj) => {
      for (const k in obj)
        if (obj[k]) addUniqueProficiency('languages', capitalize(k), container);
    });
  }
  refreshBaseState();
  rebuildFromClasses();
  const btn4 = document.getElementById('btnStep4');
  if (btn4) btn4.disabled = false;
  logCharacterState();
  showStep(4);
}

export async function loadStep3(force = false) {
  await loadRaces();
  const container = document.getElementById('raceList');
  if (!container) return;
  if (container.childElementCount && !force) return;
  renderBaseRaces();

  const sel = document.getElementById('raceSelect');
  sel?.addEventListener('change', handleSubraceChange);
  sel?.classList.add('hidden');

  const btn = document.getElementById('confirmRaceSelection');
  btn?.addEventListener('click', () => {
    confirmRaceSelection();
    const btn4 = document.getElementById('btnStep4');
    if (btn4) btn4.disabled = false;
  });
}
