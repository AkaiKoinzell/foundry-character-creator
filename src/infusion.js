import { CharacterState, loadInfusionDetails } from './data.js';
import { t } from './i18n.js';
import { createElement, appendEntries } from './ui-helpers.js';

export function renderInfusion(name, existing = {}) {
  const container = document.createElement('div');
  container.className = 'infusion-card';

  const state = {
    name,
    description: existing.description || '',
    options: { ...(existing.options || {}) },
  };

  const optionSelects = [];

  loadInfusionDetails(name)
    .then(inf => {
      state.description = inf.description || '';
      if (inf.description) {
        container.appendChild(createElement('p', inf.description));
      }
      appendEntries(container, inf.entries);
      if (inf.prerequisites) {
        const prereq = Array.isArray(inf.prerequisites)
          ? inf.prerequisites.join(', ')
          : inf.prerequisites;
        container.appendChild(
          createElement('p', `${t('prerequisite') || 'Prerequisite'}: ${prereq}`)
        );
      }
      if (inf.options) {
        Object.entries(inf.options).forEach(([key, opts]) => {
          const sel = document.createElement('select');
          sel.dataset.option = key;
          sel.replaceChildren(new Option(t('select'), ''));
          opts.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            sel.appendChild(o);
          });
          if (state.options[key]) sel.value = state.options[key];
          sel.addEventListener('change', () => {
            state.options[key] = sel.value;
            updateState();
          });
          container.appendChild(sel);
          optionSelects.push(sel);
        });
      }
      updateState();
      renderer.isComplete = () => optionSelects.every(sel => !sel.options.length || sel.value);
    })
    .catch(err => {
      console.error('Failed to load infusion', name, err);
    });

  function updateState() {
    CharacterState.infusions = CharacterState.infusions || [];
    const idx = CharacterState.infusions.findIndex(i => i.name === state.name);
    const obj = {
      name: state.name,
      description: state.description,
      options: { ...state.options },
    };
    if (idx >= 0) CharacterState.infusions[idx] = obj;
    else CharacterState.infusions.push(obj);
  }

  const renderer = {
    element: container,
    isComplete: () => optionSelects.every(sel => !sel.options.length || sel.value),
  };
  return renderer;
}
