const DEFAULT_STATE = {
  /**
   * List of proficiency entries. Each entry contains:
   * - type: category of proficiency (e.g., 'skill', 'tool').
   * - key: identifier of the proficiency.
   * - sources: array of strings referencing where the proficiency came from.
   */
  proficiencies: [],
};

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

let state = loadState();

export function loadState() {
  const stored = sessionStorage.getItem('characterState');
  state = stored ? JSON.parse(stored) : cloneDefaultState();
  return state;
}

export function saveState() {
  sessionStorage.setItem('characterState', JSON.stringify(state));
}

export function resetState() {
  state = cloneDefaultState();
  saveState();
}

export function getState() {
  return state;
}

export function addProficiency(type, key, source) {
  if (!type || !key) return;
  const existing = state.proficiencies.find(
    p => p.type === type && p.key === key
  );
  if (existing) {
    if (source && !existing.sources.includes(source)) {
      existing.sources.push(source);
    }
  } else {
    state.proficiencies.push({
      type,
      key,
      sources: source ? [source] : [],
    });
  }
  saveState();
}

export function removeProficiency(type, key, source) {
  const index = state.proficiencies.findIndex(
    p => p.type === type && p.key === key
  );
  if (index === -1) return;
  const prof = state.proficiencies[index];
  if (source) {
    prof.sources = prof.sources.filter(s => s !== source);
  }
  if (!source || prof.sources.length === 0) {
    state.proficiencies.splice(index, 1);
  }
  saveState();
}

