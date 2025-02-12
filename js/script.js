function showStep(stepId) {
  const steps = document.querySelectorAll(".step");
  steps.forEach(step => {
    if (step.id === stepId) {
      step.classList.add("active");
    } else {
      step.classList.remove("active");
    }
  });
}

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
    
        // 🔥 FIX: Se è un mezzelfo Moon/Sun, aggiungi la scelta al pop-up
        if (selectedVariant.includes("Cantrip") && selectedVariant.toLowerCase().includes("half-elf")) {
          extraSelections.push({
            name: "Spellcasting",
            description: "Scegli un Cantrip dal Wizard Spell List.",
            selection: filtered.map(spell => spell.name),
            count: 1
          });
          return;
        }
    
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
  
  // Se il Mezzelfo ha una Variant Feature, spostiamola nel pop-up
 if (data.variant_feature_choices && data.variant_feature_choices.length > 0) {
    console.log(`📌 Trovata Variant Feature per ${data.name}:`, data.variant_feature_choices);
    
    if (data.name.toLowerCase().includes("half-elf")) {
        extraSelections.push({
            name: "Variant Feature",
            description: "Scegli una Variant Feature.",
            selection: data.variant_feature_choices.map(v => v.name),
            count: 1
        });

        // 🔥 Apri il pop-up automaticamente dopo aver aggiunto la Variant Feature
        setTimeout(() => {
            openRaceExtrasModal(extraSelections);
        }, 200);
    }
}

// 📌 **Corretto: questa parte deve essere sempre eseguita per tutte le razze, non solo il Mezzelfo!**
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

async function fetchData(jsonPath) {
    try {
        const response = await fetch(jsonPath);
        if (!response.ok) throw new Error(`Errore caricando ${jsonPath}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`❌ ${error.message}`);
        alert(`⚠️ Errore nel caricamento dei dati. Riprova!`);
        return null;
    }
}
// ==================== FUNZIONI SPELLCASTING ====================
function loadSpells(callback) {
  fetch("data/spells.json")
    .then(response => response.json())
    .then(data => {
      console.log("📖 Incantesimi caricati:", data);
      callback(data);
    })
    .catch(error => console.error("❌ Errore nel caricamento degli incantesimi:", error));
}

/**
 * Handles standard spellcasting options.
 * Supports two modes:
 * - fixed_list: a fixed dropdown.
 * - filter: groups spells by level and includes a dropdown for the casting ability.
 * Injects the markup into the container with the given ID.
 */
function handleSpellcasting(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ""; // Pulisce il contenuto precedente

    if (data.spellcasting) {
        console.log(`🔍 JSON Spellcasting per ${data.name}:`, data.spellcasting);

        // ✅ Caso 1: Incantesimi fissi (es. Drow Magic)
        if (data.spellcasting.fixed_spell) {
            container.innerHTML += `<p><strong>✨ Incantesimo assegnato:</strong> ${data.spellcasting.fixed_spell}</p>`;
        }

        // ✅ Caso 2: Scelta di incantesimi
        if (data.spellcasting.spell_choices) {
            if (data.spellcasting.spell_choices.type === "fixed_list") {
                const options = data.spellcasting.spell_choices.options
                    .map(spell => `<option value="${spell}">${spell}</option>`)
                    .join("");

                container.innerHTML += `
                    <p><strong>🔮 Scegli un incantesimo:</strong></p>
                    <select id="spellSelection">
                        <option value="">Seleziona...</option>${options}
                    </select>`;
            } 
            else if (data.spellcasting.spell_choices.type === "filter") {
                const filterParts = data.spellcasting.spell_choices.filter.split("|");
                const spellLevel = filterParts.find(part => part.startsWith("level="))?.split("=")[1];
                const spellClass = filterParts.find(part => part.startsWith("class="))?.split("=")[1];

                if (spellLevel && spellClass) {
                    loadSpells(spellList => {
                        const filteredSpells = spellList
                            .filter(spell => parseInt(spell.level) === parseInt(spellLevel) && spell.spell_list.includes(spellClass))
                            .map(spell => `<option value="${spell.name}">${spell.name}</option>`)
                            .join("");

                        if (filteredSpells) {
                            container.innerHTML += `
                                <p><strong>🔮 Scegli un Cantrip da ${spellClass}:</strong></p>
                                <select id="spellSelection">
                                    <option value="">Seleziona...</option>${filteredSpells}
                                </select>`;
                        } else {
                            container.innerHTML += `<p><strong>⚠️ Nessun Cantrip disponibile per ${spellClass}.</strong></p>`;
                        }
                    });
                } else {
                    container.innerHTML += `<p><strong>⚠️ Errore: Il filtro incantesimi non è valido per questa razza.</strong></p>`;
                }
            }
        }

        // ✅ Caso 3: **Scelta dell'abilità di lancio**
        if (data.spellcasting.ability_choices && Array.isArray(data.spellcasting.ability_choices)) {
          console.log(`🧙‍♂️ Verifica dell'abilità di lancio per ${data.name}:`, data.spellcasting.ability_choices);
      
          // 🔹 Se l'Alto Elfo ha solo una scelta (INT), saltiamo la creazione del dropdown
          if (data.name.toLowerCase().includes("elf (high)") && 
              data.spellcasting.ability_choices.length === 1 && 
              typeof data.spellcasting.ability_choices[0] === "string") {
              
              console.log(`🧠 ${data.name} usa sempre ${data.spellcasting.ability_choices[0]} come abilità di lancio. Nessun dropdown mostrato.`);
              return;
          }
      
          // 🔹 Se ci sono più opzioni, mostra il dropdown
          if (data.spellcasting.ability_choices.length > 1) {
              const abilityOptions = data.spellcasting.ability_choices
                  .map(a => `<option value="${a.toUpperCase()}">${a.toUpperCase()}</option>`)
                  .join("");
      
              container.innerHTML += `
                  <p><strong>🧠 Seleziona l'abilità di lancio:</strong></p>
                  <select id="castingAbility">
                      <option value="">Seleziona...</option>${abilityOptions}
                  </select>`;
          }
      }
    }
}

