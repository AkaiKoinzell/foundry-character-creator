import { loadLanguages, handleError, renderTables } from './common.js';
import { loadSpells, filterSpells, handleSpellcasting } from './spellcasting.js';
import { convertRaceData, ALL_SKILLS } from './raceData.js';
import { getSelectedData, setSelectedData, saveSelectedData } from './state.js';
import { createHeader, createParagraph, createList } from './domHelpers.js';
import { ARTISAN_TOOLS, MUSICAL_INSTRUMENTS, ALL_TOOLS } from './proficiencies.js';
import { updateVariantSkillOptions, handleVariantExtraSelections, handleVariantFeatureChoices } from './variantFeatures.js';
import { handleExtraLanguages, handleExtraSkills, handleExtraTools, handleExtraAncestry, gatherRaceTraitSelections } from './extrasSelections.js';
import { openExtrasModal, updateExtraSelectionsView, showExtraSelection, extraCategoryAliases, extraCategoryDescriptions } from './extrasModal.js';

export let availableLanguages = [];
export function setAvailableLanguages(langs) {
  availableLanguages = langs;
}

let selectedData = getSelectedData();

export function checkTraitCompletion(detailId) {
  const detail = document.getElementById(detailId);
  if (!detail) return;
  const selects = detail.querySelectorAll("select");
  const incomplete = [...selects].some(sel => !sel.value);
  detail.classList.toggle("incomplete", incomplete);
}

/**
 * Returns a merged list of proficiencies already taken via
 * previous selections or background grants.
 * @param {string} type - One of 'skills', 'tools', or 'languages'.
 * @returns {string[]} Array of taken proficiencies of the given type.
 */
function getTakenProficiencies(type) {
  const selectedMap = {
    skills: "Skill Proficiency",
    tools: "Tool Proficiency",
    languages: "Languages",
  };

  const taken = new Set();
  const originals = [];

  (selectedData[selectedMap[type]] || [])
    .filter(v => v)
    .forEach(v => {
      const lower = v.toLowerCase();
      if (!taken.has(lower)) {
        taken.add(lower);
        originals.push(v);
      }
    });

  if (window.backgroundData) {
    const bgMap = { skills: "skills", tools: "tools", languages: "languages" };
    (window.backgroundData[bgMap[type]] || []).forEach(v => {
      const lower = v.toLowerCase();
      if (!taken.has(lower)) {
        taken.add(lower);
        originals.push(v);
      }
    });
  }

  // Include fixed proficiencies granted by the currently selected class
  if (window.currentClassData) {
    if (type === 'tools') {
      const tp = window.currentClassData.tool_proficiencies;
      if (Array.isArray(tp)) {
        tp.forEach(t => {
          const lower = t.toLowerCase();
          if (!lower.includes('of your choice') && !lower.includes(' or ')) {
            if (!taken.has(lower)) {
              taken.add(lower);
              originals.push(t);
            }
          }
        });
      } else if (tp && Array.isArray(tp.fixed)) {
        tp.fixed.forEach(t => {
          const lower = t.toLowerCase();
          if (!taken.has(lower)) {
            taken.add(lower);
            originals.push(t);
          }
        });
      }
    } else if (type === 'skills') {
      const sp = window.currentClassData.skill_proficiencies;
      if (sp && Array.isArray(sp.fixed)) {
        sp.fixed.forEach(s => {
          const lower = s.toLowerCase();
          if (!taken.has(lower)) {
            taken.add(lower);
            originals.push(s);
          }
        });
      }
    } else if (type === 'languages') {
      const lp = window.currentClassData.language_proficiencies;
      if (lp && Array.isArray(lp.fixed)) {
        lp.fixed.forEach(l => {
          const lower = l.toLowerCase();
          if (!taken.has(lower)) {
            taken.add(lower);
            originals.push(l);
          }
        });
      }
    }
  }

  return originals;
}

/**
 * Builds a unified list of extra selections for races or classes.
 * @param {Object} data - Source data containing choice information.
 * @param {string} context - "race" or "class" to determine parsing logic.
 * @param {number} [level=1] - Character level for filtering class choices.
 * @returns {Array} List of selection objects.
 */
