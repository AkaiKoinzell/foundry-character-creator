import {
  DATA,
  CharacterState,
  logCharacterState,
  fetchJsonWithRetry,
  loadBackgrounds,
} from './data.js';
import { refreshBaseState, rebuildFromClasses } from './step2.js';
import { updateChoiceSelectOptions } from './choice-select-helpers.js';
import { t } from './i18n.js';
import * as main from './main.js';
import {
  createElement,
  createAccordionItem,
  createSelectableCard,
  appendEntries,
} from './ui-helpers.js';
import { inlineWarning } from './validation.js';
import { addUniqueProficiency, pendingReplacements } from './proficiency.js';
import { renderFeatChoices } from './feat.js';

let currentBackgroundData = null;
const BACKGROUND_SOURCE = 'Background';
const pendingSelections = {
  skills: [],
  tools: [],
  languages: [],
  feat: null,
  featRenderer: null,
  featLoader: null,
};

let appliedBackground = null;

export function resetPendingSelections() {
  pendingSelections.skills = [];
  pendingSelections.tools = [];
  pendingSelections.languages = [];
  pendingSelections.feat = null;
  pendingSelections.featRenderer = null;
  pendingSelections.featLoader = null;
}

async function ensureLanguageListLoaded() {
  if (Array.isArray(DATA.languages) && DATA.languages.length) return;
  try {
    const langs = await fetchJsonWithRetry('data/languages.json', 'languages');
    const list = Array.isArray(langs?.languages)
      ? langs.languages
      : Array.isArray(langs)
      ? langs
      : [];
    DATA.languages = list;
  } catch (err) {
    console.error('Unable to load languages', err);
  }
}

function removeProficienciesBySource(source) {
  const sources = CharacterState.proficiencySources || {};
  let changed = false;
  const extract = (type) => {
    const map = sources[type];
    if (!map) return [];
    const values = Object.entries(map)
      .filter(([, src]) => src === source)
      .map(([value]) => value);
    if (!values.length) return [];
    values.forEach((value) => delete map[value]);
    if (!Object.keys(map).length) delete sources[type];
    return values;
  };

  const removeStrings = (list, toRemove) => {
    if (!Array.isArray(list) || !toRemove.length) return list;
    return list.filter((item) => !toRemove.includes(item));
  };

  const skillVals = extract('skills');
  if (skillVals.length) {
    CharacterState.system.skills = removeStrings(
      CharacterState.system.skills,
      skillVals
    );
    changed = true;
  }

  const toolVals = extract('tools');
  if (toolVals.length) {
    CharacterState.system.tools = removeStrings(
      CharacterState.system.tools,
      toolVals
    );
    changed = true;
  }

  const languageVals = extract('languages');
  if (languageVals.length) {
    const langs = CharacterState.system.traits?.languages;
    if (langs && Array.isArray(langs.value)) {
      langs.value = removeStrings(langs.value, languageVals);
      changed = true;
    }
  }

  const cantripVals = extract('cantrips');
  if (cantripVals.length) {
    const cantrips = CharacterState.system.spells?.cantrips;
    if (Array.isArray(cantrips)) {
      CharacterState.system.spells.cantrips = removeStrings(
        cantrips,
        cantripVals
      );
      changed = true;
    }
  }

  const weaponVals = extract('weapons');
  if (weaponVals.length) {
    const weapons = CharacterState.system.weapons;
    if (Array.isArray(weapons)) {
      CharacterState.system.weapons = removeStrings(weapons, weaponVals);
      changed = true;
    }
  }

  const infusionVals = extract('infusion');
  if (infusionVals.length) {
    const infusions = CharacterState.infusions || [];
    CharacterState.infusions = infusions.filter((inf) => {
      const name = typeof inf === 'string' ? inf : inf?.name;
      return !infusionVals.includes(name);
    });
    changed = true;
  }

  return changed;
}

