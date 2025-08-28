import {
  DATA,
  CharacterState,
  logCharacterState,
  fetchJsonWithRetry
} from './data.js';
import { refreshBaseState, rebuildFromClasses, updateChoiceSelectOptions } from './step2.js';
import { t } from './i18n.js';
import { showStep } from './main.js';
import { createElement, createAccordionItem } from './ui-helpers.js';
import { addUniqueProficiency } from './proficiency.js';

let currentBackgroundData = null;
const pendingSelections = {
  skills: [],
  tools: [],
  languages: [],
  feat: null
};
const choiceAccordions = {
  skills: null,
  tools: null,
  languages: null,
  feat: null
};

export function renderBackgroundList(query = '') {
  const container = document.getElementById('backgroundList');
  if (!container) return;
  container.innerHTML = '';
  const changeBtn = document.getElementById('changeBackground');
  changeBtn?.classList.add('hidden');
  const entries = DATA.backgrounds || {};
  const term = query.toLowerCase();
  for (const [name, bg] of Object.entries(entries)) {
    if (!name.toLowerCase().includes(term)) continue;
    const card = document.createElement('div');
    card.className = 'class-card';
    card.addEventListener('click', () => selectBackground(bg));
    const title = createElement('h3', name);
    card.appendChild(title);

    const descText =
      bg.short || bg.description || bg.summary || bg.desc || '';
    if (descText) card.appendChild(createElement('p', descText));

    const details = document.createElement('div');
    details.className = 'race-details hidden';
    if (bg.skills && bg.skills.length)
      details.appendChild(
        createElement('p', `${t('skills')}: ${bg.skills.join(', ')}`)
      );
    if (Array.isArray(bg.tools) && bg.tools.length)
      details.appendChild(
        createElement('p', `${t('tools')}: ${bg.tools.join(', ')}`)
      );
    if (Array.isArray(bg.languages) && bg.languages.length)
      details.appendChild(
        createElement('p', `${t('languages')}: ${bg.languages.join(', ')}`)
      );
    if (bg.featOptions && bg.featOptions.length)
      details.appendChild(
        createElement(
          'p',
          `${t('featOptions') || 'Feat Options'}: ${bg.featOptions.join(', ')}`
        )
      );
    if (details.childElementCount) {
      card.appendChild(details);
      const detailsBtn = document.createElement('button');
      detailsBtn.className = 'btn btn-primary';
      detailsBtn.textContent = t('details') || 'Details';
      detailsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        details.classList.toggle('hidden');
      });
      card.appendChild(detailsBtn);
    }
    container.appendChild(card);
  }
}

