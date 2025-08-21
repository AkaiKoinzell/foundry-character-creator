import { handleError } from './common.js';
import { createHeader, createParagraph } from './domHelpers.js';
import { gatherExtraSelections, initFeatureSelectionHandlers, saveFeatureSelection, getTakenProficiencies } from './script.js';
import { setExtraSelections } from './extrasState.js';
import { extraCategoryAliases } from './extrasModal.js';
import { convertDetailsToAccordion, initializeAccordion } from './ui/accordion.js';
import { getSelectedData, setSelectedData } from './state.js';
import { ALL_LANGUAGES, ALL_SKILLS } from './data/proficiencies.js';
import { renderProficiencyReplacements } from './selectionUtils.js';

export async function updateSubclasses() {
  const classPath = document.getElementById('classSelect').value;
  const featuresDiv = document.getElementById('classFeatures');
  if (!classPath) {
    window.currentClassData = null;
    if (featuresDiv) {
      featuresDiv.textContent = '';
      featuresDiv.appendChild(createParagraph('Seleziona una classe per vedere i tratti.'));
    }
    return;
  }
  try {
    const response = await fetch(classPath);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    window.currentClassData = data;
    renderClassFeatures();
  } catch (error) {
    handleError(`Errore caricando le sottoclasse: ${error}`);
  }
}

export function getSubclassFilename(name) {
  let lower = name.toLowerCase();
  if (lower.startsWith('college of ')) {
    lower = 'college_of_' + lower.slice('college of '.length);
  } else if (lower.startsWith('circle of the ')) {
    lower = 'circle_of_the_' + lower.slice('circle of the '.length);
  } else if (lower.startsWith('circle of ')) {
    lower = 'circle_of_' + lower.slice('circle of '.length);
  } else {
    lower = lower
      .replace(/^(path|oath|way|school) of the /, '')
      .replace(/^(path|oath|way|school) of /, '')
      .replace(/^the /, '');
    if (lower.endsWith(' domain')) {
      lower = lower.slice(0, -' domain'.length);
    }
  }
  let file = lower.replace(/ /g, '_') + '.json';
  if (file === 'wild_magic.json' && window.currentClassData?.name === 'Barbarian') {
    file = 'barbarian_wild_magic.json';
  }
  return file;
}