function gatherExtraSelections(data, context, level = 1) {
  const selections = [];

  const takenLangs = new Set(getTakenProficiencies('languages').map(v => v.toLowerCase()));
  const takenSkills = new Set(getTakenProficiencies('skills').map(v => v.toLowerCase()));
  const takenTools = new Set(getTakenProficiencies('tools').map(v => v.toLowerCase()));

  if (context === "race") {
    if (data.languages && (data.languages.fixed.length > 0 || data.languages.choice > 0)) {
      const fixedLangs = new Set(data.languages.fixed.map(l => l.toLowerCase()));
      let availableLangs = availableLanguages
        .filter(lang => !fixedLangs.has(lang.toLowerCase()))
        .filter(lang => !takenLangs.has(lang.toLowerCase()));
      let note = '';
      if (availableLangs.length === 0) {
        availableLangs = availableLanguages.filter(lang => !takenLangs.has(lang.toLowerCase()));
        note = ' (tutte le lingue disponibili)';
      }
      const fixedDesc = data.languages.fixed.length
        ? `<strong>Lingue Concesse:</strong> ${data.languages.fixed.join(', ')}`
        : '';
      selections.push({
        name: "Languages",
        description: fixedDesc + note,
        selection: availableLangs,
        count: data.languages.choice
      });
    }
    if (data.skill_choices) {
      let filteredSkills = data.skill_choices.options.filter(opt => !takenSkills.has(opt.toLowerCase()));
      let note = '';
      if (filteredSkills.length === 0) {
        filteredSkills = ALL_SKILLS.filter(opt => !takenSkills.has(opt.toLowerCase()));
        note = ' (tutte le abilità disponibili)';
      }
      if (filteredSkills.length > 0) {
        selections.push({
          name: "Skill Proficiency",
          description: "Choose skill proficiencies." + note,
          selection: filteredSkills,
          count: data.skill_choices.number
        });
      }
    }
    if (data.tool_choices) {
      let filteredTools = data.tool_choices.options.filter(opt => !takenTools.has(opt.toLowerCase()));
      let note = '';
      if (filteredTools.length === 0) {
        filteredTools = ALL_TOOLS.filter(opt => !takenTools.has(opt.toLowerCase()));
        note = ' (tutti gli strumenti disponibili)';
      }
      if (filteredTools.length > 0) {
        selections.push({
          name: "Tool Proficiency",
          description: "Choose a tool proficiency." + note,
          selection: filteredTools,
          count: 1
        });
      }
    }
  } else if (context === "class") {
    const allChoices = data.choices || [];
    allChoices.forEach(choice => {
      if (!choice.level || parseInt(choice.level) <= level) {
        const key = extraCategoryAliases[choice.name] || choice.name;
        const selected = (selectedData[key] || []).filter(v => v);
        const selectedLower = selected.map(v => v.toLowerCase());
        let opts = choice.selection || choice.options || [];
        let note = '';
        if (key === "Languages") {
          opts = opts.filter(o => !takenLangs.has(o.toLowerCase()) || selectedLower.includes(o.toLowerCase()));
          if (opts.length === 0) {
            opts = availableLanguages.filter(o => !takenLangs.has(o.toLowerCase()) || selectedLower.includes(o.toLowerCase()));
            note = ' (tutte le lingue disponibili)';
          }
        } else if (key === "Skill Proficiency") {
          opts = opts.filter(o => !takenSkills.has(o.toLowerCase()) || selectedLower.includes(o.toLowerCase()));
          if (opts.length === 0) {
            opts = ALL_SKILLS.filter(o => !takenSkills.has(o.toLowerCase()) || selectedLower.includes(o.toLowerCase()));
            note = ' (tutte le abilità disponibili)';
          }
        } else if (key === "Tool Proficiency") {
          opts = opts.filter(o => !takenTools.has(o.toLowerCase()) || selectedLower.includes(o.toLowerCase()));
          if (opts.length === 0) {
            opts = ALL_TOOLS.filter(o => !takenTools.has(o.toLowerCase()) || selectedLower.includes(o.toLowerCase()));
            note = ' (tutti gli strumenti disponibili)';
          }
        }
        const desc = note ? ((choice.description || '') + note) : choice.description;
        selections.push({ ...choice, selection: opts, description: desc, selected });
      }
    });
  }
  return selections;
}

/**
 * Generic handler to track selections inside feature <select> elements
 * and visually highlight incomplete features.
 * @param {HTMLElement} container - Parent element containing feature details.
 * @param {Function} [saveCallback] - Optional callback to persist selections.
 */
