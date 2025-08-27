import { DATA, CharacterState, logCharacterState } from './data.js';
import { t } from './i18n.js';

// full list of skills for replacement handling
export const ALL_SKILLS = [
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

// basic tool list used when replacing duplicates
export const ALL_TOOLS = [
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

export function getProficiencyList(type) {
  if (type === 'skills') return CharacterState.system.skills;
  if (type === 'tools') return CharacterState.system.tools;
  if (type === 'languages') return CharacterState.system.traits.languages.value;
  if (type === 'cantrips') return CharacterState.system.spells.cantrips;
  return [];
}

export function getAllOptions(type) {
  if (type === 'skills') return ALL_SKILLS;
  if (type === 'tools') return ALL_TOOLS;
  if (type === 'languages') return DATA.languages || [];
  return [];
}

export function addUniqueProficiency(type, value, container) {
  if (!value) return null;
  const list = getProficiencyList(type);
  if (!list.includes(value)) {
    list.push(value);
    logCharacterState();
    return null;
  }
  const msg = document.createElement('div');
  const label = document.createElement('label');
  label.textContent = t('duplicateProficiency', {
    value,
    type: t(type.slice(0, -1)),
  });
  const sel = document.createElement('select');
  sel.innerHTML = `<option value=''>${t('select')}</option>`;
  getAllOptions(type)
    .filter(opt => !list.includes(opt))
    .forEach(opt => {
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
  return sel;
}