function ensureSelectOption(select, value, label = value) {
  if (!(select instanceof HTMLSelectElement) || !value) return null;
  let option = Array.from(select.options).find((opt) => opt.value === value);
  if (!option) {
    option = new Option(label || value, value);
    select.appendChild(option);
  }
  return option;
}

function setBackgroundSelectValues(selects, values = []) {
  if (!Array.isArray(selects) || !selects.length || !Array.isArray(values)) {
    return;
  }
  let idx = 0;
  selects.forEach((sel) => {
    if (!(sel instanceof HTMLSelectElement)) return;
    while (idx < values.length) {
      const val = values[idx++];
      if (!val) continue;
      ensureSelectOption(sel, val, val);
      sel.value = val;
      sel.dispatchEvent(new Event('change'));
      break;
    }
  });
}

async function applyStoredBackgroundSelections(bg) {
  if (!bg) return;
  const choices = CharacterState.backgroundChoices || {};

  const skillOptions = (choices.skills || []).filter((skill) =>
    !(bg.skills || []).includes(skill)
  );
  setBackgroundSelectValues(pendingSelections.skills, skillOptions);

  const toolOptions = (choices.tools || []).filter((tool) => {
    const fixed = Array.isArray(bg.tools) ? bg.tools : [];
    return !fixed.includes(tool);
  });
  setBackgroundSelectValues(pendingSelections.tools, toolOptions);

  const langOptions = (choices.languages || []).filter((lang) => {
    const fixedLangs = Array.isArray(bg.languages) ? bg.languages : [];
    return !fixedLangs.includes(lang);
  });
  setBackgroundSelectValues(pendingSelections.languages, langOptions);

  if (pendingSelections.feat && choices.feat) {
    pendingSelections.feat.value = choices.feat;
    if (typeof pendingSelections.featLoader === 'function') {
      await pendingSelections.featLoader(choices.feat);
    } else {
      pendingSelections.feat.dispatchEvent(new Event('change'));
    }
  }

  validateBackgroundChoices();
}

async function restoreSelectedBackground() {
  const name = CharacterState.system?.details?.background;
  if (!name) return false;
  const bg = DATA.backgrounds?.[name];
  if (!bg) return false;
  resetPendingSelections();
  currentBackgroundData = bg;
  try {
    await selectBackground(bg);
  } catch (err) {
    console.error('Failed to restore background', err);
    return false;
  }
  await applyStoredBackgroundSelections(bg);
  return true;
}

export function clearAppliedBackground() {
  const details = CharacterState.system?.details;
  const hadBackground = !!details?.background;
  const removed = removeProficienciesBySource(BACKGROUND_SOURCE);

  let changed = removed;

  if (appliedBackground?.feat) {
    const before = CharacterState.feats || [];
    CharacterState.feats = before.filter(
      (feat) => feat.name !== appliedBackground.feat
    );
    if (before.length !== CharacterState.feats.length) changed = true;
  }

  if (hadBackground && details) {
    details.background = '';
    changed = true;
  }
  appliedBackground = null;
  CharacterState.backgroundChoices = {
    skills: [],
    tools: [],
    languages: [],
    feat: '',
  };

  return changed;
}
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
    const details = [];
    if (bg.skills && bg.skills.length)
      details.push(createElement('p', `${t('skills')}: ${bg.skills.join(', ')}`));
    if (Array.isArray(bg.tools) && bg.tools.length)
      details.push(createElement('p', `${t('tools')}: ${bg.tools.join(', ')}`));
    if (Array.isArray(bg.languages) && bg.languages.length)
      details.push(
        createElement('p', `${t('languages')}: ${bg.languages.join(', ')}`)
      );
    if (bg.featOptions && bg.featOptions.length)
      details.push(
        createElement(
          'p',
          `${t('featOptions')}: ${bg.featOptions.join(', ')}`
        )
      );
    const onSelect = async () => {
      try {
        await selectBackground(bg);
      } catch (err) {
        console.error('Failed to select background', err);
      }
    };
    const card = createSelectableCard(
      name,
      bg.short || bg.description || bg.summary || bg.desc || '',
      details,
      onSelect,
      t('details')
    );
    container.appendChild(card);
  }
}


