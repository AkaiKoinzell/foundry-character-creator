import { loadLanguages, handleError, renderTables } from './common.js';
import { loadSpells, filterSpells, handleSpellcasting } from './spellcasting.js';
import { convertRaceData } from './raceData.js';

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

  switch (mapData.type) {
    case "skills":
      container.innerHTML = `<p><strong>Seleziona ${mapData.count} skill per ${selectedVariant}:</strong></p>` +
        Array(mapData.count).fill(0).map((_, i) => 
          `<select class="variantSkillChoice" id="variantSkillChoice${i}" data-options='${JSON.stringify(mapData.options)}' onchange="updateVariantSkillOptions()">
            <option value="">Seleziona...</option>
            ${mapData.options.map(s => `<option value="${s}">${s}</option>`).join("")}
          </select>`
        ).join(" ");
      break;

      case "spells":
        loadSpells(spellList => {
          const filtered = filterSpells(spellList, mapData.filter);

          container.innerHTML = filtered.length
            ? `<p><strong>Seleziona un incantesimo per ${selectedVariant}:</strong></p>
                <select id="variantSpellChoice">
                  <option value="">Seleziona...</option>
                  ${filtered.map(spell => `<option value="${spell.name}">${spell.name}</option>`).join("")}
                </select>`
            : `<p>Nessun incantesimo trovato per il filtro: ${mapData.filter}</p>`;
        });
        break;
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
function loadFeats(callback) {
  if (availableFeats.length > 0) {
    callback(availableFeats);
    return;
  }
  fetch("data/feats.json")
    .then(response => response.json())
    .then(data => {
      if (data.feats) {
        if (Array.isArray(data.feats)) {
          availableFeats = data.feats;
        } else if (typeof data.feats === "object") {
          availableFeats = Object.keys(data.feats).map(name => ({ name }));
        }
        callback(availableFeats);
      } else {
        handleError("Nessun feat trovato nel file JSON.");
      }
    })
    .catch(error => handleError(`Errore caricando i feats: ${error}`));
}

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

// ==================== POPUP FOR EXTRA SELECTIONS ====================

// Global variables for the extra selections popup
let selectedData = sessionStorage.getItem("selectedData")
  ? JSON.parse(sessionStorage.getItem("selectedData"))
  : {};
window.selectedData = selectedData;
let extraSelections = [];
let currentSelectionIndex = 0;
// Cached list of all languages loaded from JSON
let availableLanguages = [];
export function setAvailableLanguages(langs) {
  availableLanguages = langs;
}
// Cached list of feats loaded from JSON
let availableFeats = [];
// Context for the extras modal ("race" or "class")
let extraModalContext = "race";
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
  "Metamagic": "Metamagic",
  "Ability Score Improvement": "Ability Score Improvement"
};

const extraCategoryDescriptions = {
  "Cantrips": "Scegli i tuoi cantrip.",
  "Skill Proficiency": "Seleziona le competenze nelle abilità.",
  "Tool Proficiency": "Seleziona le competenze negli strumenti.",
  "Fighting Style": "Scegli il tuo stile di combattimento.",
  "Divine Domain": "Seleziona il tuo dominio divino.",
  "Metamagic": "Scegli le opzioni di Metamagia.",
  "Ability Score Improvement": "Aumenta i punteggi di caratteristica o scegli un talento."
};

/**
 * Builds a unified list of extra selections for races or classes.
 * @param {Object} data - Source data containing choice information.
 * @param {string} context - "race" or "class" to determine parsing logic.
 * @param {number} [level=1] - Character level for filtering class choices.
 * @returns {Array} List of selection objects.
 */
