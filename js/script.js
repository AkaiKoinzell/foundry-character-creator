import { loadLanguages, handleError, renderTables } from './common.js';
import { loadSpells, filterSpells, handleSpellcasting } from './spellcasting.js';
import { convertRaceData, ALL_SKILLS } from './raceData.js';
import { getSelectedData, setSelectedData, saveSelectedData } from './state.js';
import { createHeader, createParagraph, createList } from './domHelpers.js';

// ==================== MAPPING PER LE EXTRA VARIANT FEATURES ====================
const variantExtraMapping = {
  "Drow Magic": {
    type: "none" // Le spell fisse saranno gestite separatamente
  },
  "Skill Versatility": {
    type: "skills",
    count: 2,
    options: [
      "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History",
      "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception",
      "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"
    ]
  },
  "Swim": {
    type: "none"
  },
  "Cantrip (Wizard)": {
    type: "spells",
    filter: "level=0|class=Wizard"
  }
  // Aggiungi altri mapping se necessario
};

// ==================== LISTE DI STRUMENTI ====================
const ARTISAN_TOOLS = [
  "Alchemist's Supplies",
  "Brewer's Supplies",
  "Calligrapher's Tools",
  "Carpenter's Tools",
  "Cartographer's Tools",
  "Cobbler's Tools",
  "Cook's Utensils",
  "Glassblower's Tools",
  "Jeweler's Tools",
  "Leatherworker's Tools",
  "Mason's Tools",
  "Painter's Supplies",
  "Potter's Tools",
  "Smith's Tools",
  "Tinker's Tools",
  "Weaver's Tools",
  "Woodcarver's Tools"
];

const MUSICAL_INSTRUMENTS = [
  "Bagpipes",
  "Drum",
  "Dulcimer",
  "Flute",
  "Lute",
  "Lyre",
  "Horn",
  "Pan Flute",
  "Shawm",
  "Viol"
];

export const ALL_TOOLS = [
  ...ARTISAN_TOOLS,
  ...MUSICAL_INSTRUMENTS,
  "Disguise Kit",
  "Forgery Kit",
  "Herbalism Kit",
  "Navigator's Tools",
  "Poisoner's Kit",
  "Thieves' Tools",
  "Dice Set",
  "Dragonchess Set",
  "Playing Card Set",
  "Three-Dragon Ante Set",
  "Vehicle (Land)",
  "Vehicle (Water)",
];

// ==================== FUNZIONI PER LE VARIANT FEATURES ====================
function updateVariantSkillOptions() {
  const allVariantSkillSelects = document.querySelectorAll(".variantSkillChoice");
  if (!allVariantSkillSelects.length) return;

  const selected = new Set([...allVariantSkillSelects].map(select => select.value).filter(Boolean));

  allVariantSkillSelects.forEach(select => {
    const current = select.value;
    select.innerHTML = `<option value="">Seleziona...</option>`;
    JSON.parse(select.getAttribute("data-options")).forEach(skill => {
      const option = document.createElement("option");
      option.value = skill;
      option.textContent = skill;
      if (skill === current || !selected.has(skill)) {
        select.appendChild(option);
        if (skill === current) option.selected = true;
      }
    });
  });
}

function handleVariantExtraSelections() {
  const variantElem = document.getElementById("variantFeatureChoice");
  const container = document.getElementById("variantExtraContainer");
  if (!container || !variantElem || !variantElem.value) return;
  
  const selectedVariant = variantElem.value;
  const mapData = variantExtraMapping[selectedVariant];

  container.innerHTML = ""; // Pulisce il contenuto precedente

  if (!mapData) return;

  if (mapData.type === "skills") {
    container.innerHTML = `<p><strong>Seleziona ${mapData.count} skill per ${selectedVariant}:</strong></p>` +
      Array(mapData.count).fill(0).map((_, i) =>
        `<select class="variantSkillChoice" id="variantSkillChoice${i}" data-options='${JSON.stringify(mapData.options)}' onchange="updateVariantSkillOptions()">
            <option value="">Seleziona...</option>
            ${mapData.options.map(s => `<option value="${s}">${s}</option>`).join("")}
          </select>`
      ).join(" ");
    container.querySelectorAll("select").forEach(sel => {
      sel.addEventListener("change", () => {
        selectedData["Variant Feature Skills"] = [...container.querySelectorAll(".variantSkillChoice")]
          .map(s => s.value)
          .filter(Boolean);
        checkTraitCompletion("variantFeatureTrait");
      });
    });
    checkTraitCompletion("variantFeatureTrait");
  } else if (mapData.type === "spells") {
    loadSpells(spellList => {
      const filtered = filterSpells(spellList, mapData.filter);

      container.innerHTML = filtered.length
        ? `<p><strong>Seleziona un incantesimo per ${selectedVariant}:</strong></p>
            <select id="variantSpellChoice">
              <option value="">Seleziona...</option>
              ${filtered.map(spell => `<option value="${spell.name}">${spell.name}</option>`).join("")}
            </select>`
        : `<p>Nessun incantesimo trovato per il filtro: ${mapData.filter}</p>`;

      const spellSel = document.getElementById("variantSpellChoice");
      if (spellSel) {
        spellSel.addEventListener("change", () => {
          selectedData["Variant Feature Spell"] = [spellSel.value];
          checkTraitCompletion("variantFeatureTrait");
        });
        checkTraitCompletion("variantFeatureTrait");
      }
    });
  }
}