// ==================== EXTRAS: LANGUAGES, SKILLS, TOOLS, ANCESTRY ====================
function loadLanguages(callback) {
  fetch("data/languages.json")
    .then(response => response.json())
    .then(data => {
      if (data.languages) {
        callback(data.languages);
      } else {
        handleError("Nessuna lingua trovata nel file JSON.");
      }
    })
    .catch(error => handleError(`Errore caricando le lingue: ${error}`));
}

function handleExtraLanguages(data, containerId) {
  if (data.languages && data.languages.choice > 0) {
    fetchData("data/languages.json").then(langs => {
      if (langs) {
        const availableLangs = langs.filter(lang => !data.languages.fixed.includes(lang));
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = `<h4>Lingue Extra</h4><select id="extraLanguageDropdown"></select>`;
          populateDropdown("extraLanguageDropdown", availableLangs, "Seleziona una lingua");
        }
      }
    });
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

// ==================== COMMON UTILITY FUNCTIONS ====================
function extractSpellName(data) {
  if (Array.isArray(data)) {
    if (typeof data[0] === "string") {
      return data[0].split("#")[0];
    }
  } else if (typeof data === "object") {
    for (let key in data) {
      const result = extractSpellName(data[key]);
      if (result) return result;
    }
  }
  return null;
}

function filterSpells(spells, filterString) {
  const conditions = filterString.split("|");
  return spells.filter(spell => {
    let valid = true;
    conditions.forEach(cond => {
      const parts = cond.split("=");
      if (parts.length === 2) {
        const key = parts[0].trim().toLowerCase();
        const value = parts[1].trim().toLowerCase();
        if (key === "level") {
          if (parseInt(spell.level) !== parseInt(value)) valid = false;
        } else if (key === "class") {
          if (!spell.spell_list || !spell.spell_list.map(x => x.toLowerCase()).includes(value)) valid = false;
        }
      }
    });
    return valid;
  });
}

function handleError(message) {
  console.error("❌ " + message);
  alert("⚠️ " + message);
}

function loadDropdownData(jsonPath, selectId, key) {
  fetch(jsonPath)
    .then(response => response.json())
    .then(data => {
      console.log(`📜 Dati ricevuti da ${jsonPath}:`, data);
      if (!data[key]) {
        handleError(`Chiave ${key} non trovata in ${jsonPath}`);
        return;
      }
      const options = Object.keys(data[key]).map(name => ({
        name: name,
        path: data[key][name]
      }));
      populateDropdown(selectId, options);
    })
    .catch(error => {
      console.error(`❌ Errore caricando ${jsonPath}:`, error);
      alert(`⚠️ Errore di connessione nel caricamento di ${jsonPath}. Riprova!`);
    });
}

function populateDropdown(selectId, options, defaultText = "Seleziona...") {
  const select = document.getElementById(selectId);
  if (!select) {
    console.warn(`⚠️ Dropdown #${selectId} non trovato.`);
    return;
  }

  select.innerHTML = `<option value="">${defaultText}</option>`;
  options.forEach(option => {
    const opt = document.createElement("option");
    opt.value = option.path || option.value || option;
    opt.textContent = option.name || option;
    select.appendChild(opt);
  });

  console.log(`✅ Dropdown #${selectId} popolato con successo.`);
}

// ==================== RACE DATA CONVERSION ====================
function convertRaceData(rawData) {
  // Size
  let size = "Unknown";
  if (Array.isArray(rawData.size)) {
    size = (rawData.size[0] === "M") ? "Medium" : (rawData.size[0] === "S") ? "Small" : rawData.size[0];
  } else {
    size = rawData.size || "Unknown";
  }

  // Speed
  let speed = {};
  if (rawData.speed) {
    if (typeof rawData.speed === "object") {
      for (let key in rawData.speed) {
        speed[key] = (typeof rawData.speed[key] === "boolean")
          ? (key === "fly" ? "equal to your walking speed" : "unknown")
          : rawData.speed[key];
      }
    } else {
      speed = rawData.speed;
    }
  }

  // Senses
  let senses = {};
  if (rawData.senses && typeof rawData.senses === "object") {
    senses = rawData.senses;
  } else if (rawData.darkvision) {
    senses.darkvision = rawData.darkvision;
  }

  // Ability Bonus
  let ability_bonus = { options: [] };
  if (rawData.ability && Array.isArray(rawData.ability)) {
    rawData.ability.forEach(ability => {
      if (ability.choose && ability.choose.weighted) {
        const weights = ability.choose.weighted.weights;
        if (weights.length === 2 && weights.includes(2)) {
          ability_bonus.options.push({ type: "fixed", values: { any: 2, any_other: 1 } });
        } else if (weights.length === 3) {
          ability_bonus.options.push({ type: "three", values: { any: 1, any_other: 1, any_other_2: 1 } });
        }
      }
    });
  }

  // Variant Feature and Traits
  let variant_feature_choices = null;
  let traits = [];
  const rawEntries = rawData.entries || [];
  rawEntries.forEach(entry => {
    if (entry.type === "inset" && entry.name && entry.name.toLowerCase().includes("variant feature")) {
      let variantText = "";
      if (Array.isArray(entry.entries)) {
        variantText = entry.entries.map(opt => {
          let optDesc = Array.isArray(opt.entries) ? opt.entries.join(" ") : opt.entries;
          return `${opt.name}: ${optDesc}`;
        }).join(" | ");
      }
      traits.push({
        name: entry.name,
        description: variantText,
        level_requirement: 1
      });
      if (variant_feature_choices === null && Array.isArray(entry.entries)) {
        variant_feature_choices = entry.entries.map(opt => ({
          name: opt.name,
          description: Array.isArray(opt.entries) ? opt.entries.join(" ") : opt.entries
        }));
      }
      return;
    }
    if (entry.entries && Array.isArray(entry.entries) && entry.entries.some(e => typeof e === "object" && e.type === "table")) {
      traits.push(entry);
    } else if (entry.name && entry.entries) {
      const description = Array.isArray(entry.entries) ? entry.entries.join(" ") : entry.entries;
      traits.push({
        name: entry.name,
        description: description,
        level_requirement: 1
      });
    }
  });

  // Spellcasting – complete processing
  let spellcasting = null;
  
  if (rawData.additionalSpells && rawData.additionalSpells.length > 0) {
      let spellsArray = [];
      let abilityChoices = [];
  
      rawData.additionalSpells.forEach(spellData => {
          if (spellData.known) {
              Object.keys(spellData.known).forEach(levelKey => {
                  if (spellData.known[levelKey]._ && Array.isArray(spellData.known[levelKey]._)) {
                      spellData.known[levelKey]._.forEach(spell => {
                          if (typeof spell === "string") {
                              spellsArray.push({ name: spell, level: parseInt(levelKey) });
                          } else if (spell.choose) {
                              spellcasting = spellcasting || {};  
                              spellcasting.spell_choices = { type: "filter", filter: spell.choose };
                          }
                      });
                  }
              });
          }
  
          // 📌 FIX: Assicura che l'Alto Elfo non abbia un dropdown per l'abilità di lancio
          if (spellData.ability) {
              if (typeof spellData.ability === "string") { 
                  abilityChoices.push(spellData.ability.toUpperCase()); 
              } else if (spellData.ability.choose && Array.isArray(spellData.ability.choose)) {
                  abilityChoices = spellData.ability.choose.map(a => a.toUpperCase());
              }
          }
          
          // 🔥 Se il Deep Gnome ha una scelta multipla, aggiungila nel pop-up
          if (abilityChoices.length > 1 && rawData.name.toLowerCase().includes("deep gnome")) {
              console.log("🧠 Deep Gnome: aggiunta selezione per Spellcasting Ability nel pop-up.");
              extraSelections.push({
                  name: "Spellcasting Ability",
                  description: "Choose Intelligence, Wisdom, or Charisma as your spellcasting ability for your racial spells.",
                  selection: abilityChoices,
                  count: 1
              });
          }
      });
  
      if (spellsArray.length > 0) {
          spellcasting = spellcasting || {};  
          spellcasting.spell_choices = {
              type: "fixed_list",
              options: spellsArray.map(s => s.name)
          };
      }
  
      spellcasting = spellcasting || {};  
  
      // 🔹 FIX: Se l'Alto Elfo ha solo INT come abilità di lancio, non deve avere un dropdown
      if (abilityChoices.length === 1 && abilityChoices[0] === "INT" && rawData.name.toLowerCase().includes("elf (high)")) {
          console.log(`🧠 ${rawData.name} ha solo INT come abilità di lancio. Nessun dropdown.`);
          spellcasting.ability_choices = [];
      } else {
          spellcasting.ability_choices = abilityChoices;
      }
  }
  // Languages
  let languages = { fixed: [], choice: 0, options: [] };
  if (rawData.languageProficiencies && rawData.languageProficiencies.length > 0) {
    const lp = rawData.languageProficiencies[0];
    for (let lang in lp) {
      if (lp[lang] === true) {
        languages.fixed.push(lang.charAt(0).toUpperCase() + lang.slice(1));
      } else if (typeof lp[lang] === "number") {
        languages.choice = lp[lang];
      }
    }
    if (languages.choice > 0 && languages.options.length === 0) {
      languages.options.push("Any other language you and your DM agree is appropriate");
    }
  }

  // Skill Choices
  let skill_choices = null;
  if (rawData.skillProficiencies && rawData.skillProficiencies.length > 0) {
    const sp = rawData.skillProficiencies[0].choose;
    if (sp && sp.from) {
      const count = sp.count ? sp.count : 1;
      skill_choices = { number: count, options: sp.from };
    }
  }

  // Tool Choices
  let tool_choices = null;
  if (rawData.toolProficiencies && Array.isArray(rawData.toolProficiencies)) {
    rawData.toolProficiencies.forEach(tp => {
      if (tp.choose && tp.choose.from) {
        tool_choices = { number: 1, options: tp.choose.from };
      }
    });
  }

  // ✅ Ritorno finale corretto
  return {
    name: rawData.name,
    source: rawData.source + (rawData.page ? `, page ${rawData.page}` : ""),
    size: size,
    speed: speed,
    senses: senses,
    ability_bonus: ability_bonus,
    traits: traits,
    rawEntries: rawEntries,
    spellcasting: spellcasting,
    languages: languages,
    skill_choices: skill_choices,
    tool_choices: tool_choices,
    variant_feature_choices: variant_feature_choices
  };
  console.log(`📊 Controllo spellcasting per ${rawData.name}`);
  console.log(`✅ additionalSpells:`, rawData.additionalSpells);
  console.log(`✅ ability_choices:`, rawData.spellcasting ? rawData.spellcasting.ability_choices : "Nessuna");
}

// ==================== RENDERING DI TABELLE ====================
function renderTables(entries) {
  let html = "";
  if (!entries || !Array.isArray(entries)) return html;
  entries.forEach(entry => {
    if (entry.entries && Array.isArray(entry.entries)) {
      entry.entries.forEach(subEntry => {
        if (typeof subEntry === "object" && subEntry.type === "table") {
          html += `<div class="table-container" style="margin-top:1em; margin-bottom:1em;">`;
          if (subEntry.caption) {
            html += `<p><strong>${subEntry.caption}</strong></p>`;
          }
          html += `<table border="1" style="width:100%; border-collapse: collapse;">`;
          if (subEntry.colLabels && Array.isArray(subEntry.colLabels)) {
            html += `<thead><tr>`;
            subEntry.colLabels.forEach(label => {
              html += `<th style="padding: 0.5em; text-align: center;">${label}</th>`;
            });
            html += `</tr></thead>`;
          }
          if (subEntry.rows && Array.isArray(subEntry.rows)) {
            html += `<tbody>`;
            subEntry.rows.forEach(row => {
              html += `<tr>`;
              row.forEach(cell => {
                html += `<td style="padding: 0.5em; text-align: center;">${cell}</td>`;
              });
              html += `</tr>`;
            });
            html += `</tbody>`;
          }
          html += `</table>`;
          if (entry.name && entry.name.toLowerCase().includes("ancestry")) {
            let optsHtml = `<option value="">Seleziona...</option>`;
            subEntry.rows.forEach(row => {
              const optVal = JSON.stringify(row);
              const optLabel = `${row[0]} (${row[1]})`;
              optsHtml += `<option value='${optVal}'>${optLabel}</option>`;
            });
            html += `<p><strong>Seleziona Ancestry:</strong>
                      <select id="ancestrySelect">${optsHtml}</select>
                     </p>`;
          }
          html += `</div>`;
        }
      });
    }
  });
  return html;
}

// ==================== POPUP FOR EXTRA SELECTIONS ====================

// Global variables for the extra selections popup
let selectedData = sessionStorage.getItem("selectedData")
  ? JSON.parse(sessionStorage.getItem("selectedData"))
  : {};
let extraSelections = [];
let currentSelectionIndex = 0;

/**
 * Opens the extra selections popup.
 * Hides the background extra traits container and shows the modal.
 */
function openRaceExtrasModal(selections) {
  if (!selections || selections.length === 0) {
    console.warn("⚠️ Nessuna selezione extra disponibile, il pop-up non verrà mostrato.");
    return;
  }
  extraSelections = selections;
  currentSelectionIndex = 0;
  showExtraSelection();

  if (!sessionStorage.getItem("popupOpened")) {
    sessionStorage.setItem("popupOpened", "true");
  }

  // Inizializza le categorie in selectedData se non esistono già
  selections.forEach(selection => {
    if (!selectedData[selection.name]) {
      selectedData[selection.name] = [];
    }
  });

  extraSelections = selections;
  currentSelectionIndex = 0;
  showExtraSelection();

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
      if (selectedData[dataKey] && selectedData[dataKey].length > 0) {
        container.innerHTML = `<p><strong>${title}:</strong> ${selectedData[dataKey].join(", ")}</p>`;
        container.style.display = "block";  
      } else {
        container.innerHTML = `<p><strong>${title}:</strong> Nessuna selezione.</p>`;
        container.style.display = "block";  
      }
    }
  }

  updateContainer("languageSelection", "Lingue Extra", "Languages");
  updateContainer("skillSelectionContainer", "Skill Proficiency", "Skill Proficiency");
  updateContainer("toolSelectionContainer", "Tool Proficiency", "Tool Proficiency");
  updateContainer("spellSelectionContainer", "Spellcasting", "Spellcasting");

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
  descElem.innerText = currentSelection.description;
  selectionElem.innerHTML = ""; // Pulisce il contenuto precedente

  if (currentSelection.selection) {
    const selectedValues = new Set(selectedData[currentSelection.name] || []);
    let dropdownHTML = "";

    for (let i = 0; i < currentSelection.count; i++) {
      dropdownHTML += `<select class="extra-selection" data-category="${currentSelection.name}" data-index="${i}">
                          <option value="">Seleziona...</option>`;
      currentSelection.selection.forEach(option => {
        const disabled = selectedValues.has(option) && !selectedData[currentSelection.name]?.includes(option);
        dropdownHTML += `<option value="${option}" ${disabled ? "disabled" : ""}>${option}</option>`;
      });
      dropdownHTML += `</select><br>`;
    }

    selectionElem.innerHTML = dropdownHTML;

    document.querySelectorAll(".extra-selection").forEach(select => {
      select.addEventListener("change", (event) => {
        const category = event.target.getAttribute("data-category");
        const index = event.target.getAttribute("data-index");
    
        if (!selectedData[category]) {
          selectedData[category] = [];
        }
    
        selectedData[category][index] = event.target.value;
    
        // 🔥 Rimuove elementi vuoti
        selectedData[category] = selectedData[category].filter(value => value);
    
        console.log(`📝 Salvato: ${category} -> ${selectedData[category]}`);
    
        updateExtraSelectionsView();
    
        // 🔥 Disabilita opzioni già selezionate
        document.querySelectorAll(".extra-selection").forEach(select => {
          Array.from(select.options).forEach(option => {
            option.disabled = selectedData[category].includes(option.value) && option.value !== select.value;
          });
        });
    
        // 🔥 Controlla se tutte le selezioni sono state fatte e mostra il pulsante "Chiudi"
        const allChoicesFilled = extraSelections.every(sel => 
            selectedData[sel.name] && selectedData[sel.name].length === sel.count
        );
    
        const closeBtn = document.getElementById("closeModal");
        closeBtn.style.display = (currentSelectionIndex === extraSelections.length - 1 && allChoicesFilled) ? "inline-block" : "none";
      });
    });
  }

  document.getElementById("prevTrait").disabled = (currentSelectionIndex === 0);
  document.getElementById("nextTrait").disabled = (currentSelectionIndex === extraSelections.length - 1);
  const closeBtn = document.getElementById("closeModal");