function selectBackground(bg) {
  currentBackgroundData = bg;
  const list = document.getElementById('backgroundList');
  list?.classList.add('hidden');
  document.getElementById('backgroundSearch')?.classList.add('hidden');
  document.getElementById('changeBackground')?.classList.remove('hidden');

  let features = document.getElementById('backgroundFeatures');
  if (!features) {
    features = document.createElement('div');
    features.id = 'backgroundFeatures';
    features.className = 'accordion';
    list?.after(features);
  }
  features.classList.remove('hidden');
  features.innerHTML = '';

  pendingSelections.skills = [];
  pendingSelections.tools = [];
  pendingSelections.languages = [];
  pendingSelections.feat = null;
  choiceAccordions.skills = null;
  choiceAccordions.tools = null;
  choiceAccordions.languages = null;
  choiceAccordions.feat = null;

  // Details summary
  const details = document.createElement('div');
  if (currentBackgroundData.skills && currentBackgroundData.skills.length)
    details.appendChild(
      createElement(
        'p',
        `${t('skills')}: ${currentBackgroundData.skills.join(', ')}`
      )
    );
  if (Array.isArray(currentBackgroundData.tools) && currentBackgroundData.tools.length)
    details.appendChild(
      createElement(
        'p',
        `${t('tools')}: ${currentBackgroundData.tools.join(', ')}`
      )
    );
  if (Array.isArray(currentBackgroundData.languages) && currentBackgroundData.languages.length)
    details.appendChild(
      createElement(
        'p',
        `${t('languages')}: ${currentBackgroundData.languages.join(', ')}`
      )
    );
  if (currentBackgroundData.featOptions && currentBackgroundData.featOptions.length)
    details.appendChild(
      createElement(
        'p',
        `${t('featOptions') || 'Feat Options'}: ${currentBackgroundData.featOptions.join(', ')}`
      )
    );
  features.appendChild(createAccordionItem(t('details') || 'Details', details));

  // Choices --------------------------------------------------

  if (currentBackgroundData.skillChoices?.choose) {
    const wrapper = document.createElement('div');
    for (let i = 0; i < currentBackgroundData.skillChoices.choose; i++) {
      const sel = document.createElement('select');
      sel.innerHTML = `<option value=''>${t('selectSkill') || 'Select skill'}</option>`;
      currentBackgroundData.skillChoices.options.forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => {
        updateChoiceSelectOptions(pendingSelections.skills, 'skills');
        validateBackgroundChoices();
      });
      pendingSelections.skills.push(sel);
      wrapper.appendChild(sel);
    }
    updateChoiceSelectOptions(pendingSelections.skills, 'skills');
    const acc = createAccordionItem(t('skills'), wrapper, true);
    acc.classList.add('needs-selection');
    features.appendChild(acc);
    choiceAccordions.skills = acc;
  }

  const toolData =
    currentBackgroundData.toolChoices ||
    (currentBackgroundData.tools && !Array.isArray(currentBackgroundData.tools)
      ? currentBackgroundData.tools
      : null);
  if (toolData?.choose) {
    const wrapper = document.createElement('div');
    for (let i = 0; i < toolData.choose; i++) {
      const sel = document.createElement('select');
      sel.innerHTML = `<option value=''>${t('selectTool') || 'Select tool'}</option>`;
      (toolData.options || []).forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => {
        updateChoiceSelectOptions(pendingSelections.tools, 'tools');
        validateBackgroundChoices();
      });
      pendingSelections.tools.push(sel);
      wrapper.appendChild(sel);
    }
    updateChoiceSelectOptions(pendingSelections.tools, 'tools');
    const acc = createAccordionItem(t('tools'), wrapper, true);
    acc.classList.add('needs-selection');
    features.appendChild(acc);
    choiceAccordions.tools = acc;
  }

  if (
    currentBackgroundData.languages &&
    !Array.isArray(currentBackgroundData.languages) &&
    currentBackgroundData.languages.choose
  ) {
    const wrapper = document.createElement('div');
    const langOpts = currentBackgroundData.languages.options?.length
      ? currentBackgroundData.languages.options
      : DATA.languages || [];
    for (let i = 0; i < currentBackgroundData.languages.choose; i++) {
      const sel = document.createElement('select');
      sel.innerHTML = `<option value=''>${t('selectLanguage') || 'Select language'}</option>`;
      langOpts.forEach((l) => {
        const o = document.createElement('option');
        o.value = l;
        o.textContent = l;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => {
        updateChoiceSelectOptions(pendingSelections.languages, 'languages');
        validateBackgroundChoices();
      });
      pendingSelections.languages.push(sel);
      wrapper.appendChild(sel);
    }
    updateChoiceSelectOptions(pendingSelections.languages, 'languages');
    const acc = createAccordionItem(t('languages'), wrapper, true);
    acc.classList.add('needs-selection');
    features.appendChild(acc);
    choiceAccordions.languages = acc;
  }

  if (currentBackgroundData.featOptions && currentBackgroundData.featOptions.length) {
    const wrapper = document.createElement('div');
    const sel = document.createElement('select');
    sel.innerHTML = `<option value=''>${t('selectFeat') || 'Select feat'}</option>`;
    currentBackgroundData.featOptions.forEach((f) => {
      const o = document.createElement('option');
      o.value = f;
      o.textContent = f;
      sel.appendChild(o);
    });
    // Disable feats already known
    const taken = new Set(CharacterState.feats || []);
    (CharacterState.classes || []).forEach((cls) => {
      if (cls.choiceSelections) {
        Object.values(cls.choiceSelections).forEach((arr) => {
          arr.forEach((e) => e.feat && taken.add(e.feat));
        });
      }
    });
    Array.from(sel.options).forEach((opt) => {
      if (taken.has(opt.value)) opt.disabled = true;
    });
    sel.addEventListener('change', validateBackgroundChoices);
    pendingSelections.feat = sel;
    wrapper.appendChild(sel);
    const acc = createAccordionItem(t('feat') || 'Feat', wrapper, true);
    acc.classList.add('needs-selection');
    features.appendChild(acc);
    choiceAccordions.feat = acc;
  }

  validateBackgroundChoices();
}