function gatherExtraSelections(data, context, level = 1) {
  const selections = [];
  if (context === "race") {
    if (data.languages && data.languages.choice > 0) {
      const availableLangs = availableLanguages.filter(
        lang => !data.languages.fixed.includes(lang)
      );
      selections.push({
        name: "Languages",
        description: "Choose an additional language.",
        selection: availableLangs,
        count: data.languages.choice
      });
    }
    if (data.skill_choices) {
      selections.push({
        name: "Skill Proficiency",
        description: "Choose skill proficiencies.",
        selection: data.skill_choices.options,
        count: data.skill_choices.number
      });
    }
    if (data.tool_choices) {
      selections.push({
        name: "Tool Proficiency",
        description: "Choose a tool proficiency.",
        selection: data.tool_choices.options,
        count: 1
      });
    }
    if (data.spellcasting) {
      if (
        data.spellcasting.ability_choices &&
        data.spellcasting.ability_choices.length > 1
      ) {
        selections.push({
          name: "Spellcasting",
          description: "Choose a casting ability.",
          selection: data.spellcasting.ability_choices,
          count: 1
        });
      }
      if (
        data.spellcasting.spell_choices &&
        data.spellcasting.spell_choices.type === "fixed_list"
      ) {
        selections.push({
          name: "Cantrips",
          description: "Choose a spell.",
          selection: data.spellcasting.spell_choices.options,
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
          selections.push(choice);
        }
      }
    });
  }
  return selections;
}

/**
 * Opens the extra selections popup.
 * Hides the background extra traits container and shows the modal.
 */
function openExtrasModal(selections, context = "race") {
  if (!selections || selections.length === 0) {
    console.warn("⚠️ Nessuna selezione extra disponibile, il pop-up non verrà mostrato.");
    return;
  }
  extraModalContext = context;
  extraSelections = selections;
  currentSelectionIndex = 0;
  showExtraSelection();

  if (!sessionStorage.getItem("popupOpened")) {
    sessionStorage.setItem("popupOpened", "true");
  }

  // Inizializza le categorie in selectedData se non esistono già
  selections.forEach(selection => {
    const key = extraCategoryAliases[selection.name] || selection.name;
    if (!selectedData[key]) {
      selectedData[key] = [];
    }
  });

  sessionStorage.setItem("popupOpened", "true");

  document.getElementById("raceExtraTraitsContainer").style.display = "none";
  document.getElementById("raceExtrasModal").style.display = "flex";

  const extraContainer = document.getElementById("raceExtraTraitsContainer");
  const modal = document.getElementById("raceExtrasModal");
  if (extraContainer) extraContainer.style.display = "none";
  if (modal) modal.style.display = "flex";
}

function updateExtraSelectionsView() {
  console.log("🔄 Recupero selezioni extra salvate...");

  // ✅ Assicuriamoci di recuperare i dati dallo storage
  selectedData = sessionStorage.getItem("selectedData")
    ? JSON.parse(sessionStorage.getItem("selectedData"))
    : selectedData;

  function updateContainer(id, title, dataKey) {
    const container = document.getElementById(id);
    if (container) {
      const values = (selectedData[dataKey] || []).filter(v => v);
      if (values.length > 0) {
        container.innerHTML = `<p><strong>${title}:</strong> ${values.join(", ")}</p>`;
        container.style.display = "block";
      } else {
        container.innerHTML = `<p><strong>${title}:</strong> Nessuna selezione.</p>`;
        container.style.display = "block";
      }
    }
  }

  const summaryMap = {
    "Languages": ["languageSelection", "Lingue Extra"],
    "Skill Proficiency": ["skillSelectionContainer", "Skill Proficiency"],
    "Tool Proficiency": ["toolSelectionContainer", "Tool Proficiency"],
    "Spellcasting": ["spellSelectionContainer", "Spellcasting"],
    "Cantrips": ["spellSelectionContainer", "Cantrips"],
    "Fighting Style": ["fightingStyleSelection", "Fighting Style"],
    "Divine Domain": ["divineDomainSelection", "Divine Domain"],
    "Metamagic": ["metamagicSelection", "Metamagic"],
    "Ability Score Improvement": ["abilityImprovementSelection", "Ability Score Improvement"]
  };
  Object.entries(summaryMap).forEach(([key, [id, title]]) => {
    updateContainer(id, title, key);
  });

  console.log("✅ Extra selections aggiornate:", selectedData);
}