const allChoicesFilled = extraSelections.every(sel => 
    selectedData[sel.name] && selectedData[sel.name].length === sel.count
);

// Mostra il pulsante "Chiudi" solo dopo l'ultimo step e se tutte le selezioni sono state fatte
if (currentSelectionIndex === extraSelections.length - 1 && allChoicesFilled) {
    closeBtn.style.display = "inline-block";
} else {
    closeBtn.style.display = "none";
}
}

  // Enable/disable navigation buttons and manage the Close button visibility.
  const prevBtn = document.getElementById("prevTrait");
  const nextBtn = document.getElementById("nextTrait");
  // Mostra il pulsante "Chiudi" solo dopo l'ultimo step e se tutte le selezioni sono fatte
  const closeBtn = document.getElementById("closeModal");
  const allChoicesFilled = extraSelections.every(sel => 
    selectedData[sel.name] && selectedData[sel.name].length === sel.count
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

  // ✅ Salviamo le selezioni extra PRIMA di ricaricare i tratti
  sessionStorage.setItem("selectedData", JSON.stringify(selectedData));
  console.log("📝 Selezioni salvate prima dell'update:", selectedData);

  showStep("step2");

  setTimeout(() => {
    console.log("🛠 Eseguo displayRaceTraits()...");
    displayRaceTraits(); 

    triggerRaceExtrasModal();
    });
});

  // Aggiorna l'interfaccia con le scelte fatte
  if (selectedData["Languages"]) {
    document.getElementById("languageSelection").innerHTML = `<p><strong>Lingue Extra:</strong> ${selectedData["Languages"].join(", ")}</p>`;
  }
  if (selectedData["Skill Proficiency"]) {
    document.getElementById("skillSelectionContainer").innerHTML = `<p><strong>Skill Proficiency:</strong> ${selectedData["Skill Proficiency"].join(", ")}</p>`;
  }
  if (selectedData["Tool Proficiency"]) {
    document.getElementById("toolSelectionContainer").innerHTML = `<p><strong>Tool Proficiency:</strong> ${selectedData["Tool Proficiency"].join(", ")}</p>`;
  }
  if (selectedData["Spellcasting"]) {
    document.getElementById("spellSelectionContainer").innerHTML = `<p><strong>Spellcasting:</strong> ${selectedData["Spellcasting"].join(", ")}</p>`;
  }

