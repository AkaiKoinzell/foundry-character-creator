import {
  DATA,
  CharacterState,
  logCharacterState
} from './data.js';
import { refreshBaseState, rebuildFromClasses, updateChoiceSelectOptions } from './step2.js';
import { t } from './i18n.js';
import { showStep } from './main.js';
import { createElement, createAccordionItem } from './ui-helpers.js';

let currentBackgroundData = null;
const pendingSelections = {
  skills: [],
  tools: [],
  languages: [],
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
  features.innerHTML = '';

  pendingSelections.skills = [];
  pendingSelections.tools = [];
  pendingSelections.languages = [];
  pendingSelections.feat = null;

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
  const choices = document.createElement('div');

  if (currentBackgroundData.skillChoices?.choose) {
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
      choices.appendChild(sel);
    }
    updateChoiceSelectOptions(pendingSelections.skills, 'skills');
  }

  const toolData = currentBackgroundData.toolChoices ||
    (currentBackgroundData.tools && !Array.isArray(currentBackgroundData.tools) ? currentBackgroundData.tools : null);
  if (toolData?.choose) {
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
      choices.appendChild(sel);
    }
    updateChoiceSelectOptions(pendingSelections.tools, 'tools');
  }

  if (
    currentBackgroundData.languages &&
    !Array.isArray(currentBackgroundData.languages) &&
    currentBackgroundData.languages.choose
  ) {
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
      choices.appendChild(sel);
    }
    updateChoiceSelectOptions(pendingSelections.languages, 'languages');
  }

  if (currentBackgroundData.featOptions && currentBackgroundData.featOptions.length) {
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
    choices.appendChild(sel);
  }

  if (choices.childElementCount)
    features.appendChild(
      createAccordionItem(t('yourChoices') || 'Your Choices', choices, true)
    );

  validateBackgroundChoices();
}

function validateBackgroundChoices() {
  const btn = document.getElementById('confirmBackgroundSelection');
  const all = [
    ...pendingSelections.skills,
    ...pendingSelections.tools,
    ...pendingSelections.languages,
  ];
  if (pendingSelections.feat) all.push(pendingSelections.feat);
  const valid = all.every((s) => !s || s.value);
  if (btn) btn.disabled = !valid;
  return valid;
}

function confirmBackgroundSelection() {
  if (!currentBackgroundData) return;
  if (!validateBackgroundChoices()) return;

  CharacterState.system.details.background = currentBackgroundData.name;

  const skillSet = new Set(CharacterState.system.skills);
  (currentBackgroundData.skills || []).forEach((s) => skillSet.add(s));
  pendingSelections.skills.forEach((sel) => skillSet.add(sel.value));
  CharacterState.system.skills = Array.from(skillSet);

  const toolSet = new Set(CharacterState.system.tools);
  if (Array.isArray(currentBackgroundData.tools)) {
    currentBackgroundData.tools.forEach((t) => toolSet.add(t));
  }
  pendingSelections.tools.forEach((sel) => toolSet.add(sel.value));
  CharacterState.system.tools = Array.from(toolSet);

  const langSet = new Set(CharacterState.system.traits.languages.value);
  if (Array.isArray(currentBackgroundData.languages)) {
    currentBackgroundData.languages.forEach((l) => langSet.add(l));
  }
  pendingSelections.languages.forEach((sel) => langSet.add(sel.value));
  CharacterState.system.traits.languages.value = Array.from(langSet);

  if (pendingSelections.feat && pendingSelections.feat.value) {
    const featSet = new Set(CharacterState.feats || []);
    featSet.add(pendingSelections.feat.value);
    CharacterState.feats = Array.from(featSet);
    pendingSelections.feat.disabled = true;
  }

  [...pendingSelections.skills, ...pendingSelections.tools, ...pendingSelections.languages].forEach(
    (sel) => (sel.disabled = true)
  );

  refreshBaseState();
  rebuildFromClasses();
  logCharacterState();
  showStep(5);
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