function handleVariantFeatureChoices(data) {
  if (!data.variant_feature_choices) return;

  console.log(`📌 Trovata Variant Feature per ${data.name}:`, data.variant_feature_choices);

  const container = document.getElementById("variantFeatureSelectionContainer");
  if (!container) return;

  let html = `<p><strong>Scegli una Variant Feature:</strong></p><select id="variantFeatureChoice">
                <option value="">Seleziona...</option>`;
  data.variant_feature_choices.forEach(opt => {
    html += `<option value="${opt.name}">${opt.name}</option>`;
  });
  html += `</select>`;

  container.innerHTML = html;
  document.getElementById("variantFeatureChoice").addEventListener("change", handleVariantExtraSelections);
}

// ==================== EXTRAS: LANGUAGES, SKILLS, TOOLS, ANCESTRY ====================
function handleExtraLanguages(data, containerId) {
  if (data.languages && data.languages.choice > 0) {
    loadLanguages(langs => {
      const availableLangs = langs.filter(lang => !data.languages.fixed.includes(lang));
      const options = availableLangs.map(lang => `<option value="${lang}">${lang}</option>`).join("");
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
    if (container) container.innerHTML = "";
  }
}

function handleExtraSkills(data, containerId) {
  if (data.skill_choices) {
    const skillOptions = JSON.stringify(data.skill_choices.options);
    const skillContainer = document.createElement("div");
const title = document.createElement("h4");
title.textContent = "Skill Extra";
skillContainer.appendChild(title);

for (let i = 0; i < data.skill_choices.number; i++) {
  const select = document.createElement("select");
  select.classList.add("skillChoice");
  select.id = `skillChoice${i}`;
  select.dataset.options = JSON.stringify(data.skill_choices.options);
  
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Seleziona...";
  select.appendChild(defaultOption);
  
  data.skill_choices.options.forEach(skill => {
    const option = document.createElement("option");
    option.value = skill;
    option.textContent = skill;
    select.appendChild(option);
  });

  skillContainer.appendChild(select);
}

const container = document.getElementById(containerId);
if (container) container.appendChild(skillContainer);
  }
}

function handleExtraTools(data, containerId) {
  if (data.tool_choices) {
    const toolOptions = JSON.stringify(data.tool_choices.options);
    let html = `<h4>Tool Extra</h4>`;
    for (let i = 0; i < data.tool_choices.number; i++) {
      html += `<select class="toolChoice" id="toolChoice${i}" data-options='${toolOptions}'>
                  <option value="">Seleziona...</option>`;
      html += data.tool_choices.options.map(t => `<option value="${t}">${t}</option>`).join("");
      html += `</select>`;
    }
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = html;
  } else {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = "";
  }
}

function handleExtraAncestry(data, containerId) {
  if (data.variant_feature_choices && data.variant_feature_choices.length > 0) {
    const ancestryOptions = data.variant_feature_choices.filter(opt => opt.name.toLowerCase().includes("ancestry"));
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
    if (container) container.innerHTML = "";
  }
}

function checkTraitCompletion(detailId) {
  const detail = document.getElementById(detailId);
  if (!detail) return;
  const selects = detail.querySelectorAll("select");
  const incomplete = [...selects].some(sel => !sel.value);
  detail.classList.toggle("incomplete", incomplete);
}

function gatherRaceTraitSelections() {
  const result = {};
  const lang = document.getElementById("extraLanguageDropdown")?.value;
  if (lang) result.languages = [lang];

  const skills = [...document.querySelectorAll("#skillSelectionContainer .skillChoice")]
    .map(s => s.value)
    .filter(Boolean);
  if (skills.length) result.skills = skills;

  const tools = [...document.querySelectorAll("#toolSelectionContainer .toolChoice")]
    .map(s => s.value)
    .filter(Boolean);
  if (tools.length) result.tools = tools;

  const variant = document.getElementById("variantFeatureChoice")?.value;
  if (variant) {
    result.variantFeature = variant;
    const vSkills = [...document.querySelectorAll(".variantSkillChoice")]
      .map(s => s.value)
      .filter(Boolean);
    if (vSkills.length) result.variantSkills = vSkills;
    const vSpell = document.getElementById("variantSpellChoice")?.value;
    if (vSpell) result.variantSpell = vSpell;
  }

  const ancestry = document.getElementById("ancestrySelection")?.value;
  if (ancestry) result.ancestry = ancestry;

  return result;
}

// ==================== POPUP FOR EXTRA SELECTIONS ====================

// Global variables for the extra selections popup
let selectedData = getSelectedData();

// These variables are referenced throughout the extra selections workflow.
// In earlier refactors they were implicitly assumed to exist which caused
// runtime ReferenceError issues when the script loaded before any
// selections were defined.  Initialising them here ensures that later
// checks like `extraSelections.every(...)` can safely run even if no
// extra selections have been generated yet.
let extraSelections = [];
let currentSelectionIndex = 0;
let extraModalContext = "";

// Elements used to navigate and close the extra selections modal
const prevTraitEl = document.getElementById("prevTrait");
const nextTraitEl = document.getElementById("nextTrait");
const closeModalEl = document.getElementById("closeModal");

// Cached list of all languages loaded from JSON
export let availableLanguages = [];
export function setAvailableLanguages(langs) {
  availableLanguages = langs;
}
// Flag to track confirmation of class selection

// Mapping and descriptions for extra selection categories
const extraCategoryAliases = {
  "Cantrip": "Cantrips",
  "Cantrips": "Cantrips",
  "Skill Proficiency": "Skill Proficiency",
  "Tool Proficiency": "Tool Proficiency",
  "Fighting Style": "Fighting Style",
  "Additional Fighting Style": "Fighting Style",
  "Divine Domain": "Divine Domain",
  "Metamagic": "Metamagic"
};

const extraCategoryDescriptions = {
  "Cantrips": "Scegli i tuoi cantrip.",
  "Skill Proficiency": "Seleziona le competenze nelle abilità.",
  "Tool Proficiency": "Seleziona le competenze negli strumenti.",
  "Fighting Style": "Scegli il tuo stile di combattimento.",
  "Divine Domain": "Seleziona il tuo dominio divino.",
  "Metamagic": "Scegli le opzioni di Metamagia."
};

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

  const taken = new Set((selectedData[selectedMap[type]] || []).filter(v => v));

  if (window.backgroundData) {
    const bgMap = { skills: "skills", tools: "tools", languages: "languages" };
    (window.backgroundData[bgMap[type]] || []).forEach(v => taken.add(v));
  }

  return Array.from(taken);
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

  const takenLangs = new Set(getTakenProficiencies('languages'));
  const takenSkills = new Set(getTakenProficiencies('skills'));
  const takenTools = new Set(getTakenProficiencies('tools'));

  if (context === "race") {
    if (data.languages && (data.languages.fixed.length > 0 || data.languages.choice > 0)) {
      let availableLangs = availableLanguages
        .filter(lang => !data.languages.fixed.includes(lang))
        .filter(lang => !takenLangs.has(lang));
      let note = '';
      if (availableLangs.length === 0) {
        availableLangs = availableLanguages.filter(lang => !takenLangs.has(lang));
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
      let filteredSkills = data.skill_choices.options.filter(opt => !takenSkills.has(opt));
      let note = '';
      if (filteredSkills.length === 0) {
        filteredSkills = ALL_SKILLS.filter(opt => !takenSkills.has(opt));
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
      let filteredTools = data.tool_choices.options.filter(opt => !takenTools.has(opt));
      let note = '';
      if (filteredTools.length === 0) {
        filteredTools = ALL_TOOLS.filter(opt => !takenTools.has(opt));
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
        if (selected.length < (choice.count || 1)) {
          let opts = choice.selection || choice.options || [];
          let note = '';
          if (key === "Languages") {
            opts = opts.filter(o => !takenLangs.has(o));
            if (opts.length === 0) {
              opts = availableLanguages.filter(o => !takenLangs.has(o));
              note = ' (tutte le lingue disponibili)';
            }
          } else if (key === "Skill Proficiency") {
            opts = opts.filter(o => !takenSkills.has(o));
            if (opts.length === 0) {
              opts = ALL_SKILLS.filter(o => !takenSkills.has(o));
              note = ' (tutte le abilità disponibili)';
            }
          } else if (key === "Tool Proficiency") {
            opts = opts.filter(o => !takenTools.has(o));
            if (opts.length === 0) {
              opts = ALL_TOOLS.filter(o => !takenTools.has(o));
              note = ' (tutti gli strumenti disponibili)';
            }
          }
          const desc = note ? ((choice.description || '') + note) : choice.description;
          selections.push({ ...choice, selection: opts, description: desc });
        }
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
function openExtrasModal(selections, context = "race") {
  if (!selections || selections.length === 0) {
    console.warn("⚠️ Nessuna selezione extra disponibile, il pop-up non verrà mostrato.");
    return;
  }

  // Store the selections and context so that navigation and other
  // handlers (e.g. the close button) can reference them safely.
  extraSelections = selections;
  currentSelectionIndex = 0;
  extraModalContext = context;

  const containerId = context === "class" ? "classExtrasAccordion" : "raceExtraTraitsContainer";
  const container = document.getElementById(containerId);
  if (!container) return;
  container.classList.remove('hidden');

  // Ensure categories exist in selectedData
  selections.forEach(selection => {
    const key = extraCategoryAliases[selection.name] || selection.name;
    if (!selectedData[key]) {
      selectedData[key] = [];
    }
  });

  container.innerHTML = "";

  selections.forEach((selection, selIdx) => {
    const categoryKey = extraCategoryAliases[selection.name] || selection.name;
    const item = document.createElement('div');
    item.classList.add('accordion-item', 'user-choice');

    const header = document.createElement('button');
    header.type = 'button';
    header.classList.add('accordion-header');
    header.textContent = selection.name;
    item.appendChild(header);

    const content = document.createElement('div');
    content.classList.add('accordion-content');

    for (let i = 0; i < selection.count; i++) {
      const sel = document.createElement('select');
      sel.classList.add('extra-selection');
      sel.dataset.category = categoryKey;
      sel.dataset.index = i;
      sel.innerHTML = `<option value="">Seleziona...</option>` +
        selection.selection.map(opt => `<option value="${opt}">${opt}</option>`).join("");
      content.appendChild(sel);

      sel.addEventListener('change', e => {
        const category = e.target.dataset.category;
        const index = e.target.dataset.index;
        if (!selectedData[category]) {
          selectedData[category] = [];
        }
        selectedData[category][index] = e.target.value;
        saveSelectedData();
        updateExtraSelectionsView();
      });
    }

    item.appendChild(content);
    container.appendChild(item);
  });

  initializeAccordion(container);
  updateExtraSelectionsView();
}

function updateExtraSelectionsView() {
  console.log("🔄 Recupero selezioni extra salvate...");

  // ✅ Recupera i dati attuali dallo stato
  selectedData = getSelectedData();

  function updateContainer(id, title, dataKey) {
    const container = document.getElementById(id);
    if (!container) return;

    const values = (selectedData[dataKey] || []).filter(v => v);

    if (values.length > 0) {
      container.innerHTML = `<p><strong>${title}:</strong> ${values.join(", ")}</p>`;
      container.classList.remove('hidden');
    } else {
      container.innerHTML = "";
      container.classList.add('hidden');
    }
  }

  const summaryMap = extraModalContext === "class" ? {} : {
    "Languages": ["languageSelection", "Lingue Extra"],
    "Skill Proficiency": ["skillSelectionContainer", "Skill Proficiency"],
    "Tool Proficiency": ["toolSelectionContainer", "Tool Proficiency"]
    // Spellcasting selections are now integrated directly within trait details
  };
  Object.entries(summaryMap).forEach(([key, [id, title]]) => {
    if (selectedData[key] !== undefined) {
      updateContainer(id, title, key);
    } else {
      const container = document.getElementById(id);
      if (container) container.classList.add('hidden');
    }
  });

  console.log("✅ Extra selections aggiornate:", selectedData);
}

/**
 * Displays the current extra selection in the popup.
 * Each dropdown gets a data-category attribute set to the current selection's name.
 * The "Close" button is shown only when on the last extra selection.
 */
function showExtraSelection() {
  const titleElem = document.getElementById("extraTraitTitle");
  const descElem = document.getElementById("extraTraitDescription");
  const selectionElem = document.getElementById("extraTraitSelection");

  if (!extraSelections || extraSelections.length === 0) return;

  const currentSelection = extraSelections[currentSelectionIndex];

  titleElem.innerText = currentSelection.name;
  const desc = currentSelection.description || extraCategoryDescriptions[currentSelection.name] || "";
  descElem.innerText = desc;
  selectionElem.innerHTML = ""; // Pulisce il contenuto precedente

  if (currentSelection.selection) {
    const categoryKey = extraCategoryAliases[currentSelection.name] || currentSelection.name;
    const typeLookup = {
      Languages: 'languages',
      'Skill Proficiency': 'skills',
      'Tool Proficiency': 'tools',
    };
    const taken = new Set(getTakenProficiencies(typeLookup[categoryKey] || ''));
    const selectedValues = new Set((selectedData[categoryKey] || []).filter(v => v));
    taken.forEach(v => selectedValues.add(v));

    let dropdownHTML = "";
    for (let i = 0; i < currentSelection.count; i++) {
      dropdownHTML += `<select class="extra-selection" data-category="${categoryKey}" data-index="${i}">
                        <option value="">Seleziona...</option>`;
      currentSelection.selection.forEach(option => {
        const disabled = selectedValues.has(option) && !selectedData[categoryKey]?.includes(option);
        dropdownHTML += `<option value="${option}" ${disabled ? "disabled" : ""}>${option}</option>`;
      });
      dropdownHTML += `</select><br>`;
    }
    selectionElem.innerHTML = dropdownHTML;

    document.querySelectorAll(".extra-selection").forEach(select => {
      select.addEventListener("change", (event) => {
        const rawCategory = event.target.getAttribute("data-category");
        const category = extraCategoryAliases[rawCategory] || rawCategory;
        const index = event.target.getAttribute("data-index");

        if (!selectedData[category]) {
          selectedData[category] = [];
        }

        selectedData[category][index] = event.target.value;

        console.log(`📝 Salvato: ${category} -> ${selectedData[category]}`);

        saveSelectedData();
        updateExtraSelectionsView();
      });
    });
  }

  if (prevTraitEl && nextTraitEl && closeModalEl) {
    prevTraitEl.disabled = (currentSelectionIndex === 0);
    nextTraitEl.disabled = (currentSelectionIndex === extraSelections.length - 1);

    const allChoicesFilled = extraSelections.every(sel =>
      selectedData[sel.name] && selectedData[sel.name].filter(v => v).length === sel.count
    );

    if (currentSelectionIndex === extraSelections.length - 1 && allChoicesFilled) {
      closeModalEl.style.display = "inline-block";
    } else {
      closeModalEl.style.display = "none";
    }
  }
}

  // Navigation buttons for the popup
  if (prevTraitEl && nextTraitEl) {
    prevTraitEl.addEventListener("click", () => {
      if (currentSelectionIndex > 0) {
        currentSelectionIndex--;
        showExtraSelection();
      }
    });

    nextTraitEl.addEventListener("click", () => {
      if (currentSelectionIndex < extraSelections.length - 1) {
        currentSelectionIndex++;
        showExtraSelection();
      }
    });
  }

  if (closeModalEl) {
    closeModalEl.addEventListener("click", () => {
      console.log("🔄 Chiusura pop-up e aggiornamento UI...");
      const raceModal = document.getElementById("raceExtrasModal");
      if (raceModal) raceModal.classList.add('hidden');
      sessionStorage.removeItem("popupOpened");

      // ✅ Salviamo le selezioni extra PRIMA di eventuali refresh
      saveSelectedData();
      console.log("📝 Selezioni salvate prima dell'update:", selectedData);

      if (extraModalContext === "race") {
        showStep("step3");

        setTimeout(() => {
          console.log("🛠 Eseguo displayRaceTraits()...");
          displayRaceTraits();

          // 🔥 **Aspettiamo che `displayRaceTraits()` finisca e poi forziamo le selezioni extra**
          setTimeout(() => {
            console.log("✅ Forzando updateExtraSelectionsView()...");
            updateExtraSelectionsView();
          }, 500); // 🔥 Ritardo di 500ms per essere sicuri che il rendering sia completato
        }, 300);
      } else if (extraModalContext === "class") {
        renderClassFeatures();
      }
    });
  }

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
    for (let i = 0; i < (choice.count || 1); i++) {
      const saved = selectedData[featureKey]?.[i] || '';
      const label = document.createElement('label');
      label.textContent = `${choice.name}${choice.count > 1 ? ' ' + (i + 1) : ''}: `;
      const select = document.createElement('select');
      select.dataset.feature = featureKey;
      select.dataset.index = i;
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
      targetDetail.appendChild(label);
    }
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
  displayRaceTraits,
  getTakenProficiencies,
  generateFinalJson,
  initializeValues,
  renderFinalRecap
};

