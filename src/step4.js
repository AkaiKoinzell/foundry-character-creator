import {
  DATA,
  CharacterState,
  fetchJsonWithRetry,
  logCharacterState
} from './data.js';
import { refreshBaseState, rebuildFromClasses, updateChoiceSelectOptions } from './step2.js';
import { t } from './i18n.js';
import { showStep } from './main.js';
import { addUniqueProficiency } from './proficiency.js';

let currentBackgroundData = null;
const pendingSelections = {
  skills: [],
  tools: [],
  languages: [],
  feat: null
};

function createElement(tag, text) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  return el;
}

function createAccordionItem(title, content, isChoice = false) {
  const item = document.createElement('div');
  item.className = 'accordion-item' + (isChoice ? ' user-choice' : '');

  const header = document.createElement('button');
  header.className = 'accordion-header';
  header.textContent = title;

  const body = document.createElement('div');
  body.className = 'accordion-content';
  if (typeof content === 'string') body.textContent = content;
  else body.appendChild(content);

  header.addEventListener('click', () => {
    header.classList.toggle('active');
    body.classList.toggle('show');
  });

  item.appendChild(header);
  item.appendChild(body);
  return item;
}

export function renderBackgroundList() {
  const container = document.getElementById('backgroundList');
  if (!container) return;
  container.innerHTML = '';
  const entries = DATA.backgrounds || {};
  for (const [name, path] of Object.entries(entries)) {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.addEventListener('click', () => selectBackground(path));
    const title = createElement('h3', name);
    card.appendChild(title);
    container.appendChild(card);
  }
}

async function selectBackground(path) {
  currentBackgroundData = await fetchJsonWithRetry(path, `background at ${path}`);
  const list = document.getElementById('backgroundList');
  list?.classList.add('hidden');

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
  const container = document.getElementById('backgroundFeatures');

  CharacterState.system.details.background = currentBackgroundData.name;

  (currentBackgroundData.skills || []).forEach((s) =>
    addUniqueProficiency('skills', s, container)
  );
  if (Array.isArray(currentBackgroundData.tools)) {
    currentBackgroundData.tools.forEach((t) =>
      addUniqueProficiency('tools', t, container)
    );
  }
  if (Array.isArray(currentBackgroundData.languages)) {
    currentBackgroundData.languages.forEach((l) =>
      addUniqueProficiency('languages', l, container)
    );
  }

  pendingSelections.skills.forEach((sel) =>
    addUniqueProficiency('skills', sel.value, container)
  );
  pendingSelections.tools.forEach((sel) =>
    addUniqueProficiency('tools', sel.value, container)
  );
  pendingSelections.languages.forEach((sel) =>
    addUniqueProficiency('languages', sel.value, container)
  );
  if (pendingSelections.feat && pendingSelections.feat.value) {
    CharacterState.feats = CharacterState.feats || [];
    if (!CharacterState.feats.includes(pendingSelections.feat.value))
      CharacterState.feats.push(pendingSelections.feat.value);
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
  if (!container) return;
  if (container.childElementCount && !force) return;
  renderBackgroundList();
  const btn = document.getElementById('confirmBackgroundSelection');
  btn?.addEventListener('click', confirmBackgroundSelection);
  btn?.setAttribute('disabled', 'true');
}