function renderAbilityOptions(container, index, maxSelections, bonus) {
  const abilities = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
  container.innerHTML = abilities
    .map(
      ability =>
        `<label><input type="checkbox" class="asi-ability" data-index="${index}" value="${ability}">${ability}</label>`
    )
    .join(" ");

  container.querySelectorAll(".asi-ability").forEach(cb => {
    cb.addEventListener("change", e => {
      const checked = [...container.querySelectorAll(".asi-ability:checked")];
      if (checked.length > maxSelections) {
        e.target.checked = false;
        return;
      }
      const selection = checked
        .map(c => `${c.value} +${bonus}`)
        .join(", ");
      if (!selectedData["Ability Score Improvement"]) {
        selectedData["Ability Score Improvement"] = [];
      }
      selectedData["Ability Score Improvement"][index] = selection || undefined;
      sessionStorage.setItem("selectedData", JSON.stringify(selectedData));
      updateExtraSelectionsView();
    });
  });
}

function renderFeatSelection(container, index) {
  loadFeats(feats => {
    const selectedRace =
      document.getElementById("raceSelect")?.selectedOptions[0]?.text || "";
    const options = feats
      .filter(
        f =>
          !f.races ||
          f.races.some(r =>
            selectedRace.toLowerCase().includes(r.toLowerCase())
          )
      )
      .map(f => `<option value="${f.name}">${f.name}</option>`)
      .join("");
    container.innerHTML = `<select class="asi-feat" data-index="${index}"><option value="">Seleziona...</option>${options}</select>`;
    container.querySelector(".asi-feat").addEventListener("change", e => {
      if (!selectedData["Ability Score Improvement"]) {
        selectedData["Ability Score Improvement"] = [];
      }
      const chosen = feats.find(f => f.name === e.target.value);
      selectedData["Ability Score Improvement"][index] = chosen
        ? `Feat: ${chosen.name}`
        : undefined;
      sessionStorage.setItem("selectedData", JSON.stringify(selectedData));
      updateExtraSelectionsView();
    });
  });
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
    const selectedValues = new Set((selectedData[categoryKey] || []).filter(v => v));

    if (categoryKey === "Ability Score Improvement") {
      let html = "";
      for (let i = 0; i < currentSelection.count; i++) {
        html += `<div class="asi-block">
                    <select class="asi-type" data-index="${i}">
                      <option value="">Seleziona...</option>
                      ${currentSelection.selection.map(opt => `<option value="${opt}">${opt}</option>`).join("")}
                    </select>
                    <div id="asi-extra-${i}"></div>
                 </div>`;
      }
      selectionElem.innerHTML = html;

      document.querySelectorAll(".asi-type").forEach(select => {
        select.addEventListener("change", e => {
          const index = e.target.getAttribute("data-index");
          const choice = e.target.value;
          const extraDiv = document.getElementById(`asi-extra-${index}`);
          if (!selectedData["Ability Score Improvement"]) {
            selectedData["Ability Score Improvement"] = [];
          }
          selectedData["Ability Score Improvement"][index] = undefined;
          sessionStorage.setItem("selectedData", JSON.stringify(selectedData));
          updateExtraSelectionsView();
          extraDiv.innerHTML = "";
          if (choice === "Increase one ability score by 2") {
            renderAbilityOptions(extraDiv, index, 1, 2);
          } else if (choice === "Increase two ability scores by 1") {
            renderAbilityOptions(extraDiv, index, 2, 1);
          } else if (choice === "Feat") {
            renderFeatSelection(extraDiv, index);
          }
        });
      });
    } else {
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

          sessionStorage.setItem("selectedData", JSON.stringify(selectedData));
          updateExtraSelectionsView();
        });
      });
    }
  }

  document.getElementById("prevTrait").disabled = (currentSelectionIndex === 0);
  document.getElementById("nextTrait").disabled = (currentSelectionIndex === extraSelections.length - 1);
  document.getElementById("closeModal").style.display = (currentSelectionIndex === extraSelections.length - 1) ? "inline-block" : "none";
}

  // Enable/disable navigation buttons and manage the Close button visibility.
  const prevBtn = document.getElementById("prevTrait");
  const nextBtn = document.getElementById("nextTrait");
  // Mostra il pulsante "Chiudi" solo dopo l'ultimo step e se tutte le selezioni sono fatte
  const closeBtn = document.getElementById("closeModal");
  const allChoicesFilled = extraSelections.every(sel =>
    selectedData[sel.name] && selectedData[sel.name].filter(v => v).length === sel.count
  );

  if (currentSelectionIndex === extraSelections.length - 1 && allChoicesFilled) {
    closeBtn.style.display = "inline-block";
  } else {
    closeBtn.style.display = "none";
  }

