import { loadLanguages } from './common.js';

export function handleExtraLanguages(data, containerId) {
  if (data.languages && data.languages.choice > 0) {
    loadLanguages(langs => {
      const availableLangs = langs.filter(lang => !data.languages.fixed.includes(lang));
      const options = availableLangs.map(lang => `<option value="${lang}">${lang}</option>`).join('');
      const html = `<h4>Lingue Extra</h4>
                    <select id="extraLanguageDropdown">
                      <option value="">Seleziona...</option>
                      ${options}
                    </select>`;
      const container = document.getElementById(containerId);
      if (container) container.innerHTML = html;
    });
  } else {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
  }
}

export function handleExtraSkills(data, containerId) {
  if (data.skill_choices) {
    const skillContainer = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = 'Skill Extra';
    skillContainer.appendChild(title);

    const selects = [];
    for (let i = 0; i < data.skill_choices.number; i++) {
      const select = document.createElement('select');
      select.classList.add('skillChoice');
      select.id = `skillChoice${i}`;
      select.dataset.options = JSON.stringify(data.skill_choices.options);

      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Seleziona...';
      select.appendChild(defaultOption);

      data.skill_choices.options.forEach(skill => {
        const option = document.createElement('option');
        option.value = skill;
        option.textContent = skill;
        select.appendChild(option);
      });

      skillContainer.appendChild(select);
      selects.push(select);
    }

    const update = () => {
      const chosen = new Set(selects.map(s => s.value).filter(Boolean));
      selects.forEach(sel => {
        const opts = JSON.parse(sel.dataset.options);
        const current = sel.value;
        sel.innerHTML = `<option value="">Seleziona...</option>` +
          opts.map(o => `<option value="${o}" ${chosen.has(o) && o !== current ? 'disabled' : ''}>${o}</option>`).join('');
        sel.value = current;
      });
    };
    selects.forEach(sel => sel.addEventListener('change', update));
    update();

    const container = document.getElementById(containerId);
    if (container) container.appendChild(skillContainer);
  }
}

export function handleExtraTools(data, containerId) {
  if (data.tool_choices) {
    const container = document.getElementById(containerId);
    const toolDiv = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = 'Tool Extra';
    toolDiv.appendChild(title);

    const selects = [];
    for (let i = 0; i < data.tool_choices.number; i++) {
      const select = document.createElement('select');
      select.classList.add('toolChoice');
      select.id = `toolChoice${i}`;
      select.dataset.options = JSON.stringify(data.tool_choices.options);

      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Seleziona...';
      select.appendChild(defaultOption);

      data.tool_choices.options.forEach(tool => {
        const option = document.createElement('option');
        option.value = tool;
        option.textContent = tool;
        select.appendChild(option);
      });

      toolDiv.appendChild(select);
      selects.push(select);
    }

    const update = () => {
      const chosen = new Set(selects.map(s => s.value).filter(Boolean));
      selects.forEach(sel => {
        const opts = JSON.parse(sel.dataset.options);
        const current = sel.value;
        sel.innerHTML = `<option value="">Seleziona...</option>` +
          opts.map(o => `<option value="${o}" ${chosen.has(o) && o !== current ? 'disabled' : ''}>${o}</option>`).join('');
        sel.value = current;
      });
    };
    selects.forEach(sel => sel.addEventListener('change', update));
    update();

    if (container) {
      container.innerHTML = '';
      container.appendChild(toolDiv);
    }
  } else {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
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
  const lang = document.getElementById('extraLanguageDropdown')?.value;
  if (lang) result.languages = [lang];

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
