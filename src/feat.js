import { CharacterState } from './data.js';
import { t } from './i18n.js';
import { addUniqueProficiency } from './proficiency.js';
import { createElement } from './ui-helpers.js';

function capitalize(str) {
  return str.replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}

async function getFeat(name) {
  const mod = await import('./data.js');
  return mod.loadFeatDetails(name);
}

export async function renderFeatChoices(featName, container) {
  const feat = await getFeat(featName);
  const wrapper = createElement('div');
  container.appendChild(wrapper);

  const abilitySelects = [];
  const skillSelects = [];
  const toolSelects = [];
  const languageSelects = [];

  if (Array.isArray(feat.ability)) {
    feat.ability.forEach((ab) => {
      if (ab.choose) {
        const amount = ab.choose.amount || ab.choose.count || 1;
        const from = ab.choose.from || [];
        for (let i = 0; i < amount; i++) {
          const sel = document.createElement('select');
          sel.innerHTML = `<option value=''>${t('selectAbilityForFeat')}</option>`;
          from.forEach((opt) => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt.toUpperCase();
            sel.appendChild(o);
          });
          wrapper.appendChild(sel);
          abilitySelects.push(sel);
        }
      }
    });
  }

  const makeSelects = (arr, list, labelKey) => {
    arr.forEach((entry) => {
      if (entry.choose) {
        const amount = entry.choose.amount || entry.choose.count || 1;
        const from = entry.choose.from || entry.choose.options || [];
        for (let i = 0; i < amount; i++) {
          const sel = document.createElement('select');
          sel.innerHTML = `<option value=''>${t(labelKey)}</option>`;
          from.forEach((opt) => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            sel.appendChild(o);
          });
          wrapper.appendChild(sel);
          list.push(sel);
        }
      }
    });
  };

  if (Array.isArray(feat.skillProficiencies)) {
    makeSelects(feat.skillProficiencies, skillSelects, 'selectSkillForFeat');
  }
  if (Array.isArray(feat.toolProficiencies)) {
    makeSelects(feat.toolProficiencies, toolSelects, 'selectToolForFeat');
  }
  if (Array.isArray(feat.languageProficiencies)) {
    makeSelects(feat.languageProficiencies, languageSelects, 'selectLanguageForFeat');
  }

  const isComplete = () =>
    abilitySelects.every((s) => s.value) &&
    skillSelects.every((s) => s.value) &&
    toolSelects.every((s) => s.value) &&
    languageSelects.every((s) => s.value);

  const apply = () => {
    const featObj = { name: featName, system: {} };
    if (abilitySelects.length) {
      abilitySelects.forEach((sel) => {
        const code = sel.value;
        featObj.ability = featObj.ability || {};
        featObj.ability[code] = (featObj.ability[code] || 0) + 1;
        if (
          CharacterState.system.abilities[code] &&
          CharacterState.bonusAbilities[code] !== undefined
        ) {
          const base =
            CharacterState.baseAbilities?.[code] ??
            CharacterState.system.abilities[code].value -
              (CharacterState.bonusAbilities[code] || 0);
          CharacterState.bonusAbilities[code] += 1;
          CharacterState.system.abilities[code].value =
            base + CharacterState.bonusAbilities[code];
        }
      });
    }
    if (skillSelects.length) {
      featObj.skills = [];
      skillSelects.forEach((sel) => {
        const val = capitalize(sel.value);
        featObj.skills.push(val);
        addUniqueProficiency('skills', val, container);
      });
    }
    if (toolSelects.length) {
      featObj.tools = [];
      toolSelects.forEach((sel) => {
        featObj.tools.push(sel.value);
        addUniqueProficiency('tools', sel.value, container);
      });
    }
    if (languageSelects.length) {
      featObj.languages = [];
      languageSelects.forEach((sel) => {
        featObj.languages.push(sel.value);
        addUniqueProficiency('languages', sel.value, container);
      });
    }
    const idx = (CharacterState.feats || []).findIndex((f) => f.name === featName);
    if (idx >= 0) CharacterState.feats[idx] = featObj;
    else {
      CharacterState.feats = CharacterState.feats || [];
      CharacterState.feats.push(featObj);
    }
  };

  return { abilitySelects, skillSelects, toolSelects, languageSelects, isComplete, apply };
}