// Navigation buttons for the popup
document.getElementById("prevTrait").addEventListener("click", () => {
  if (currentSelectionIndex > 0) {
    currentSelectionIndex--;
    showExtraSelection();
  }
});

document.getElementById("nextTrait").addEventListener("click", () => {
  if (currentSelectionIndex < extraSelections.length - 1) {
    currentSelectionIndex++;
    showExtraSelection();
  }
});
  // Gather selections from each dropdown, grouped by data-category.
document.getElementById("closeModal").addEventListener("click", () => {
  console.log("🔄 Chiusura pop-up e aggiornamento UI...");
  document.getElementById("raceExtrasModal").style.display = "none";
  sessionStorage.removeItem("popupOpened");

  // ✅ Salviamo le selezioni extra PRIMA di eventuali refresh
  sessionStorage.setItem("selectedData", JSON.stringify(selectedData));
  console.log("📝 Selezioni salvate prima dell'update:", selectedData);

  if (extraModalContext === "race") {
    showStep("step2");

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

updateExtraSelectionsView();

document.getElementById("raceSelect").addEventListener("change", () => {
  console.log("🔄 Razza cambiata, reset delle selezioni extra...");
  selectedData = {}; // Reset delle selezioni extra
  document.getElementById("languageSelection").innerHTML = "";
  document.getElementById("skillSelectionContainer").innerHTML = "";
  document.getElementById("toolSelectionContainer").innerHTML = "";
  document.getElementById("spellSelectionContainer").innerHTML = "";

  displayRaceTraits(); // Ricarica i tratti della nuova razza
  document.getElementById("confirmRaceSelection").style.display = "inline-block";
});


// ==================== DISPLAY DEI TRATTI DELLA RAZZA ====================
function displayRaceTraits() {
  console.log("🛠 Esecuzione displayRaceTraits()...");
  const racePath = document.getElementById("raceSelect").value;
  const raceTraitsDiv = document.getElementById("raceTraits");
  const racialBonusDiv = document.getElementById("racialBonusSelection");

  // ✅ NON cancelliamo il contenuto se esistono già dati salvati!
  ["skillSelectionContainer", "toolSelectionContainer", "spellSelectionContainer",
 "variantFeatureSelectionContainer", "variantExtraContainer", "languageSelection", "ancestrySelection"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el && (!selectedData || Object.keys(selectedData).length === 0)) {
        el.innerHTML = ""; // ✅ Cancella solo se non ci sono selezioni extra salvate
      }
    });

   if (!racePath) {
    console.warn("⚠️ displayRaceTraits(): Nessuna razza selezionata.");
    raceTraitsDiv.innerHTML = "<p>Seleziona una razza per vedere i tratti.</p>";
    racialBonusDiv.style.display = "none";
    resetRacialBonuses();
    return;
  }

  console.log(`📜 Caricamento tratti per ${racePath}...`);
  fetch(racePath)
    .then(response => response.json())
    .then(data => {
      console.log("📜 Dati razza caricati:", data);
      console.log("🔍 JSON completo della razza selezionata:", data);
      if (raceTraitsDiv) raceTraitsDiv.innerHTML = "";
      const raceData = convertRaceData(data);
      let traitsHtml = `<h3>Tratti di ${raceData.name}</h3>`;

      // Speed
      if (raceData.speed) {
        if (typeof raceData.speed === "object") {
          const speedDetails = [];
          for (let type in raceData.speed) {
            speedDetails.push(`${type}: ${raceData.speed[type]} ft`);
          }
          traitsHtml += `<p><strong>Velocità:</strong> ${speedDetails.join(", ")}</p>`;
        } else {
          traitsHtml += `<p><strong>Velocità:</strong> ${raceData.speed} ft</p>`;
        }
      } else {
        traitsHtml += `<p><strong>Velocità:</strong> Non disponibile</p>`;
      }

      // Darkvision
      if (raceData.senses && raceData.senses.darkvision) {
        traitsHtml += `<p><strong>Visione:</strong> ${raceData.senses.darkvision} ft</p>`;
      }

      // Traits
      if (raceData.traits && raceData.traits.length > 0) {
        traitsHtml += `<p><strong>Tratti:</strong></p><ul>`;
        raceData.traits.forEach(trait => {
          traitsHtml += `<li><strong>${trait.name}:</strong> ${trait.description || ""}</li>`;
        });
        traitsHtml += `</ul>`;
      }

      // Tables (rawEntries)
      const tablesHtml = renderTables(raceData.rawEntries);
      traitsHtml += tablesHtml;

      // Spellcasting – render choices in the dedicated container
      handleSpellcasting(raceData, "spellSelectionContainer");

      // Languages (display fixed languages; extra languages are chosen in the popup)
      let languageHtml = "";
      if (raceData.languages && Array.isArray(raceData.languages.fixed) && raceData.languages.fixed.length > 0) {
        languageHtml = `<p><strong>Lingue Concesse:</strong> ${raceData.languages.fixed.join(", ")}</p>`;
      } else {
        languageHtml = `<p><strong>Lingue Concesse:</strong> Nessuna</p>`;
      }
      traitsHtml += languageHtml;

      if (raceTraitsDiv) {
        raceTraitsDiv.innerHTML = traitsHtml;
        raceTraitsDiv.style.display = "block";  // 🔥 FORZA IL RENDERING
        console.log("✅ Tratti della razza aggiornati con successo!");
      } else {
        console.error("❌ ERRORE: Il div dei tratti della razza non è stato trovato!");
      }
      // Extras: Skills, Tools, Variant Features, Ancestry.
      handleExtraSkills(raceData, "skillSelectionContainer");
      handleExtraTools(raceData, "toolSelectionContainer");
      handleVariantFeatureChoices(raceData);
      handleExtraAncestry(raceData, "ancestrySelection");

      // Selezioni extra già fatte nel pop-up (modalità view-only)
      updateExtraSelectionsView();

      resetRacialBonuses();
      window.currentRaceData = raceData;
    })
    .catch(error => handleError(`Errore caricando i tratti della razza: ${error}`));
}

// ==================== UPDATE SUBCLASSES (STEP 5) ====================
function updateSubclasses() {
  const classPath = document.getElementById("classSelect").value;
  const subclassSelect = document.getElementById("subclassSelect");
  const featuresDiv = document.getElementById("classFeatures");
  if (!classPath) {
    subclassSelect.innerHTML = `<option value="">Nessuna sottoclasse disponibile</option>`;
    subclassSelect.style.display = "none";
    window.currentClassData = null;
    if (featuresDiv) featuresDiv.innerHTML = `<p>Seleziona una classe per vedere i tratti.</p>`;
    return;
  }
  fetch(classPath)
    .then(response => response.json())
    .then(data => {
      window.currentClassData = data;
      subclassSelect.innerHTML = `<option value="">Seleziona una sottoclasse</option>`;
      data.subclasses.forEach(subclass => {
        const option = document.createElement("option");
        option.value = subclass.name;
        option.textContent = subclass.name;
        subclassSelect.appendChild(option);
      });
      subclassSelect.style.display = data.subclasses.length > 0 ? "block" : "none";
      renderClassFeatures();
    })
    .catch(error => handleError(`Errore caricando le sottoclasse: ${error}`));
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
  const featuresDiv = document.getElementById("classFeatures");
  const subclassSelect = document.getElementById("subclassSelect");
  const data = window.currentClassData;
  if (!featuresDiv) return;
  if (!data) {
    featuresDiv.innerHTML = `<p>Seleziona una classe per vedere i tratti.</p>`;
    return;
  }
  const charLevel = parseInt(document.getElementById("levelSelect")?.value) || 1;
  const subclassName = subclassSelect.value;
  let html = `<h3>${data.name}</h3>`;
  if (data.description) {
    html += `<p>${data.description}</p>`;
  }

  if (data.hit_die) {
    html += `<p><strong>Hit Die:</strong> ${data.hit_die}</p>`;
  }
  if (data.hp_at_1st_level) {
    html += `<p><strong>Hit Points at 1st Level:</strong> ${data.hp_at_1st_level}</p>`;
  }
  if (data.hp_at_higher_levels) {
    html += `<p><strong>Hit Points at Higher Levels:</strong> ${data.hp_at_higher_levels}</p>`;
  }
  if (data.saving_throws) {
    html += `<p><strong>Saving Throw Proficiencies:</strong> ${data.saving_throws.join(", ")}</p>`;
  }
  if (data.weapon_proficiencies) {
    html += `<p><strong>Weapon Proficiencies:</strong> ${data.weapon_proficiencies.join(", ")}</p>`;
  }
  if (data.tool_proficiencies) {
    html += `<p><strong>Tool Proficiencies:</strong> ${data.tool_proficiencies.join(", ")}</p>`;
  }
  if (data.armor_proficiencies) {
    html += `<p><strong>Armor Training:</strong> ${data.armor_proficiencies.join(", ")}</p>`;
  }
  if (data.skill_proficiencies && data.skill_proficiencies.choose) {
    html += `<p><strong>Skill Proficiencies:</strong> Choose ${data.skill_proficiencies.choose} from ${data.skill_proficiencies.options.join(", ")}</p>`;
  }
  if (data.starting_equipment) {
    let equipText = "";
    if (Array.isArray(data.starting_equipment.fixed) && data.starting_equipment.fixed.length > 0) {
      equipText += data.starting_equipment.fixed.join(", ");
    }
    if (Array.isArray(data.starting_equipment.choices)) {
      data.starting_equipment.choices.forEach(choice => {
        equipText += `; ${choice[0]} or ${choice[1]}`;
      });
    }
    if (data.starting_equipment.gold_alternative) {
      equipText += `; or ${data.starting_equipment.gold_alternative} to buy equipment`;
    }
    html += `<p><strong>Starting Equipment:</strong> ${equipText.replace(/^; /, "")}</p>`;
  }
  if (data.multiclassing && data.multiclassing.prerequisites) {
    const prereqs = Object.entries(data.multiclassing.prerequisites)
      .map(([ability, score]) => `${ability} ${score}`)
      .join(", ");
    html += `<p><strong>Multiclassing Prerequisite:</strong> ${prereqs}</p>`;
  }

  // Fetch subclass data first if one is selected
  let subData = null;
  if (subclassName) {
    try {
      const file = getSubclassFilename(subclassName);
      const resp = await fetch(`data/subclasses/${file}`);
      subData = await resp.json();
      if (subData.description) {
        html += `<p>${subData.description}</p>`;
      }
    } catch (err) {
      html += `<p>Dettagli della sottoclasse non disponibili.</p>`;
    }
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
      html += `<h4>Livello ${lvl}</h4><ul>`;
      mergedFeatures[lvl].forEach(f => {
        if (typeof f === "string") {
          html += `<li>${f}</li>`;
        } else {
          const desc = f.description ? `: ${f.description}` : "";
          html += `<li><strong>${f.name}</strong>${desc}</li>`;
        }
      });
      html += `</ul>`;
    }
  });

  const allChoices = [...(data.choices || []), ...(subData?.choices || [])];
  const selections = gatherExtraSelections({ choices: allChoices }, "class", charLevel);

  if (!subclassName) {
    html += `<p>Seleziona una sottoclasse per vedere i tratti.</p>`;
  }
  featuresDiv.innerHTML = html;
  return selections;
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
  const character = {
    name: document.getElementById("characterName").value || "Senza Nome",
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
      selected: selectedData["Languages"] || []
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
  ["str", "dex", "con", "int", "wis", "cha"].forEach(ability => {
    const base = parseInt(document.getElementById(`${ability}Points`).textContent);
    const raceMod = parseInt(document.getElementById(`${ability}RaceModifier`).textContent);
    const finalScore = base + raceMod;
    const finalScoreElement = document.getElementById(`${ability}FinalScore`);
    finalScoreElement.textContent = finalScore;
    finalScoreElement.style.color = finalScore > 18 ? "red" : "";
  });
  console.log("🔄 Punteggi Finali aggiornati!");
}

function initializeValues() {
  const abilities = ["str", "dex", "con", "int", "wis", "cha"];
  abilities.forEach(ability => {
    const raceModEl = document.getElementById(ability + "RaceModifier");
    if (raceModEl) raceModEl.textContent = "0";
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
  loadFeats,
  handleExtraLanguages,
  handleExtraSkills,
  handleExtraTools,
  handleExtraAncestry,
  gatherExtraSelections,
  updateSubclasses,
  renderClassFeatures,
  openExtrasModal,
  displayRaceTraits,
  generateFinalJson,
  initializeValues
};

