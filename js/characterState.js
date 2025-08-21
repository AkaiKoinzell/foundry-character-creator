const DEFAULT_STATE = {
  /**
   * List of proficiency entries. Each entry contains:
   * - type: category of proficiency (e.g., 'skill', 'tool').
   * - key: identifier of the proficiency.
   * - sources: array of strings referencing where the proficiency came from.
   */
  proficiencies: [],
  /**
   * Ordered list of steps that have been applied to the character.
   * Each entry stores the step id along with the grants and choices
   * used so the step can be replayed if necessary.
   */
  stepsCompleted: [],
  /**
   * Log of swaps performed to resolve proficiency conflicts.
   * Entries are objects of the form { step, conflicts } where conflicts
   * mirrors the structure returned by applyStep.
   */
  swapLog: [],
};

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

import { applyStep } from './stepEngine.js';

let state;

loadState();

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

/**
 * Record that a step has been applied with the given grants and choices.
 * If the step was previously recorded it will be replaced.
 */
export function recordStep(step, grants = {}, choices = {}) {
  if (!step) return;
  const entry = { step, grants, choices };
  const idx = state.stepsCompleted.findIndex(s => s.step === step);
  if (idx >= 0) state.stepsCompleted[idx] = entry;
  else state.stepsCompleted.push(entry);
  saveState();
}

/**
 * Append an entry to the swap log.
 * @param {Object} logEntry - Object describing the swap resolution.
 */
export function logSwap(logEntry) {
  if (!logEntry) return;
  state.swapLog.push(logEntry);
  saveState();
}

/**
 * Undo state to the specified step.
 * Removes any later steps and rebuilds the character state by replaying
 * the remaining recorded steps through applyStep. Swap log entries are
 * recomputed based on the replay results.
 * @param {string} step - Identifier of the step to undo back to.
 */
export function undoToStep(step) {
  const idx = state.stepsCompleted.findIndex(s => s.step === step);
  if (idx === -1) return;

  const stepsToReplay = state.stepsCompleted.slice(0, idx + 1);

  // Reset to default state
  state = cloneDefaultState();

  // Replay steps and rebuild swap log
  stepsToReplay.forEach(({ step: id, grants, choices }) => {
    const { conflicts } = applyStep(id, grants, choices);
    if (conflicts && Object.keys(conflicts).length > 0) {
      state.swapLog.push({ step: id, conflicts });
    }
  });

  saveState();
}

