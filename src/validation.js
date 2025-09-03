import { t } from './i18n.js';
import { showToast, markIncomplete } from './ui-helpers.js';

/**
 * Apply inline validation to a section and optional fields.
 * Marks the container as incomplete and sets titles on empty fields.
 * @param {HTMLElement} container
 * @param {boolean} isValid
 * @param {HTMLElement|HTMLElement[]} fields
 * @param {string} key translation key for the warning message
 * @returns {boolean} isValid
 */
export function inlineWarning(
  container,
  isValid,
  fields = [],
  key = 'selectionRequired'
) {
  markIncomplete(container, isValid);
  const arr = Array.isArray(fields) ? fields.filter(Boolean) : [fields].filter(Boolean);
  arr.forEach((f) => {
    f.removeAttribute?.('title');
    if (!isValid && !f.value && globalThis.CharacterState?.showHelp) {
      f.title = t(key);
    }
  });
  return isValid;
}

/**
 * Display a translated toast message.
 * @param {string} key translation key
 * @param {object} params interpolation parameters
 * @param {number} duration display duration in ms
 */
export function globalToast(key, params = {}, duration = 3000) {
  showToast(t(key, params), duration);
}

