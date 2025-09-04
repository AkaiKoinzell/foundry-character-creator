import { DATA, CharacterState, logCharacterState } from './data.js';
import { t } from './i18n.js';
import { loadEquipmentData } from './step5.js';

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

// musical instrument options used when replacing duplicates
export const ALL_INSTRUMENTS = [
  'Bagpipes',
  'Drum',
  'Dulcimer',
  'Flute',
  'Horn',
  'Lute',
  'Lyre',
  'Pan Flute',
  'Shawm',
  'Viol',
];

// Track pending replacement selects by proficiency type so steps can
// verify that all duplicates have been resolved before advancing.
const pendingSelects = {};

export function getProficiencyList(type, state = CharacterState) {
  if (type === 'skills') return state.system.skills;
  if (type === 'tools') return state.system.tools;
  if (type === 'instruments') return state.system.tools;
  if (type === 'weapons') return state.system.weapons || [];
  if (type === 'languages') return state.system.traits.languages.value;
  if (type === 'cantrips') return state.system.spells.cantrips;
  if (type === 'feats') return state.feats;
  return [];
}

export function getAllOptions(type) {
  if (type === 'skills') return ALL_SKILLS;
  if (type === 'tools') return ALL_TOOLS;
  if (type === 'instruments') return ALL_INSTRUMENTS;
  if (type === 'languages') return DATA.languages || [];
  if (type === 'weapons') {
    if (!Array.isArray(DATA.equipment)) {
      loadEquipmentData();
      return [];
    }
    return DATA.equipment
      .filter((i) => /weapon/i.test(i.type))
      .map((i) => i.name);
  }
  if (type === 'feats') return DATA.feats || [];
  return [];
}

export function pendingReplacements(type) {
  if (type) return pendingSelects[type]?.size || 0;
  return Object.values(pendingSelects).reduce(
    (acc, set) => acc + (set?.size || 0),
    0,
  );
}

export function addUniqueProficiency(
  type,
  value,
  container,
  source = '',
  state = CharacterState
) {
  if (!value) return null;
  const list = getProficiencyList(type, state);
  if (!list.includes(value)) {
    list.push(value);
    if (source) {
      state.proficiencySources = state.proficiencySources || {};
      const map =
        (state.proficiencySources[type] =
          state.proficiencySources[type] || {});
      map[value] = source;
    }
    if (state === CharacterState) logCharacterState();
    return null;
  }
  const msg = document.createElement('div');
  const label = document.createElement('label');
  label.textContent = t('duplicateProficiency', {
    value,
    type: t(type.slice(0, -1)),
  });
  const sel = document.createElement('select');
  sel.replaceChildren(new Option(t('select'), ''));
  getAllOptions(type)
    .filter(opt => !list.includes(opt))
    .forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    });
  // Track this select as a pending replacement until a new value is chosen
  const pending = (pendingSelects[type] = pendingSelects[type] || new Set());
  pending.add(sel);
  sel.addEventListener('change', () => {
    if (sel.value && !list.includes(sel.value)) {
      list.push(sel.value);
      sel.disabled = true;
      pending.delete(sel);
      if (state === CharacterState) logCharacterState();
    }
  });
  label.appendChild(sel);
  msg.appendChild(label);
  container.appendChild(msg);
  return sel;
}