async function handleBackgroundBackNavigation() {
  if (!currentBackgroundData) return false;
  currentBackgroundData = null;
  resetPendingSelections();
  const list = document.getElementById('backgroundList');
  const features = document.getElementById('backgroundFeatures');
  const search = document.getElementById('backgroundSearch');
  const changeBtn = document.getElementById('changeBackground');
  list?.classList.remove('hidden');
  search?.classList.remove('hidden');
  if (features) {
    features.classList.add('hidden');
    features.innerHTML = '';
  }
  changeBtn?.classList.add('hidden');
  renderBackgroundList(search?.value || '');
  validateBackgroundChoices();
  main.setCurrentStepComplete?.(isStepComplete());
  return true;
}

async function selectBackground(bg) {
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
  resetPendingSelections();
  choiceAccordions.skills = null;
  choiceAccordions.tools = null;
  choiceAccordions.languages = null;
  choiceAccordions.feat = null;

  const needsLanguageChoices =
    currentBackgroundData.languages &&
    !Array.isArray(currentBackgroundData.languages) &&
    currentBackgroundData.languages.choose;
  if (needsLanguageChoices) {
    await ensureLanguageListLoaded();
  }

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
        `${t('featOptions')}: ${currentBackgroundData.featOptions.join(', ')}`
      )
    );
  features.appendChild(createAccordionItem(t('details'), details));

  // Choices --------------------------------------------------
  const appendFeatureDesc = (wrapper, key) => {
    const entry = (currentBackgroundData.entries || []).find(
      e => e.name && e.name.toLowerCase().includes(key)
    );
    if (entry) {
      if (entry.description)
        wrapper.appendChild(createElement('p', entry.description));
      appendEntries(wrapper, entry.entries);
    }
  };

  if (currentBackgroundData.skillChoices?.choose) {
    const wrapper = document.createElement('div');
    appendFeatureDesc(wrapper, 'skill');
    for (let i = 0; i < currentBackgroundData.skillChoices.choose; i++) {
      const sel = document.createElement('select');
      sel.replaceChildren(new Option(t('selectSkill'), ''));
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
    appendFeatureDesc(wrapper, 'tool');
    for (let i = 0; i < toolData.choose; i++) {
      const sel = document.createElement('select');
      sel.replaceChildren(new Option(t('selectTool'), ''));
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

  if (needsLanguageChoices) {
    const wrapper = document.createElement('div');
    appendFeatureDesc(wrapper, 'language');
    const langOpts = currentBackgroundData.languages.options?.length
      ? currentBackgroundData.languages.options
      : DATA.languages || [];
    for (let i = 0; i < currentBackgroundData.languages.choose; i++) {
      const sel = document.createElement('select');
      sel.replaceChildren(new Option(t('selectLanguage'), ''));
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
    appendFeatureDesc(wrapper, 'feat');
    const sel = document.createElement('select');
    sel.replaceChildren(new Option(t('selectFeat'), ''));
    currentBackgroundData.featOptions.forEach((f) => {
      const o = document.createElement('option');
      o.value = f;
      o.textContent = f;
      sel.appendChild(o);
    });
    // Disable feats already known
    const taken = new Set((CharacterState.feats || []).map(f => f.name));
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
    const featChoicesDiv = document.createElement('div');
    const loadFeatSelection = async (featName) => {
      pendingSelections.featRenderer = null;
      featChoicesDiv.innerHTML = '';
      if (featName) {
        pendingSelections.featRenderer = await renderFeatChoices(
          featName,
          featChoicesDiv,
          validateBackgroundChoices
        );
        const all = [
          ...(pendingSelections.featRenderer.abilitySelects || []),
          ...(pendingSelections.featRenderer.skillSelects || []),
          ...(pendingSelections.featRenderer.toolSelects || []),
          ...(pendingSelections.featRenderer.languageSelects || []),
          ...(pendingSelections.featRenderer.spellSelects || []),
          ...(pendingSelections.featRenderer.optionalFeatureSelects || []),
        ];
        all.forEach((s) =>
          s.addEventListener('change', validateBackgroundChoices)
        );
      }
      validateBackgroundChoices();
    };
    pendingSelections.featLoader = loadFeatSelection;
    sel.addEventListener('change', () => {
      loadFeatSelection(sel.value);
    });
    pendingSelections.feat = sel;
    wrapper.appendChild(sel);
    wrapper.appendChild(featChoicesDiv);
    const acc = createAccordionItem(t('feat'), wrapper, true);
    acc.classList.add('needs-selection');
    features.appendChild(acc);
    choiceAccordions.feat = acc;
  }

  validateBackgroundChoices();
}

function validateBackgroundChoices() {
  const check = (arr, container) =>
    inlineWarning(container, arr.every((s) => s.value), arr);

  const skillValid = check(pendingSelections.skills, choiceAccordions.skills);
  const toolValid = check(pendingSelections.tools, choiceAccordions.tools);
  const langValid = check(pendingSelections.languages, choiceAccordions.languages);

  let featValid = true;
  if (pendingSelections.feat) {
    const featFields = [pendingSelections.feat];
    featValid = !!pendingSelections.feat.value;
    if (featValid && pendingSelections.featRenderer) {
      featValid = pendingSelections.featRenderer.isComplete();
      featFields.push(
        ...(pendingSelections.featRenderer.abilitySelects || []),
        ...(pendingSelections.featRenderer.skillSelects || []),
        ...(pendingSelections.featRenderer.toolSelects || []),
        ...(pendingSelections.featRenderer.languageSelects || []),
        ...(pendingSelections.featRenderer.spellSelects || []),
        ...(pendingSelections.featRenderer.optionalFeatureSelects || [])
      );
    }
    inlineWarning(choiceAccordions.feat, featValid, featFields);
  } else {
    inlineWarning(choiceAccordions.feat, true);
  }

  const allValid = skillValid && toolValid && langValid && featValid;
  main.setCurrentStepComplete?.(allValid);
  return allValid;
}

async function confirmBackgroundSelection() {
  if (!currentBackgroundData) return false;
  if (!validateBackgroundChoices()) return false;

  const container = document.getElementById('backgroundFeatures');
  clearAppliedBackground();
  CharacterState.system.details.background = currentBackgroundData.name;

  let chosenFeatName = '';
  const choiceRecord = {
    skills: [],
    tools: [],
    languages: [],
    feat: '',
  };

  const replacements = [];

  (currentBackgroundData.skills || []).forEach((s) => {
    const sel = addUniqueProficiency(
      'skills',
      s,
      container,
      BACKGROUND_SOURCE
    );
    if (sel) replacements.push(sel);
  });
  pendingSelections.skills.forEach((sel) => {
    const repl = addUniqueProficiency(
      'skills',
      sel.value,
      container,
      BACKGROUND_SOURCE
    );
    if (repl) replacements.push(repl);
    if (sel.value) choiceRecord.skills.push(sel.value);
    sel.disabled = true;
  });

  if (Array.isArray(currentBackgroundData.tools)) {
    currentBackgroundData.tools.forEach((t) => {
      const sel = addUniqueProficiency(
        'tools',
        t,
        container,
        BACKGROUND_SOURCE
      );
      if (sel) replacements.push(sel);
    });
  }
  pendingSelections.tools.forEach((sel) => {
    const repl = addUniqueProficiency(
      'tools',
      sel.value,
      container,
      BACKGROUND_SOURCE
    );
    if (repl) replacements.push(repl);
    if (sel.value) choiceRecord.tools.push(sel.value);
    sel.disabled = true;
  });

  await ensureLanguageListLoaded();
  if (Array.isArray(currentBackgroundData.languages)) {
    currentBackgroundData.languages.forEach((l) => {
      const sel = addUniqueProficiency(
        'languages',
        l,
        container,
        BACKGROUND_SOURCE
      );
      if (sel) replacements.push(sel);
    });
  }
  pendingSelections.languages.forEach((sel) => {
    const repl = addUniqueProficiency(
      'languages',
      sel.value,
      container,
      BACKGROUND_SOURCE
    );
    if (repl) replacements.push(repl);
    if (sel.value) choiceRecord.languages.push(sel.value);
    sel.disabled = true;
  });

  if (pendingSelections.feat && pendingSelections.feat.value) {
    pendingSelections.featRenderer?.apply();
    const featMap = new Map((CharacterState.feats || []).map(f => [f.name, f]));
    if (!featMap.has(pendingSelections.feat.value)) {
      featMap.set(pendingSelections.feat.value, { name: pendingSelections.feat.value });
    }
    CharacterState.feats = Array.from(featMap.values());
    pendingSelections.feat.disabled = true;
    chosenFeatName = pendingSelections.feat.value;
    choiceRecord.feat = chosenFeatName;
  }

  CharacterState.backgroundChoices = choiceRecord;
  resetPendingSelections();

  refreshBaseState();
  rebuildFromClasses();

  const finalize = () => {
    appliedBackground = {
      name: CharacterState.system.details.background || '',
      feat: chosenFeatName,
    };
    logCharacterState();
    main.setCurrentStepComplete?.(true);
  };

  if (replacements.length) {
    main.setCurrentStepComplete?.(false);
    const check = () => {
      if (replacements.every((s) => s.value)) {
        replacements.forEach((s) => s.removeEventListener('change', check));
        finalize();
      }
    };
    replacements.forEach((s) => s.addEventListener('change', check));
    return false;
  }

  finalize();
  main.invalidateStep(5);
  main.invalidateStep(main.TOTAL_STEPS - 1);
  main.invalidateStepsFrom(5);
  return true;
}

export async function loadStep4(force = false) {
  main.registerStepBackHandler?.(4, handleBackgroundBackNavigation);
  try {
    await loadBackgrounds(force);
  } catch (err) {
    console.error('Unable to load backgrounds', err);
    return;
  }
  if (force) resetPendingSelections();
  const container = document.getElementById('backgroundList');
  let searchInput = document.getElementById('backgroundSearch');
  if (!container) return;
  if (force) {
    container.classList.remove('hidden');
    searchInput?.classList.remove('hidden');
    document.getElementById('backgroundFeatures')?.classList.add('hidden');
  }
  if (searchInput) {
    const newInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newInput, searchInput);
    searchInput = newInput;
    searchInput.addEventListener('input', (e) => {
      renderBackgroundList(e.target.value);
    });
  }
  let changeBtn = document.getElementById('changeBackground');
  if (changeBtn) {
    const newBtn = changeBtn.cloneNode(true);
    changeBtn.parentNode.replaceChild(newBtn, changeBtn);
    changeBtn = newBtn;
    changeBtn.addEventListener('click', () => {
      const changed = clearAppliedBackground();
      if (changed) {
        refreshBaseState();
        rebuildFromClasses();
      }
      currentBackgroundData = null;
      resetPendingSelections();
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
      main.invalidateStep(5);
      main.invalidateStep(main.TOTAL_STEPS - 1);
      main.invalidateStepsFrom(5);
    });
  }

  const restored = await restoreSelectedBackground();
  if (!restored) {
    renderBackgroundList(searchInput?.value);
  }
}

export function isStepComplete() {
  return !!CharacterState.system.details.background && pendingReplacements() === 0;
}

export async function confirmStep() {
  if (isStepComplete()) return true;
  return confirmBackgroundSelection();
}