document.getElementById("raceSelect").addEventListener("change", () => {
  console.log("🔄 Razza cambiata, reset delle selezioni extra...");
  selectedData = {}; // Reset delle selezioni extra
  extraSelections = []; // 🔥 Reset completo del pop-up
  document.getElementById("languageSelection").innerHTML = "";
  document.getElementById("skillSelectionContainer").innerHTML = "";
  document.getElementById("toolSelectionContainer").innerHTML = "";
  document.getElementById("spellSelectionContainer").innerHTML = "";

  displayRaceTraits(); // Ricarica i tratti della nuova razza
  document.getElementById("confirmRaceSelection").style.display = "inline-block";
});

function addExtraSelection(name, description, selection, count = 1) {
    extraSelections.push({ name, description, selection, count });
}

function triggerRaceExtrasModal() {
    if (extraSelections.length > 0) {
        setTimeout(() => {
            console.log("🔄 Apertura del pop-up per extra selezioni:", extraSelections);
            openRaceExtrasModal(extraSelections);
        }, 200);
    }
}
  function addExtraSelection(name, description, selection, count = 1) {
    if (selection && selection.length > 0) {
        extraSelections.push({ name, description, selection, count });
    }
}

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

      // Spellcasting – handle both standard and extra.
      handleSpellcasting(raceData, traitsHtml);

      // Languages (display fixed languages; extra languages are chosen in the popup)
      let languageHtml = "";
      if (raceData.languages && Array.isArray(raceData.languages.fixed) && raceData.languages.fixed.length > 0) {
        languageHtml = `<p><strong>Lingue Concesse:</strong> ${raceData.languages.fixed.join(", ")}</p>`;
      } else {
        languageHtml = `<p><strong>Lingue Concesse:</strong> Nessuna</p>`;
      }

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

    if (!classPath) {
        subclassSelect.innerHTML = `<option value="">Nessuna sottoclasse disponibile</option>`;
        subclassSelect.style.display = "none";
        return;
    }

    fetchData(classPath).then(data => {
        if (data && data.subclasses) {
            const subclasses = data.subclasses.map(sub => ({ name: sub.name, value: sub.name }));
            populateDropdown("subclassSelect", subclasses, "Seleziona una sottoclasse");
            subclassSelect.style.display = subclasses.length > 0 ? "block" : "none";
        } else {
            subclassSelect.innerHTML = `<option value="">Nessuna sottoclasse disponibile</option>`;
            subclassSelect.style.display = "none";
        }
    }).catch(error => handleError(`Errore caricando le sottoclassi: ${error}`));
}

