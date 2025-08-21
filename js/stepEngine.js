import { getState, saveState } from './characterState.js';

/**
 * Applies the grants of a step to the character state and reports any conflicts.
 * @param {string} step - Identifier for the step (used as source tag).
 * @param {Object} grants - Object describing fixed grants (e.g., proficiencies).
 * @param {Object} choices - Object describing player choices to resolve conflicts.
 * @returns {{characterState: Object, conflicts: Object}}
 */
export function applyStep(step, grants = {}, choices = {}) {
  const state = getState();

  // Remove previous grants from this step
  state.proficiencies = state.proficiencies
    .map(p => ({ ...p, sources: p.sources.filter(s => s !== step) }))
    .filter(p => p.sources.length > 0);

  const conflicts = {};

  function addOrConflict(type, key) {
    if (!type || !key) return;
    const existing = state.proficiencies.find(p => p.type === type && p.key === key);
    if (existing) {
      if (!existing.sources.includes(step)) existing.sources.push(step);
      conflicts[type] = conflicts[type] || [];
      if (!conflicts[type].includes(key)) conflicts[type].push(key);
    } else {
      state.proficiencies.push({ type, key, sources: [step] });
    }
  }

  const allProfs = { ...(grants.proficiencies || {}) };
  if (choices.proficiencies) {
    for (const [type, arr] of Object.entries(choices.proficiencies)) {
      allProfs[type] = (allProfs[type] || []).concat(arr);
    }
  }

  for (const [type, arr] of Object.entries(allProfs)) {
    (arr || []).forEach(key => addOrConflict(type, key));
  }

  saveState();
  return { characterState: state, conflicts };
}