function initFeatureSelectionHandlers(container, saveCallback) {
  if (!container) return;
  const blocks = container.querySelectorAll('.feature-block');
  blocks.forEach(block => {
    const selects = block.querySelectorAll('select');
    if (selects.length === 0) return;
    block.classList.add('user-choice');
    const mark = () => {
      const unfilled = Array.from(selects).some(s => !s.value);
      block.classList.toggle('needs-selection', unfilled);
    };
    mark();
    selects.forEach(sel => {
      sel.addEventListener('change', () => {
        if (saveCallback) saveCallback(sel);
        mark();
      });
    });
  });
}

function saveFeatureSelection(select) {
  const feature = select.dataset.feature;
  const index = select.dataset.index || 0;
  if (!feature) return;
  if (!selectedData[feature]) selectedData[feature] = [];
  selectedData[feature][index] = select.value || undefined;
  saveSelectedData();
}

function convertDetailsToAccordion(container) {
  if (!container) return;
  container.querySelectorAll('details').forEach(det => {
    const summary = det.querySelector('summary');
    const contentNodes = Array.from(det.childNodes).filter(n => n !== summary);
    const item = document.createElement('div');
    const classes = ['accordion-item', 'feature-block', ...det.classList];
    item.className = classes.join(' ');
    if (det.id) item.id = det.id;

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'accordion-header';
    header.innerHTML = summary ? summary.innerHTML : '';
    item.appendChild(header);

    const content = document.createElement('div');
    content.className = 'accordion-content';
    contentNodes.forEach(n => content.appendChild(n));
    item.appendChild(content);

    det.replaceWith(item);
  });
}

function initializeAccordion(root) {
  if (!root) return;

  root.querySelectorAll('.accordion-header').forEach((header, index) => {
    const content = header.nextElementSibling;

    // Apply ARIA roles and relationships
    header.setAttribute('role', 'button');
    if (!header.hasAttribute('tabindex')) header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'false');

    if (content) {
      const headerId = header.id || `accordion-header-${index}`;
      header.id = headerId;
      content.setAttribute('role', 'region');
      content.setAttribute('aria-labelledby', headerId);
    }

    const toggleAccordion = () => {
      const expanded = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', String(!expanded));
      header.classList.toggle('active', !expanded);
      if (content) {
        content.classList.toggle('show', !expanded);
      }
      header.focus();
    };

    header.addEventListener('click', toggleAccordion);
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleAccordion();
      }
    });
  });
}

/**
 * Render extra selections inside an accordion rather than a modal.
 */

updateExtraSelectionsView();

document.getElementById("raceSelect").addEventListener("change", () => {
  console.log("🔄 Razza cambiata, reset delle selezioni extra...");
  setSelectedData({}); // Reset delle selezioni extra
  selectedData = getSelectedData();
  document.getElementById("languageSelection").innerHTML = "";
  document.getElementById("skillSelectionContainer").innerHTML = "";
  document.getElementById("toolSelectionContainer").innerHTML = "";

  displayRaceTraits(); // Ricarica i tratti della nuova razza
  document.getElementById("confirmRaceSelection").style.display = "inline-block";
});


// ==================== DISPLAY DEI TRATTI DELLA RAZZA ====================
async function displayRaceTraits() {
  console.log("🛠 Esecuzione displayRaceTraits()...");
  const racePath = document.getElementById("raceSelect").value;
  const raceTraitsDiv = document.getElementById("raceTraits");
  const racialBonusDiv = document.getElementById("racialBonusSelection");

  if (!racePath) {
    console.warn("⚠️ displayRaceTraits(): Nessuna razza selezionata.");
    raceTraitsDiv.textContent = '';
    raceTraitsDiv.appendChild(createParagraph('Seleziona una razza per vedere i tratti.'));
    racialBonusDiv.style.display = "none";
    resetRacialBonuses();
    return;
  }

  console.log(`📜 Caricamento tratti per ${racePath}...`);
  try {
    const response = await fetch(racePath);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    console.log("📜 Dati razza caricati:", data);
    const raceData = convertRaceData(data);
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
      const detailMatchers = {
        'Languages': /language/i,
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
      ancestryDetails.className = 'race-trait feature-block needs-selection incomplete hidden';
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
        }
      }

      const variantSelect = document.getElementById('variantFeatureChoice');
      if (variantSelect) {
        variantSelect.addEventListener('change', () => {
          selectedData['Variant Feature'] = [variantSelect.value];
          handleVariantExtraSelections();
          checkTraitCompletion('variantFeatureTrait');
        });
        checkTraitCompletion('variantFeatureTrait');
      }

      const ancestrySelect = document.getElementById('ancestrySelection');
      if (ancestrySelect) {
        ancestrySelect.addEventListener('change', () => {
          selectedData['Ancestry'] = [ancestrySelect.value];
          checkTraitCompletion('ancestryTrait');
        });
        checkTraitCompletion('ancestryTrait');
      }

      resetRacialBonuses();
      window.currentRaceData = raceData;
  } catch (error) {
    handleError(`Errore caricando i tratti della razza: ${error}`);
  }
}

