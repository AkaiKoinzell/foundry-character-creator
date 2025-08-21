import { handleError, renderTables } from './common.js';
import { convertRaceData } from './raceData.js';
import { handleSpellcasting } from './spellcasting.js';
import { createHeader, createParagraph } from './domHelpers.js';
import { handleVariantFeatureChoices, handleVariantExtraSelections } from './variantFeatures.js';
import { handleExtraAncestry } from './extrasSelections.js';
import { setExtraSelections } from './extrasState.js';
import { extraCategoryAliases } from './extrasModal.js';
import { getSelectedData, setSelectedData } from './state.js';
import {
  gatherExtraSelections,
  checkTraitCompletion,
  initFeatureSelectionHandlers,
  saveFeatureSelection,
  refreshSelectedData,
  resetRacialBonuses,
  getTakenProficiencies
} from './script.js';
import { convertDetailsToAccordion, initializeAccordion } from './ui/accordion.js';
import { ALL_LANGUAGES, ALL_TOOLS, ALL_SKILLS } from './data/proficiencies.js';
import { renderProficiencyReplacements } from './selectionUtils.js';

export async function displayRaceTraits() {
  console.log('🛠 Esecuzione displayRaceTraits()...');
  const selectedData = getSelectedData();
  const racePath = document.getElementById('raceSelect').value;
  const raceTraitsDiv = document.getElementById('raceTraits');
  const racialBonusDiv = document.getElementById('racialBonusSelection');

  if (!racePath) {
    console.warn('⚠️ displayRaceTraits(): Nessuna razza selezionata.');
    raceTraitsDiv.textContent = '';
    raceTraitsDiv.appendChild(createParagraph('Seleziona una razza per vedere i tratti.'));
    racialBonusDiv.style.display = 'none';
    resetRacialBonuses();
    return;
  }

  console.log(`📜 Caricamento tratti per ${racePath}...`);
  try {
    const response = await fetch(racePath);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    console.log('📜 Dati razza caricati:', data);
    const raceData = convertRaceData(data);
    window.currentRaceData = raceData;
    raceTraitsDiv.textContent = '';
    raceTraitsDiv.appendChild(createHeader(`Tratti di ${raceData.name}`, 3));

    // Speed
    let speedText = 'Velocità: Non disponibile';
    if (raceData.speed) {
      if (typeof raceData.speed === 'object') {
        const parts = Object.entries(raceData.speed).map(([t, v]) => `${t}: ${v} ft`);
        speedText = `Velocità: ${parts.join(', ')}`;
      } else {
        speedText = `Velocità: ${raceData.speed} ft`;
      }
    }
    raceTraitsDiv.appendChild(createParagraph(speedText));

    // Darkvision
    if (raceData.senses && raceData.senses.darkvision) {
      raceTraitsDiv.appendChild(createParagraph(`Visione: ${raceData.senses.darkvision} ft`));
    }

    // Trait details
    let cantripDetail = null;
    if (raceData.traits && raceData.traits.length > 0) {
      raceTraitsDiv.appendChild(createHeader('Tratti:', 4));
      raceData.traits.forEach(trait => {
        const traitId = `trait-${trait.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        const featureKey = trait.name;
        const details = document.createElement('details');
        details.className = 'race-trait feature-block';
        details.id = traitId;
        const summary = document.createElement('summary');
        summary.textContent = trait.name;
        details.appendChild(summary);
        const desc = document.createElement('div');
        desc.className = 'feature-desc';
        desc.textContent = trait.description || '';
        details.appendChild(desc);
        const choices = trait.choices || trait.variant_feature_choices;
        if (choices) {
          choices.forEach((choice, cIdx) => {
            const options = choice.options || choice.selection || [];
            const saved = selectedData[featureKey]?.[cIdx] || '';
            const label = document.createElement('label');
            label.textContent = (choice.name || 'Scegli') + ': ';
            const select = document.createElement('select');
            select.dataset.feature = featureKey;
            select.dataset.index = cIdx;
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = 'Seleziona...';
            select.appendChild(defaultOpt);
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
        if (trait.name.toLowerCase().includes('cantrip')) {
          cantripDetail = details;
        }
        raceTraitsDiv.appendChild(details);
      });
    }

    // Extra selections (languages, skills, tools) merged into existing traits
    const extraSelections = gatherExtraSelections(raceData, 'race');
    setExtraSelections(extraSelections);
    const detailMatchers = {
      Languages: /language/i,
      'Skill Proficiency': /skill/i,
      'Tool Proficiency': /tool/i
    };
    extraSelections.forEach((choice, idx) => {
      const featureKey = extraCategoryAliases[choice.name] || choice.name;
      let targetDetail = null;
      const matcher = detailMatchers[choice.name];
      if (matcher) {
        targetDetail = Array.from(raceTraitsDiv.querySelectorAll('details'))
          .find(det => matcher.test(det.querySelector('summary')?.textContent || ''));
      }
      if (!targetDetail) {
        targetDetail = document.createElement('details');
        targetDetail.className = 'race-trait feature-block';
        targetDetail.id = `race-extra-${idx}`;
        const summary = document.createElement('summary');
        summary.textContent = choice.name;
        targetDetail.appendChild(summary);
        raceTraitsDiv.appendChild(targetDetail);
      }
      if (choice.description && !targetDetail.querySelector('.feature-desc')) {
        const desc = document.createElement('div');
        desc.className = 'feature-desc';
        desc.textContent = choice.description;
        targetDetail.appendChild(desc);
      }
      const options = choice.selection || [];
      const count = choice.count || 1;
      for (let i = 0; i < count; i++) {
        const saved = selectedData[featureKey]?.[i] || '';
        const label = document.createElement('label');
        label.textContent = `${choice.name}${count > 1 ? ' ' + (i + 1) : ''}: `;
        const select = document.createElement('select');
        select.dataset.feature = featureKey;
        select.dataset.index = i;
        const def = document.createElement('option');
        def.value = '';
        def.textContent = 'Seleziona...';
        select.appendChild(def);
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          if (saved === opt) option.selected = true;
          select.appendChild(option);
        });
        label.appendChild(select);
        targetDetail.appendChild(label);
      }
    });

    const labels = { Languages: 'Linguaggi', 'Skill Proficiency': 'Abilità', 'Tool Proficiency': 'Strumenti' };
    const addSubs = (type, fixedList, allOptions, featureKey, matcher) => {
      if (!fixedList || fixedList.length === 0) return;
      let detail = Array.from(raceTraitsDiv.querySelectorAll('details'))
        .find(det => matcher.test(det.querySelector('summary')?.textContent || ''));
      if (!detail) {
        detail = document.createElement('details');
        detail.className = 'race-trait feature-block';
        const summary = document.createElement('summary');
        summary.textContent = featureKey;
        detail.appendChild(summary);
        raceTraitsDiv.appendChild(detail);
      }
      const container = document.createElement('div');
      detail.appendChild(container);
      const render = () => {
        container.innerHTML = '';
        renderProficiencyReplacements(
          type,
          fixedList,
          allOptions,
          container,
          {
            featureKey,
            label: labels[featureKey],
            selectedData: getSelectedData(),
            getTakenOptions: { excludeRace: true },
            changeHandler: () => setTimeout(render, 0),
            source: 'race',
          }
        );
      };
      render();
    };

    addSubs('languages', raceData.languages?.fixed, ALL_LANGUAGES, 'Languages', /language/i);
    addSubs('skills', raceData.skill_choices?.fixed, ALL_SKILLS, 'Skill Proficiency', /skill/i);
    addSubs('tools', raceData.tool_choices?.fixed, ALL_TOOLS, 'Tool Proficiency', /tool/i);

    // Variant feature choices
    if (raceData.variant_feature_choices) {
      const details = document.createElement('details');
      details.className = 'race-trait feature-block needs-selection incomplete';
      details.id = 'variantFeatureTrait';
      const summary = document.createElement('summary');
      summary.textContent = 'Variant Feature';
      details.appendChild(summary);
      const selContainer = document.createElement('div');
      selContainer.id = 'variantFeatureSelectionContainer';
      details.appendChild(selContainer);
      const extraContainer = document.createElement('div');
      extraContainer.id = 'variantExtraContainer';
      details.appendChild(extraContainer);
      raceTraitsDiv.appendChild(details);
    }

    // Ancestry placeholder
    const ancestryDetails = document.createElement('details');
    ancestryDetails.className = 'race-trait feature-block hidden';
    ancestryDetails.id = 'ancestryTrait';
    const ancestrySummary = document.createElement('summary');
    ancestrySummary.textContent = 'Ancestry';
    ancestryDetails.appendChild(ancestrySummary);
    const ancestryContainer = document.createElement('div');
    ancestryContainer.id = 'ancestrySelectionContainer';
    ancestryDetails.appendChild(ancestryContainer);
    raceTraitsDiv.appendChild(ancestryDetails);

    // Tables (rawEntries)
    const tablesHtml = renderTables(raceData.rawEntries);
    if (tablesHtml) {
      const wrapper = document.createElement('div');
      wrapper.appendChild(document.createRange().createContextualFragment(tablesHtml));
      raceTraitsDiv.appendChild(wrapper);
    }

    await handleSpellcasting(raceData, cantripDetail);
    handleVariantFeatureChoices(raceData);
    handleExtraAncestry(raceData, 'ancestrySelectionContainer');

    convertDetailsToAccordion(raceTraitsDiv);
    raceTraitsDiv.classList.add('accordion');
    raceTraitsDiv.style.display = 'block';
    initFeatureSelectionHandlers(raceTraitsDiv, saveFeatureSelection);
    initializeAccordion(raceTraitsDiv);

    const ancestryDetail = document.getElementById('ancestryTrait');
    if (ancestryDetail) {
      const ancContainer = document.getElementById('ancestrySelectionContainer');
      if (ancContainer && ancContainer.innerHTML.trim() !== '') {
        ancestryDetail.classList.remove('hidden');
        ancestryDetail.classList.add('needs-selection');
      } else {
        ancestryDetail.remove();
      }
    }

    const variantSelect = document.getElementById('variantFeatureChoice');
    if (variantSelect) {
      variantSelect.addEventListener('change', () => {
        const data = getSelectedData();
        data['Variant Feature'] = [variantSelect.value];
        handleVariantExtraSelections();
        checkTraitCompletion('variantFeatureTrait');
      });
      checkTraitCompletion('variantFeatureTrait');
    }

    const ancestrySelect = document.getElementById('ancestrySelection');
    if (ancestrySelect) {
      ancestrySelect.addEventListener('change', () => {
        const data = getSelectedData();
        data['Ancestry'] = [ancestrySelect.value];
        checkTraitCompletion('ancestryTrait');
      });
      checkTraitCompletion('ancestryTrait');
    }

    resetRacialBonuses();
  } catch (error) {
    handleError(`Errore caricando i tratti della razza: ${error}`);
  }
}

// Race selection change listener
const raceSelectEl = document.getElementById('raceSelect');
if (raceSelectEl) {
  raceSelectEl.addEventListener('change', () => {
    console.log('🔄 Razza cambiata, reset delle selezioni extra...');
    setSelectedData({});
    refreshSelectedData();
    document.getElementById('languageSelection').innerHTML = '';
    document.getElementById('skillSelectionContainer').innerHTML = '';
    document.getElementById('toolSelectionContainer').innerHTML = '';
    displayRaceTraits();
    document.getElementById('confirmRaceSelection').style.display = 'inline-block';
  });
}