function updateClassSkills() {
    const classPath = document.getElementById("classSelect").value;
    const skillContainer = document.getElementById("classSkillSelectionContainer");

    if (!classPath) {
        skillContainer.innerHTML = "";
        return;
    }

    fetchData(classPath).then(data => {
        if (data && data.skill_choices) {
            skillContainer.innerHTML = `<h4>Seleziona ${data.skill_choices.number} competenze:</h4>`;

            for (let i = 0; i < data.skill_choices.number; i++) {
                skillContainer.innerHTML += `
                    <select class="classSkillChoice">
                        <option value="">Seleziona...</option>
                        ${data.skill_choices.options.map(skill => `<option value="${skill}">${skill}</option>`).join("")}
                    </select>
                    <br>
                `;
            }
        } else {
            skillContainer.innerHTML = "";
        }
    }).catch(error => handleError(`Errore caricando le competenze della classe: ${error}`));
}
  function updateClassTools() {
    const classPath = document.getElementById("classSelect").value;
    const toolContainer = document.getElementById("classToolSelectionContainer");

    if (!classPath) {
        toolContainer.innerHTML = "";
        return;
    }

    fetchData(classPath).then(data => {
        if (data && data.tool_choices) {
            toolContainer.innerHTML = `<h4>Seleziona uno strumento:</h4>`;
            toolContainer.innerHTML += `
                <select id="classToolChoice">
                    <option value="">Seleziona...</option>
                    ${data.tool_choices.options.map(tool => `<option value="${tool}">${tool}</option>`).join("")}
                </select>
            `;
        } else {
            toolContainer.innerHTML = "";
        }
    }).catch(error => handleError(`Errore caricando gli strumenti della classe: ${error}`));
}
  const spellcastingClassMapping = {
    "Wizard": { type: "prepared", ability: "INT", maxSpells: 0 },
    "Cleric": { type: "prepared", ability: "WIS", maxSpells: 0 },
    "Druid": { type: "prepared", ability: "WIS", maxSpells: 0 },
    "Sorcerer": { type: "known", ability: "CHA", maxSpells: 2 },
    "Bard": { type: "known", ability: "CHA", maxSpells: 2 },
    "Warlock": { type: "known", ability: "CHA", maxSpells: 2 }
};

  function updateClassSpells() {
    const classPath = document.getElementById("classSelect").value;
    const spellContainer = document.getElementById("classSpellSelectionContainer");
    const characterLevel = parseInt(document.getElementById("levelSelect").value) || 1;

    if (!classPath || !spellcastingClassMapping[classPath]) {
        spellContainer.innerHTML = "";
        return;
    }

    const spellcastingInfo = spellcastingClassMapping[classPath];
    spellContainer.innerHTML = `<h4>Seleziona gli incantesimi per ${classPath}</h4>`;

    fetchData("data/spells.json").then(spellData => {
        const availableSpells = spellData
            .filter(spell => spell.spell_list.includes(classPath) && spell.level <= characterLevel);

        if (spellcastingInfo.type === "prepared") {
            spellContainer.innerHTML += `<p>Seleziona gli incantesimi che vuoi preparare:</p>`;
        } else if (spellcastingInfo.type === "known") {
            spellContainer.innerHTML += `<p>Puoi conoscere fino a ${spellcastingInfo.maxSpells} incantesimi.</p>`;
        }

        for (let i = 0; i < spellcastingInfo.maxSpells; i++) {
            const select = document.createElement("select");
            select.classList.add("classSpellChoice");
            select.innerHTML = `<option value="">Seleziona...</option>` +
                availableSpells.map(spell => `<option value="${spell.name}">${spell.name} (Lv. ${spell.level})</option>`).join("");
            spellContainer.appendChild(select);
            spellContainer.appendChild(document.createElement("br"));
        }
    }).catch(error => handleError(`Errore caricando gli incantesimi: ${error}`));
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
  const selectedSpells = Array.from(document.querySelectorAll(".classSpellChoice"))
    .map(select => select.value)
    .filter(spell => spell !== "");

  const character = {
        name: document.getElementById("characterName").value || "Senza Nome",
        level: document.getElementById("levelSelect").value || "1",
        race: document.getElementById("raceSelect").selectedOptions[0]?.text || "Nessuna",
        class: document.getElementById("classSelect").selectedOptions[0]?.text || "Nessuna",
        spells: characterSpells,  // ✅ Corretto qui!
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
        languages: {
            selected: document.getElementById("languageSelection").innerText.replace("Lingue Extra:", "").trim() || ""
    },
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
window.displayRaceTraits = displayRaceTraits;
window.applyRacialBonuses = applyRacialBonuses;
window.updateSubclasses = updateSubclasses;

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script.js caricato!");

  initializeValues();
  
  const modal = document.getElementById("raceExtrasModal");
  if (modal) modal.style.display = "none";

  if (sessionStorage.getItem("popupOpened") === "true") {
    console.log("🛑 Il pop-up non verrà riaperto automaticamente.");
    sessionStorage.removeItem("popupOpened");
  }
  fetchData("data/races.json").then(data => {
      if (data) {
          const races = Object.keys(data.races).map(name => ({
              name: name, path: data.races[name]
          }));
          populateDropdown("raceSelect", races, "Seleziona una razza");
      }
  });
  
  fetchData("data/classes.json").then(data => {
      if (data) {
          const classes = Object.keys(data.classes).map(name => ({
              name: name, path: data.classes[name]
          }));
          populateDropdown("classSelect", classes, "Seleziona una classe");
      }
  });

  document.getElementById("btnStep1").addEventListener("click", () => showStep("step1"));
  document.getElementById("btnStep2").addEventListener("click", () => showStep("step2"));
  document.getElementById("btnStep3").addEventListener("click", () => showStep("step3"));
  document.getElementById("btnStep4").addEventListener("click", () => showStep("step4"));
  document.getElementById("btnStep5").addEventListener("click", () => showStep("step5"));
  document.getElementById("btnStep8").addEventListener("click", () => showStep("step8"));

  showStep("step1");

  document.getElementById("raceSelect").addEventListener("change", displayRaceTraits);
  document.getElementById("levelSelect").addEventListener("change", () => displayRaceTraits());
  document.getElementById("classSelect").addEventListener("change", updateSubclasses);
  document.getElementById("classSelect").addEventListener("change", updateClassSkills);
  document.getElementById("classSelect").addEventListener("change", updateClassTools);
  document.getElementById("classSelect").addEventListener("change", updateClassSpells);
  document.getElementById("generateJson").addEventListener("click", generateFinalJson);

  // 🟢 ✅ **CORRETTO: FETCH PER CONFERMAZIONE RAZZA**
  document.getElementById("confirmRaceSelection").addEventListener("click", () => {
    const selectedRace = document.getElementById("raceSelect").value;
    if (!selectedRace) {
      alert("⚠️ Seleziona una razza prima di procedere!");
      return;
    }

    fetch(selectedRace)
      .then(response => response.json())
      .then(data => {
        const raceData = convertRaceData(data);
        const selections = [];
        document.getElementById("raceTraits").style.display = "none";

        addExtraSelection("Languages", "Choose an additional language.", 
    ["Elvish", "Dwarvish", "Halfling", "Orc", "Gnomish", "Draconic", "Celestial"], 
    raceData.languages.choice);
        
        addExtraSelection("Skill Proficiency", "Choose skill proficiencies.", 
    raceData.skill_choices.options, raceData.skill_choices.number);
        
        addExtraSelection("Tool Proficiency", "Choose a tool proficiency.", raceData.tool_choices.options);

        // ✅ **Aggiungere Spellcasting alle scelte nel Pop-up**
        if (raceData.spellcasting) {
          if (raceData.spellcasting.ability_choices && raceData.spellcasting.ability_choices.length > 0) {
              if (raceData.name.toLowerCase().includes("deep gnome")) {
                  console.log("🧠 Deep Gnome: aggiunta selezione per Spellcasting Ability nel pop-up.");
                  addExtraSelection("Spellcasting Ability", 
                      "Choose Intelligence, Wisdom, or Charisma as your spellcasting ability for your racial spells.", 
                      raceData.spellcasting.ability_choices);
              } else {
                  selections.push({
                      name: "Spellcasting Ability",
                      description: "Choose a spellcasting ability.",
                      selection: raceData.spellcasting.ability_choices,
                      count: 1
                  });
              }
          }

          if (raceData.spellcasting.spell_choices) {
            if (raceData.spellcasting.spell_choices.type === "fixed_list") {
              selections.push({
                name: "Spellcasting",
                description: "Choose a spell.",
                selection: raceData.spellcasting.spell_choices.options,
                count: 1
              });
            } else if (raceData.spellcasting.spell_choices.type === "filter") {
              const spellLevel = 0; // Normalmente i Cantrip
              const spellClassParts = raceData.spellcasting.spell_choices.filter.split("|");
              const spellClass = spellClassParts.length > 1 ? spellClassParts[1].split("=")[1] : null;

              if (spellClass) {
                loadSpells(spellList => {
                  const filteredSpells = spellList
                    .filter(spell => parseInt(spell.level) === spellLevel && spell.spell_list.includes(spellClass))
                    .map(spell => spell.name);

                  if (filteredSpells.length > 0) {
                    selections.push({
                      name: "Spellcasting",
                      description: `Choose a cantrip from ${spellClass}.`,
                      selection: filteredSpells,
                      count: 1
                    });
                  }

                  sessionStorage.setItem("popupOpened", "true");
                  openRaceExtrasModal(selections);
                });
              } 
            } 
          } 
        } 

        sessionStorage.setItem("popupOpened", "true");
        openRaceExtrasModal(selections);
        document.getElementById("confirmRaceSelection").style.display = "none";
      }) // ✅ **CHIUSURA DEL `.then()` CORRETTA!**
      .catch(error => handleError(`Errore caricando i dati della razza: ${error}`));
    });
    initializeValues();
}); 