// ==================== UPDATE SUBCLASSES (STEP 5) ====================
async function updateSubclasses() {
  const classPath = document.getElementById("classSelect").value;
  const featuresDiv = document.getElementById("classFeatures");
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

function getSubclassFilename(name) {
  let lower = name.toLowerCase();
  if (lower.startsWith("college of ")) {
    lower = "college_of_" + lower.slice("college of ".length);
  } else if (lower.startsWith("circle of the ")) {
    lower = "circle_of_the_" + lower.slice("circle of the ".length);
  } else if (lower.startsWith("circle of ")) {
    lower = "circle_of_" + lower.slice("circle of ".length);
  } else {
    lower = lower
      .replace(/^(path|oath|way|school) of the /, "")
      .replace(/^(path|oath|way|school) of /, "")
      .replace(/^the /, "");
    if (lower.endsWith(" domain")) {
      lower = lower.slice(0, -" domain".length);
    }
  }
  let file = lower.replace(/ /g, "_") + ".json";
  if (file === "wild_magic.json" && window.currentClassData?.name === "Barbarian") {
    file = "barbarian_wild_magic.json";
  }
  return file;
}

async function renderClassFeatures() {
  const featuresDiv = document.getElementById('classFeatures');
  const data = window.currentClassData;
  if (!featuresDiv) return;
  if (!data) {
    featuresDiv.textContent = '';
    featuresDiv.appendChild(createParagraph('Seleziona una classe per vedere i tratti.'));
    return;
  }
  const charLevel = parseInt(document.getElementById('levelSelect')?.value) || 1;
  const subclassName = document.getElementById('subclassSelect')?.value || '';
  featuresDiv.textContent = '';
  featuresDiv.appendChild(createHeader(data.name, 3));
  if (data.description) featuresDiv.appendChild(createParagraph(data.description));

  // Hit points section
  if (data.hit_die || data.hp_at_1st_level || data.hp_at_higher_levels) {
    const details = document.createElement('details');
    details.className = 'feature-block';
    const summary = document.createElement('summary');
    summary.textContent = 'Hit Points';
    details.appendChild(summary);
    if (data.hit_die) details.appendChild(createParagraph(`Hit Die: ${data.hit_die}`));
    if (data.hp_at_1st_level) details.appendChild(createParagraph(`Hit Points at 1st Level: ${data.hp_at_1st_level}`));
    if (data.hp_at_higher_levels) details.appendChild(createParagraph(`Hit Points at Higher Levels: ${data.hp_at_higher_levels}`));
    featuresDiv.appendChild(details);
  }

  // Proficiencies section
  const profTexts = [];
  let toolChoice = null;
  if (data.saving_throws) profTexts.push(`Saving Throw Proficiencies: ${data.saving_throws.join(', ')}`);
  if (data.weapon_proficiencies) profTexts.push(`Weapon Proficiencies: ${data.weapon_proficiencies.join(', ')}`);
  if (data.tool_proficiencies) {
    if (Array.isArray(data.tool_proficiencies)) {
      const fixed = data.tool_proficiencies.filter(tp => {
        const lower = tp.toLowerCase();
        return !lower.includes('of your choice') && !lower.includes(' or ');
      });
      if (fixed.length) profTexts.push(`Tool Proficiencies: ${fixed.join(', ')}`);
      data.tool_proficiencies.forEach(tp => {
        const lower = tp.toLowerCase();
        const wordMap = { one: 1, two: 2, three: 3 };
        let count = 1;
        for (const word in wordMap) {
          if (lower.includes(word)) { count = wordMap[word]; break; }
        }
        if (lower.includes("artisan's tools") && lower.includes('musical instrument')) {
          toolChoice = { choose: count, options: [...ARTISAN_TOOLS, ...MUSICAL_INSTRUMENTS] };
        } else if (lower.includes('musical instrument')) {
          toolChoice = { choose: count, options: MUSICAL_INSTRUMENTS };
        } else if (lower.includes("artisan's tools")) {
          toolChoice = { choose: count, options: ARTISAN_TOOLS };
        }
      });
      if (toolChoice) {
        profTexts.push(`Tool Proficiencies: Choose ${toolChoice.choose} from ${toolChoice.options.join(', ')}`);
      }
    } else if (data.tool_proficiencies.options) {
      const fixed = data.tool_proficiencies.fixed || [];
      if (fixed.length) profTexts.push(`Tool Proficiencies: ${fixed.join(', ')}`);
      if (data.tool_proficiencies.choose && data.tool_proficiencies.options.length) {
        toolChoice = {
          choose: data.tool_proficiencies.choose,
          options: data.tool_proficiencies.options
        };
        profTexts.push(`Tool Proficiencies: Choose ${toolChoice.choose} from ${toolChoice.options.join(', ')}`);
      }
    }
  }
  if (data.armor_proficiencies) {
    profTexts.push(`Armor Training: ${data.armor_proficiencies.join(', ')}`);
  }
  if (data.skill_proficiencies && data.skill_proficiencies.choose) {
    profTexts.push(`Skill Proficiencies: Choose ${data.skill_proficiencies.choose} from ${data.skill_proficiencies.options.join(', ')}`);
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
    featuresDiv.appendChild(details);
  }

  // Subclasses select
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

  // Fetch subclass data
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

  // Merge class and subclass features by level
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
  if (toolChoice && !allChoices.some(c => c.name === 'Tool Proficiency')) {
    allChoices.push({
      level: 1,
      name: 'Tool Proficiency',
      description: `Choose ${toolChoice.choose} from the class options`,
      count: toolChoice.choose,
      selection: toolChoice.options
    });
  }
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
  const detailMatchers = {
    'Languages': /Proficiencies/i,
    'Skill Proficiency': /Proficiencies/i,
    'Tool Proficiency': /Proficiencies/i
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

function renderFinalRecap() {
  const recapDiv = document.getElementById("finalRecap");
  if (!recapDiv) return;

  selectedData = getSelectedData();
  const userName = document.getElementById("userName")?.value || "";
  const characterName = document.getElementById("characterName")?.value || "";
  const className = document.getElementById("classSelect").selectedOptions[0]?.text || "";
  const subclassName = document.getElementById("subclassSelect").selectedOptions[0]?.text || "";
  const raceName = document.getElementById("raceSelect").selectedOptions[0]?.text || "";
  const level = document.getElementById("levelSelect")?.value || "";
  const origin = document.getElementById("origin")?.value || "";
  const age = document.getElementById("age")?.value || "";
  const backgroundLanguages = window.backgroundData ? window.backgroundData.languages || [] : [];
  const backgroundTools = window.backgroundData ? window.backgroundData.tools || [] : [];
  const extraLangs = selectedData["Languages"] || [];
  const extraTools = selectedData["Tool Proficiency"] || [];
  const languages = [...new Set([...backgroundLanguages, ...extraLangs])];
  const tools = [...new Set([...backgroundTools, ...extraTools])];
  const equipment = selectedData.equipment || {};
  const equipList = [
    ...(equipment.standard || []),
    ...(equipment.class || []),
    ...(equipment.upgrades || [])
  ];

  let html = "";
  html += `<p><strong>Nome Utente:</strong> ${userName}</p>`;
  html += `<p><strong>Nome PG:</strong> ${characterName}</p>`;
  html += `<p><strong>Classe:</strong> ${className}${subclassName ? ` (${subclassName})` : ""}</p>`;
  html += `<p><strong>Razza:</strong> ${raceName}</p>`;
  html += `<p><strong>Livello:</strong> ${level}</p>`;
  html += `<p><strong>Provenienza:</strong> ${origin}</p>`;
  html += `<p><strong>Età:</strong> ${age}</p>`;
  html += `<p><strong>Lingue:</strong> ${languages.join(", ")}</p>`;
  html += `<p><strong>Strumenti:</strong> ${tools.join(", ")}</p>`;
  html += `<p><strong>Equip:</strong> ${equipList.join(", ")}</p>`;
  recapDiv.innerHTML = html;
}

// ==================== GENERAZIONE DEL JSON FINALE (STEP 8) ====================
function generateFinalJson() {
  let chromaticAncestry = null;
  const ancestrySelect = document.getElementById("ancestrySelect");
  if (ancestrySelect && ancestrySelect.value) {
    try {
      chromaticAncestry = JSON.parse(ancestrySelect.value);
    } catch (e) {
      console.error("Errore nel parsing della Chromatic Ancestry scelta", e);
    }
  }
  const toolProficiency = document.getElementById("toolChoice0") ? document.getElementById("toolChoice0").value : null;
  const variantFeature = document.getElementById("variantFeatureChoice") ? document.getElementById("variantFeatureChoice").value : null;
  const variantExtra = {};
  const variantSkillElems = document.querySelectorAll(".variantSkillChoice");
  if (variantSkillElems.length > 0) {
    variantExtra.skills = [];
    variantSkillElems.forEach(elem => {
      if (elem.value) variantExtra.skills.push(elem.value);
    });
  }
  const variantSpellElem = document.getElementById("variantSpellChoice");
  if (variantSpellElem && variantSpellElem.value) {
    variantExtra.spell = variantSpellElem.value;
  }
  const backgroundLanguages = window.backgroundData ? window.backgroundData.languages || [] : [];
  const allLanguages = [...new Set([...(selectedData["Languages"] || []), ...backgroundLanguages])];
  const character = {
    user_name: document.getElementById("userName")?.value || "",
    name: document.getElementById("characterName").value || "Senza Nome",
    origin: document.getElementById("origin")?.value || "",
    age: document.getElementById("age")?.value || "",
    level: document.getElementById("levelSelect").value || "1",
    race: document.getElementById("raceSelect").selectedOptions[0]?.text || "Nessuna",
    class: document.getElementById("classSelect").selectedOptions[0]?.text || "Nessuna",
    subclass: document.getElementById("subclassSelect").selectedOptions[0]?.text || "Nessuna",
    background: window.backgroundData ? window.backgroundData.name : "Nessuno",
    stats: {
      strength: document.getElementById("strFinalScore").textContent,
      dexterity: document.getElementById("dexFinalScore").textContent,
      constitution: document.getElementById("conFinalScore").textContent,
      intelligence: document.getElementById("intFinalScore").textContent,
      wisdom: document.getElementById("wisFinalScore").textContent,
      charisma: document.getElementById("chaFinalScore").textContent
    },
    racial_bonus: {
      strength: document.getElementById("strRaceModifier").textContent,
      dexterity: document.getElementById("dexRaceModifier").textContent,
      constitution: document.getElementById("conRaceModifier").textContent,
      intelligence: document.getElementById("intRaceModifier").textContent,
      wisdom: document.getElementById("wisRaceModifier").textContent,
      charisma: document.getElementById("chaRaceModifier").textContent
    },
    background_proficiencies: window.backgroundData ? {
      skills: window.backgroundData.skills || [],
      tools: window.backgroundData.tools || [],
      languages: window.backgroundData.languages || []
    } : { skills: [], tools: [], languages: [] },
    background_feat: window.backgroundData ? window.backgroundData.feat || "" : "",
    equipment: selectedData.equipment || { standard: [], class: [], upgrades: [] },
    languages: {
      selected: allLanguages
    },
    selections: selectedData,
    chromatic_ancestry: chromaticAncestry,
    tool_proficiency: toolProficiency,
    variant_feature: variantFeature,
    variant_extra: variantExtra
  };
  console.log("✅ JSON finale generato:");
  console.log(JSON.stringify(character, null, 2));
  const filename = character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + "_character.json";
  downloadJsonFile(filename, character);
  alert("JSON generato e scaricato!");
}

function downloadJsonFile(filename, jsonData) {
  const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(jsonBlob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ==================== POINT BUY SYSTEM ====================
var totalPoints = 27;

function adjustPoints(ability, action) {
  const pointsSpan = document.getElementById(ability + "Points");
  let points = parseInt(pointsSpan.textContent);
  if (action === 'add' && totalPoints > 0 && points < 15) {
    totalPoints -= (points >= 13 ? 2 : 1);
    points++;
  } else if (action === 'subtract' && points > 8) {
    totalPoints += (points > 13 ? 2 : 1);
    points--;
  }
  pointsSpan.textContent = points;
  const pointsRemaining = document.getElementById("pointsRemaining");
  if (pointsRemaining) {
    pointsRemaining.textContent = totalPoints;
  }
  updateFinalScores();
}

function updateFinalScores() {
  const level = parseInt(document.getElementById("levelSelect")?.value) || 1;
  ["str", "dex", "con", "int", "wis", "cha"].forEach(ability => {
    const base = parseInt(document.getElementById(`${ability}Points`).textContent);
    const raceMod = parseInt(document.getElementById(`${ability}RaceModifier`).textContent);
    const bgEl = document.getElementById(`${ability}BackgroundTalent`);
    const bgBonus = bgEl ? parseInt(bgEl.value) || 0 : 0;
    const finalScore = base + raceMod + bgBonus;
    const finalScoreElement = document.getElementById(`${ability}FinalScore`);
    if (level === 1 && finalScore > 17) {
      finalScoreElement.textContent = "Errore";
      finalScoreElement.style.color = "red";
    } else {
      finalScoreElement.textContent = finalScore;
      finalScoreElement.style.color = "";
    }
  });
  console.log("🔄 Punteggi Finali aggiornati!");
}

function initializeValues() {
  const abilities = ["str", "dex", "con", "int", "wis", "cha"];
  abilities.forEach(ability => {
    const raceModEl = document.getElementById(ability + "RaceModifier");
    if (raceModEl) raceModEl.textContent = "0";
    const bgEl = document.getElementById(ability + "BackgroundTalent");
    if (bgEl) bgEl.value = "0";
  });
  updateFinalScores();
}

function applyRacialBonuses() {
  console.log("⚡ applyRacialBonuses() chiamata!");
  const bonus1 = document.getElementById("racialBonus1").value;
  const bonus2 = document.getElementById("racialBonus2").value;
  const bonus3 = document.getElementById("racialBonus3").value;
  if (!bonus1 || !bonus2 || !bonus3) {
    handleError("Devi selezionare tutti e tre i bonus razziali!");
    return;
  }
  const selections = [bonus1, bonus2, bonus3];
  const counts = {};
  selections.forEach(bonus => {
    counts[bonus] = (counts[bonus] || 0) + 1;
  });
  const values = Object.values(counts);
  const validDistribution =
    (values.includes(2) && values.includes(1) && Object.keys(counts).length === 2) ||
    (values.every(val => val === 1) && Object.keys(counts).length === 3);
  if (!validDistribution) {
    handleError("Puoi assegnare +2 a una caratteristica e +1 a un'altra, oppure +1 a tre diverse!");
    return;
  }
  const abilityIds = ["str", "dex", "con", "int", "wis", "cha"];
  abilityIds.forEach(stat => {
    const el = document.getElementById(stat + "RaceModifier");
    if (el) {
      el.textContent = counts[stat] ? counts[stat] : "0";
    }
  });
  console.log("✅ Bonus razziali applicati:", counts);
  updateFinalScores();
}

function resetRacialBonuses() {
  document.getElementById("racialBonus1").value = "";
  document.getElementById("racialBonus2").value = "";
  document.getElementById("racialBonus3").value = "";
  const abilityFields = ["str", "dex", "con", "int", "wis", "cha"];
  abilityFields.forEach(ability => {
    const el = document.getElementById(ability + "RaceModifier");
    if (el) el.textContent = "0";
  });
  updateFinalScores();
}

// ==================== STUB FOR updateSkillOptions ====================
function updateSkillOptions() {
  console.log("updateSkillOptions called.");
}

// ==================== EVENT LISTENERS AND INITIALIZATION ====================
window.applyRacialBonuses = applyRacialBonuses;
window.updateVariantSkillOptions = updateVariantSkillOptions;
window.adjustPoints = adjustPoints;

export {
  updateVariantSkillOptions,
  handleVariantExtraSelections,
  handleVariantFeatureChoices,
  handleExtraAncestry,
  gatherExtraSelections,
  gatherRaceTraitSelections,
  initFeatureSelectionHandlers,
  convertDetailsToAccordion,
  initializeAccordion,
  updateSubclasses,
  renderClassFeatures,
  openExtrasModal,
  updateExtraSelectionsView,
  showExtraSelection,
  displayRaceTraits,
  getTakenProficiencies,
  generateFinalJson,
  initializeValues,
  renderFinalRecap
};