function validateBackgroundChoices() {
  const btn = document.getElementById('confirmBackgroundSelection');
  const skillValid = pendingSelections.skills.every((s) => s.value);
  if (choiceAccordions.skills)
    choiceAccordions.skills.classList.toggle('incomplete', !skillValid);

  const toolValid = pendingSelections.tools.every((s) => s.value);
  if (choiceAccordions.tools)
    choiceAccordions.tools.classList.toggle('incomplete', !toolValid);

  const langValid = pendingSelections.languages.every((s) => s.value);
  if (choiceAccordions.languages)
    choiceAccordions.languages.classList.toggle('incomplete', !langValid);

  const featValid = pendingSelections.feat ? !!pendingSelections.feat.value : true;
  if (choiceAccordions.feat)
    choiceAccordions.feat.classList.toggle('incomplete', !featValid);

  const allValid = skillValid && toolValid && langValid && featValid;
  if (btn) btn.disabled = !allValid;
  return allValid;
}

async function confirmBackgroundSelection() {
  if (!currentBackgroundData) return;
  if (!validateBackgroundChoices()) return;

  const container = document.getElementById('backgroundFeatures');
  CharacterState.system.details.background = currentBackgroundData.name;

  const replacements = [];

  (currentBackgroundData.skills || []).forEach((s) => {
    const sel = addUniqueProficiency('skills', s, container);
    if (sel) replacements.push(sel);
  });
  pendingSelections.skills.forEach((sel) => {
    const repl = addUniqueProficiency('skills', sel.value, container);
    if (repl) replacements.push(repl);
    sel.disabled = true;
  });

  if (Array.isArray(currentBackgroundData.tools)) {
    currentBackgroundData.tools.forEach((t) => {
      const sel = addUniqueProficiency('tools', t, container);
      if (sel) replacements.push(sel);
    });
  }
  pendingSelections.tools.forEach((sel) => {
    const repl = addUniqueProficiency('tools', sel.value, container);
    if (repl) replacements.push(repl);
    sel.disabled = true;
  });

  if (!Array.isArray(DATA.languages) || !DATA.languages.length) {
    const langs = await fetchJsonWithRetry('data/languages.json', 'languages');
    DATA.languages = langs.languages || langs;
  }
  if (Array.isArray(currentBackgroundData.languages)) {
    currentBackgroundData.languages.forEach((l) => {
      const sel = addUniqueProficiency('languages', l, container);
      if (sel) replacements.push(sel);
    });
  }
  pendingSelections.languages.forEach((sel) => {
    const repl = addUniqueProficiency('languages', sel.value, container);
    if (repl) replacements.push(repl);
    sel.disabled = true;
  });

  if (pendingSelections.feat && pendingSelections.feat.value) {
    const featSet = new Set(CharacterState.feats || []);
    featSet.add(pendingSelections.feat.value);
    CharacterState.feats = Array.from(featSet);
    pendingSelections.feat.disabled = true;
  }

  pendingSelections.skills = [];
  pendingSelections.tools = [];
  pendingSelections.languages = [];
  pendingSelections.feat = null;

  refreshBaseState();
  rebuildFromClasses();

  const finalize = () => {
    logCharacterState();
    showStep(5);
  };

  if (replacements.length) {
    const btn = document.getElementById('confirmBackgroundSelection');
    if (btn) btn.disabled = true;
    const check = () => {
      if (replacements.every((s) => s.value)) {
        replacements.forEach((s) => s.removeEventListener('change', check));
        finalize();
      }
    };
    replacements.forEach((s) => s.addEventListener('change', check));
    return;
  }

  finalize();
}

export function loadStep4(force = false) {
  const container = document.getElementById('backgroundList');
  const searchInput = document.getElementById('backgroundSearch');
  if (!container) return;
  if (force) {
    container.classList.remove('hidden');
    searchInput?.classList.remove('hidden');
    document.getElementById('backgroundFeatures')?.classList.add('hidden');
  }
  if (container.childElementCount && !force) return;
  renderBackgroundList(searchInput?.value);
  searchInput?.addEventListener('input', (e) => {
    renderBackgroundList(e.target.value);
  });
  const btn = document.getElementById('confirmBackgroundSelection');
  btn?.addEventListener('click', confirmBackgroundSelection);
  btn?.setAttribute('disabled', 'true');

  const changeBtn = document.getElementById('changeBackground');
  changeBtn?.addEventListener('click', () => {
    currentBackgroundData = null;
    pendingSelections.skills = [];
    pendingSelections.tools = [];
    pendingSelections.languages = [];
    pendingSelections.feat = null;
    const list = document.getElementById('backgroundList');
    list?.classList.remove('hidden');
    const search = document.getElementById('backgroundSearch');
    search?.classList.remove('hidden');
    const features = document.getElementById('backgroundFeatures');
    if (features) {
      features.classList.add('hidden');
      features.innerHTML = '';
    }
    renderBackgroundList(search?.value);
  });
}