export async function renderClassFeatures() {
  const featuresDiv = document.getElementById('classFeatures');
  const data = window.currentClassData;
  if (!featuresDiv) return;
  if (!data) {
    featuresDiv.textContent = '';
    featuresDiv.appendChild(createParagraph('Seleziona una classe per vedere i tratti.'));
    return;
  }
  const selectedData = getSelectedData();
  const charLevel = parseInt(document.getElementById('levelSelect')?.value) || 1;
  const subclassName = document.getElementById('subclassSelect')?.value || '';
  featuresDiv.textContent = '';
  featuresDiv.appendChild(createHeader(data.name, 3));
  if (data.description) featuresDiv.appendChild(createParagraph(data.description));

  const profTexts = [];
  if (data.weapon_proficiencies) {
    profTexts.push(`Weapon Training: ${data.weapon_proficiencies.join(', ')}`);
  }
  if (data.armor_proficiencies) {
    profTexts.push(`Armor Training: ${data.armor_proficiencies.join(', ')}`);
  }
  if (data.skill_proficiencies && data.skill_proficiencies.choose) {
    profTexts.push(`Skill Proficiencies: Choose ${data.skill_proficiencies.choose} from ${data.skill_proficiencies.options.join(', ')}`);
  }
  if (data.skill_proficiencies && Array.isArray(data.skill_proficiencies.fixed) && data.skill_proficiencies.fixed.length) {
    profTexts.push(`Skill Proficiencies: ${data.skill_proficiencies.fixed.join(', ')}`);
  }
  if (data.language_proficiencies && Array.isArray(data.language_proficiencies.fixed) && data.language_proficiencies.fixed.length) {
    profTexts.push(`Languages: ${data.language_proficiencies.fixed.join(', ')}`);
  }
  if (data.multiclassing && data.multiclassing.prerequisites) {
    const prereqs = Object.entries(data.multiclassing.prerequisites)
      .map(([ability, score]) => `${ability} ${score}`)
      .join(', ');
    profTexts.push(`Multiclassing Prerequisite: ${prereqs}`);
  }
  if (profTexts.length) {
    const details = document.createElement('details');
    details.className = 'feature-block';
    const summary = document.createElement('summary');
    summary.textContent = 'Proficiencies';
    details.appendChild(summary);
    profTexts.forEach(t => details.appendChild(createParagraph(t)));

    const renderReplacement = (type, fixed, allOptions, featureKey, label) => {
      const container = document.createElement('div');
      details.appendChild(container);
      const render = () => {
        container.innerHTML = '';
        renderProficiencyReplacements(
          type,
          fixed,
          allOptions,
          container,
          {
            featureKey,
            label,
            selectedData: getSelectedData(),
            getTakenOptions: { excludeClass: true },
            changeHandler: values => {
              const d = getSelectedData();
              d[featureKey] = values;
              setSelectedData(d);
              setTimeout(render, 0);
            },
            source: 'class',
          }
        );
      };
      render();
    };

    renderReplacement(
      'languages',
      data.language_proficiencies?.fixed,
      ALL_LANGUAGES,
      'Languages',
      'Linguaggi'
    );
    renderReplacement(
      'skills',
      data.skill_proficiencies?.fixed,
      ALL_SKILLS,
      'Skill Proficiency',
      'Abilità'
    );
    featuresDiv.appendChild(details);
  }

  if (data.subclasses && data.subclasses.length > 0) {
    const details = document.createElement('details');
    details.className = 'feature-block';
    details.id = 'subclassTrait';
    const summary = document.createElement('summary');
    summary.textContent = 'Sottoclasse';
    details.appendChild(summary);
    const select = document.createElement('select');
    select.id = 'subclassSelect';
    select.className = 'form-control';
    const def = document.createElement('option');
    def.value = '';
    def.textContent = 'Seleziona una sottoclasse';
    select.appendChild(def);
    data.subclasses.forEach(sc => {
      const option = document.createElement('option');
      option.value = sc.name;
      option.textContent = sc.name;
      if (subclassName === sc.name) option.selected = true;
      select.appendChild(option);
    });
    details.appendChild(select);
    featuresDiv.appendChild(details);
  }

  let subData = null;
  if (subclassName) {
    try {
      const file = getSubclassFilename(subclassName);
      const resp = await fetch(`data/subclasses/${file}`);
      if (!resp.ok) throw new Error('Network response was not ok');
      subData = await resp.json();
      if (subData.description) {
        featuresDiv.appendChild(createParagraph(subData.description));
      }
    } catch (err) {
      featuresDiv.appendChild(createParagraph('Dettagli della sottoclasse non disponibili.'));
    }
  } else {
    featuresDiv.appendChild(createParagraph('Seleziona una sottoclasse per vedere i tratti.'));
  }

  const mergedFeatures = {};
  if (data.features_by_level) {
    Object.entries(data.features_by_level).forEach(([lvl, feats]) => {
      mergedFeatures[lvl] = [...feats];
    });
  }
  if (subData?.features_by_level) {
    Object.entries(subData.features_by_level).forEach(([lvl, feats]) => {
      if (!mergedFeatures[lvl]) mergedFeatures[lvl] = [];
      mergedFeatures[lvl].push(...feats);
    });
  }
  const levels = Object.keys(mergedFeatures).sort((a, b) => a - b);
  levels.forEach(lvl => {
    if (parseInt(lvl) <= charLevel) {
      featuresDiv.appendChild(createHeader(`Livello ${lvl}`, 4));
      mergedFeatures[lvl].forEach((f, idx) => {
        if (typeof f === 'string') {
          const details = document.createElement('details');
          details.className = 'feature-block';
          const summary = document.createElement('summary');
          summary.textContent = f;
          details.appendChild(summary);
          featuresDiv.appendChild(details);
        } else {
          const details = document.createElement('details');
          details.className = 'feature-block';
          details.id = `class-feature-${lvl}-${idx}`;
          const summary = document.createElement('summary');
          summary.textContent = f.name;
          details.appendChild(summary);
          if (f.description) {
            const desc = document.createElement('div');
            desc.className = 'feature-desc';
            desc.textContent = f.description;
            details.appendChild(desc);
          }
          const choices = f.choices || f.variant_feature_choices;
          if (choices) {
            choices.forEach((choice, cIdx) => {
              const options = choice.options || choice.selection || [];
              const saved = selectedData[f.name]?.[cIdx] || '';
              const label = document.createElement('label');
              label.textContent = (choice.name || 'Scegli') + ': ';
              const select = document.createElement('select');
              select.dataset.feature = f.name;
              select.dataset.index = cIdx;
              const optDef = document.createElement('option');
              optDef.value = '';
              optDef.textContent = 'Seleziona...';
              select.appendChild(optDef);
              options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                if (saved === opt) option.selected = true;
                select.appendChild(option);
              });
              label.appendChild(select);
              details.appendChild(label);
            });
          }
          featuresDiv.appendChild(details);
        }
      });
    }
  });

  const allChoices = [...(data.choices || []), ...(subData?.choices || [])];
  if (data.skill_proficiencies && !allChoices.some(c => c.name === 'Skill Proficiency')) {
    allChoices.push({
      level: 1,
      name: 'Skill Proficiency',
      description: `Choose ${data.skill_proficiencies.choose} from the class skill list`,
      count: data.skill_proficiencies.choose,
      selection: data.skill_proficiencies.options
    });
  }
  const extraSelections = gatherExtraSelections({ choices: allChoices }, 'class', charLevel);
  setExtraSelections(extraSelections);
  const detailMatchers = {
    Languages: /Proficiencies/i,
    'Skill Proficiency': /Proficiencies/i
  };
  extraSelections.forEach(choice => {
    const featureKey = extraCategoryAliases[choice.name] || choice.name;
    const allDetails = Array.from(featuresDiv.querySelectorAll('details'));
    let targetDetail = allDetails.find(det => {
      const txt = det.querySelector('summary')?.textContent || '';
      return txt === choice.name || txt === featureKey;
    });
    if (!targetDetail) {
      const matcher = detailMatchers[choice.name] || detailMatchers[featureKey];
      if (matcher) {
        targetDetail = allDetails.find(det => matcher.test(det.querySelector('summary')?.textContent || ''));
      }
    }
    if (!targetDetail) {
      targetDetail = document.createElement('details');
      targetDetail.className = 'feature-block';
      const summary = document.createElement('summary');
      summary.textContent = choice.name;
      targetDetail.appendChild(summary);
      featuresDiv.appendChild(targetDetail);
    }
    if (choice.description && !targetDetail.querySelector('.feature-desc')) {
      const desc = document.createElement('div');
      desc.className = 'feature-desc';
      desc.textContent = choice.description;
      targetDetail.appendChild(desc);
    }
    const options = choice.options || choice.selection || [];
    const selects = [];
    for (let i = 0; i < (choice.count || 1); i++) {
      const saved = choice.selected?.[i] || selectedData[featureKey]?.[i] || '';
      const label = document.createElement('label');
      label.textContent = `${choice.name}${choice.count > 1 ? ' ' + (i + 1) : ''}: `;
      const select = document.createElement('select');
      select.dataset.feature = featureKey;
      select.dataset.index = i;
      select.dataset.options = JSON.stringify(options);
      const optDef = document.createElement('option');
      optDef.value = '';
      optDef.textContent = 'Seleziona...';
      select.appendChild(optDef);
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });
      if (saved) select.value = saved;
      label.appendChild(select);
      targetDetail.appendChild(label);
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
  });

  convertDetailsToAccordion(featuresDiv);
  featuresDiv.classList.add('accordion');
  initFeatureSelectionHandlers(featuresDiv, saveFeatureSelection);
  initializeAccordion(featuresDiv);
  const subSel = document.getElementById('subclassSelect');
  if (subSel) {
    subSel.addEventListener('change', renderClassFeatures);
  }
}
