import { loadLanguages } from './common.js';
import { buildChoiceSelectors } from './selectionUtils.js';

export function handleExtraLanguages(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (data.languages && data.languages.choice > 0) {
    loadLanguages(langs => {
      const availableLangs = langs.filter(lang => !data.languages.fixed.includes(lang));
      const wrapper = document.createElement('div');
      const title = document.createElement('h4');
      title.textContent = 'Lingue Extra';
      wrapper.appendChild(title);
      buildChoiceSelectors(wrapper, data.languages.choice, availableLangs, 'extraLanguageChoice');
      container.appendChild(wrapper);
    });
  }
}

export function handleExtraSkills(data, containerId) {
  if (data.skill_choices) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const skillContainer = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = 'Skill Extra';
    skillContainer.appendChild(title);
    buildChoiceSelectors(skillContainer, data.skill_choices.number, data.skill_choices.options, 'skillChoice');
    container.appendChild(skillContainer);
  }
}

export function handleExtraTools(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (data.tool_choices) {
    const toolDiv = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = 'Tool Extra';
    toolDiv.appendChild(title);
    buildChoiceSelectors(toolDiv, data.tool_choices.number, data.tool_choices.options, 'toolChoice');
    container.appendChild(toolDiv);
  }
}

export function handleExtraAncestry(data, containerId) {
  if (data.variant_feature_choices && data.variant_feature_choices.length > 0) {
    const ancestryOptions = data.variant_feature_choices.filter(opt => opt.name.toLowerCase().includes('ancestry'));
    if (ancestryOptions.length > 0) {
      let html = `<h4>Seleziona Ancestry</h4>
                  <select id="ancestrySelection">
                    <option value="">Seleziona...</option>`;
      ancestryOptions.forEach(opt => {
        html += `<option value="${opt.name}">${opt.name}</option>`;
      });
      html += `</select>`;
      const container = document.getElementById(containerId);
      if (container) container.innerHTML = html;
    }
  } else {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
  }
}

export function gatherRaceTraitSelections() {
  const result = {};
  const languages = [...document.querySelectorAll('#languageSelection .extraLanguageChoice')]
    .map(s => s.value)
    .filter(Boolean);
  if (languages.length) result.languages = languages;

  const skills = [...document.querySelectorAll('#skillSelectionContainer .skillChoice')]
    .map(s => s.value)
    .filter(Boolean);
  if (skills.length) result.skills = skills;

  const tools = [...document.querySelectorAll('#toolSelectionContainer .toolChoice')]
    .map(s => s.value)
    .filter(Boolean);
  if (tools.length) result.tools = tools;

  const variant = document.getElementById('variantFeatureChoice')?.value;
  if (variant) {
    result.variantFeature = variant;
    const vSkills = [...document.querySelectorAll('.variantSkillChoice')]
      .map(s => s.value)
      .filter(Boolean);
    if (vSkills.length) result.variantSkills = vSkills;
    const vSpell = document.getElementById('variantSpellChoice')?.value;
    if (vSpell) result.variantSpell = vSpell;
  }

  const ancestry = document.getElementById('ancestrySelection')?.value;
  if (ancestry) result.ancestry = ancestry;

  return result;
}
