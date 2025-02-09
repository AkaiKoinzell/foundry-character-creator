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
  const selected = new Set();
  allVariantSkillSelects.forEach(select => {
    if (select.value) selected.add(select.value);
  });
  allVariantSkillSelects.forEach(select => {
    const current = select.value;
    select.innerHTML = `<option value="">Seleziona...</option>`;
    const options = JSON.parse(select.getAttribute("data-options"));
    options.forEach(skill => {
      if (!selected.has(skill) || skill === current) {
        const option = document.createElement("option");
        option.value = skill;
        option.textContent = skill;
        if (skill === current) option.selected = true;
        select.appendChild(option);
      }
    });
  });
}

function handleVariantExtraSelections() {
  const variantElem = document.getElementById("variantFeatureChoice");
  const container = document.getElementById("variantExtraContainer");
  if (!container) return;
  container.innerHTML = "";
  if (!variantElem || !variantElem.value) return;
  const selectedVariant = variantElem.value;
  if (variantExtraMapping[selectedVariant]) {
    const mapData = variantExtraMapping[selectedVariant];
    if (mapData.type === "skills") {
      let html = `<p><strong>Seleziona ${mapData.count} skill per ${selectedVariant}:</strong></p>`;
      for (let i = 0; i < mapData.count; i++) {
        html += `<select class="variantSkillChoice" id="variantSkillChoice${i}" data-options='${JSON.stringify(mapData.options)}' onchange="updateVariantSkillOptions()">
                    <option value="">Seleziona...</option>`;
        mapData.options.forEach(s => {
          html += `<option value="${s}">${s}</option>`;
        });
        html += `</select> `;
      }
      container.innerHTML = html;
    } else if (mapData.type === "spells") {
      loadSpells(spellList => {
        const filtered = filterSpells(spellList, mapData.filter);
        if (!filtered.length) {
          container.innerHTML = `<p>Nessun incantesimo trovato per il filtro: ${mapData.filter}</p>`;
        } else {
          let html = `<p><strong>Seleziona un incantesimo per ${selectedVariant}:</strong></p>`;
          html += `<select id="variantSpellChoice">
                    <option value="">Seleziona...</option>`;
          filtered.forEach(spell => {
            html += `<option value="${spell.name}">${spell.name}</option>`;
          });
          html += `</select>`;
          container.innerHTML = html;
        }
      });
    }
    // Se il mapping è "none", non viene mostrato nulla
  }
}

function handleVariantFeatureChoices(data) {
  const container = document.getElementById("variantFeatureSelectionContainer");
  if (!data.variant_feature_choices || !container) {
    if (container) container.innerHTML = "";
    return;
  }
  let html = `<p><strong>Scegli una Variant Feature:</strong></p><select id="variantFeatureChoice"><option value="">Seleziona...</option>`;
  data.variant_feature_choices.forEach(opt => {
    html += `<option value="${opt.name}">${opt.name}</option>`;
  });
  html += `</select>`;
  container.innerHTML = html;
  const variantSelect = document.getElementById("variantFeatureChoice");
  if (variantSelect) {
    variantSelect.addEventListener("change", handleVariantExtraSelections);
  }
}

// ==================== FUNZIONI SPELLCASTING ====================

/**
 * Gestisce lo spellcasting standard delle razze.
 * Supporta le modalità:
 * - fixed_list: dropdown fisso.
 * - class_list: filtra per classe e livello.
 * - filter: raggruppa gli incantesimi per livello (caso tipico per High/Astral Elf).
 *
 * Il markup viene iniettato nel container specificato da containerId.
 *
 * @param {Object} data - I dati della razza (output di convertRaceData).
 * @param {string} containerId - L'id del container in cui iniettare il markup.
 */
function handleSpellcastingOptions(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Prova a recuperare direttamente i dati di spellcasting
  let spellData = data.spellcasting;
  
  // Fallback: se spellData non è presente, prova a costruirlo da additionalSpells
  if (!spellData || (!spellData.spell_choices && !spellData.fixed_spell)) {
    if (data.additionalSpells && data.additionalSpells.length > 0) {
      let spellsArray = [];
      let abilityChoices = [];
      data.additionalSpells.forEach(spellGroup => {
        // Incantesimi innate
        if (spellGroup.innate) {
          Object.keys(spellGroup.innate).forEach(levelKey => {
            const level = parseInt(levelKey);
            const spellList = (typeof spellGroup.innate[levelKey] === "object" &&
              spellGroup.innate[levelKey].daily &&
              spellGroup.innate[levelKey].daily["1"])
              ? spellGroup.innate[levelKey].daily["1"]
              : spellGroup.innate[levelKey];
            const spellName = extractSpellName(spellList);
            if (spellName) {
              spellsArray.push({ name: spellName, level: level, type: "innate" });
            }
          });
        }
        // Incantesimi "known"
        if (spellGroup.known) {
          Object.keys(spellGroup.known).forEach(levelKey => {
            const level = parseInt(levelKey);
            const spellList = spellGroup.known[levelKey];
            // Qui controlliamo se spellList contiene una proprietà "_" (caso High Elf)
            let spellName;
            if (spellList && spellList["_"] && Array.isArray(spellList["_"])) {
              spellName = extractSpellName(spellList["_"]);
            } else {
              spellName = extractSpellName(spellList);
            }
            if (spellName) {
              spellsArray.push({ name: spellName, level: level, type: "known" });
            }
          });
        }
        // Scelta dell'abilità di lancio
        if (spellGroup.ability) {
          if (typeof spellGroup.ability === "object" && spellGroup.ability.choose) {
            abilityChoices = spellGroup.ability.choose;
          } else if (typeof spellGroup.ability === "string") {
            abilityChoices = [spellGroup.ability];
          }
        }
      });
      if (spellsArray.length > 0) {
        const distinctLevels = new Set(spellsArray.map(s => s.level));
        if (distinctLevels.size > 1) {
          spellData = {
            spell_choices: { type: "filter" },
            allSpells: spellsArray,
            ability_choices: abilityChoices,
            uses: "1 per long rest"
          };
        } else {
          if (spellsArray.length === 1) {
            spellData = {
              fixed_spell: spellsArray[0].name,
              level_requirement: spellsArray[0].level,
              uses: "1 per long rest",
              ability_choices: abilityChoices
            };
          } else {
            spellData = {
              spell_choices: { type: "fixed_list", options: spellsArray.map(s => s.name) },
              level_requirement: Math.min(...spellsArray.map(s => s.level)),
              uses: "1 per long rest",
              ability_choices: abilityChoices
            };
          }
        }
      }
    }
  }
  
  if (!spellData || (!spellData.spell_choices && !spellData.fixed_spell)) {
    console.log("⚠️ Nessun spellcasting trovato per questa razza.");
    container.innerHTML = "";
    return;
  }
  
  let markup = "<h4>📖 Incantesimi</h4>";
  
  if (spellData.fixed_spell) {
    // Caso in cui esiste un incantesimo fisso
    markup += `<p><strong>Incantesimo:</strong> ${spellData.fixed_spell}</p>`;
    if (spellData.ability_choices && Array.isArray(spellData.ability_choices)) {
      if (spellData.ability_choices.length > 1) {
        const abilityOptions = spellData.ability_choices.map(a => `<option value="${a}">${a}</option>`).join("");
        markup += `<p><strong>Abilità di lancio:</strong>
                    <select id="castingAbility"><option value="">Seleziona...</option>${abilityOptions}</select>
                   </p>`;
      } else if (spellData.ability_choices.length === 1) {
        markup += `<p><strong>Abilità di lancio:</strong> ${spellData.ability_choices[0]}</p>`;
      }
    }
  } else if (spellData.spell_choices && spellData.spell_choices.type === "filter") {
    const currentLevel = parseInt(document.getElementById("levelSelect").value) || 1;
    const filteredSpells = spellData.allSpells.filter(spell => parseInt(spell.level) <= currentLevel);
    const groupedSpells = {};
    filteredSpells.forEach(spell => {
      const lvl = parseInt(spell.level);
      if (!groupedSpells[lvl]) groupedSpells[lvl] = [];
      groupedSpells[lvl].push(spell);
    });
    const levels = Object.keys(groupedSpells).map(Number).sort((a, b) => a - b);
    levels.forEach(lvl => {
      const spellsAtLvl = groupedSpells[lvl];
      if (spellsAtLvl.length === 1) {
        markup += `<p><strong>Incantesimo di livello ${lvl}:</strong> ${spellsAtLvl[0].name}</p>`;
      } else if (spellsAtLvl.length > 1) {
        const options = spellsAtLvl.map(spell => `<option value="${spell.name}">${spell.name} (lvl ${spell.level})</option>`).join("");
        markup += `<p><strong>Incantesimo di livello ${lvl}:</strong>
                    <select id="spellSelection_level_${lvl}"><option value="">Seleziona...</option>${options}</select>
                    </p>`;
      }
    });
    let abilityHtml = "";
    if (spellData.ability_choices && Array.isArray(spellData.ability_choices)) {
      if (spellData.ability_choices.length > 1) {
        const abilityOptions = spellData.ability_choices.map(a => `<option value="${a}">${a}</option>`).join("");
        abilityHtml = `<p><strong>Abilità di lancio:</strong>
                      <select id="castingAbility"><option value="">Seleziona...</option>${abilityOptions}</select>
                      </p>`;
      } else if (spellData.ability_choices.length === 1) {
        abilityHtml = `<p><strong>Abilità di lancio:</strong> ${spellData.ability_choices[0]}</p>`;
      }
    }
    markup += abilityHtml;
  } else if (spellData.spell_choices && spellData.spell_choices.type === "fixed_list") {
    const options = spellData.spell_choices.options.map(spell => `<option value="${spell}">${spell}</option>`).join("");
    markup += `<p><strong>Scegli un incantesimo:</strong>
                <select id="spellSelection"><option value="">Seleziona...</option>${options}</select>
              </p>`;
  }
  
  container.innerHTML = markup;
  return;
}

/**
 * Gestisce incantesimi extra per razze specifiche (es. High Elf, Aarakocra).
 * Inietta il markup nel container "spellSelectionContainer" aggiungendo il dropdown per la scelta del cantrip.
 */
function handleAdditionalSpells(data) {
  if (!data.additionalSpells || data.additionalSpells.length === 0) return;
  console.log("🛠 Gestione specifica per additionalSpells (es. High Elf, Aarakocra)");
  const spellData = data.additionalSpells[0];
  // Controlla se esiste una sezione "known" al livello 1, considerando la struttura con "_" (High Elf)
  if (spellData.known && spellData.known["1"] && spellData.known["1"]["_"] && Array.isArray(spellData.known["1"]["_"])) {
    let spellChoice = spellData.known["1"]["_"].find(spell => spell.choose && spell.choose.includes("class="));
    if (!spellChoice) {
      console.warn("⚠️ Nessun Cantrip trovato in additionalSpells.");
      return;
    }
    console.log("📥 Trovato filtro per Cantrip:", spellChoice.choose);
    let [levelFilter, classFilter] = spellChoice.choose.split("|").map(f => f.split("=")[1]);
    let spellClass = classFilter.trim();
    let spellLevel = parseInt(levelFilter.trim());
    console.log(`📥 Richiesta per incantesimi di livello ${spellLevel} della classe ${spellClass}`);
    loadSpells(spellList => {
      let availableSpells = spellList
        .filter(spell =>
          parseInt(spell.level) === spellLevel &&
          spell.spell_list && spell.spell_list.map(x => x.toLowerCase()).includes(spellClass.toLowerCase())
        )
        .map(spell => `<option value="${spell.name}">${spell.name}</option>`)
        .join("");
      const container = document.getElementById("spellSelectionContainer");
      if (!container) {
        console.error("❌ ERRORE: spellSelectionContainer non trovato nel DOM!");
        return;
      }
      if (availableSpells.length > 0) {
        container.innerHTML += `
          <p><strong>Scegli un Cantrip da ${spellClass}:</strong></p>
          <select id="additionalSpellSelection">${availableSpells}</select>
        `;
        console.log("✅ Dropdown Cantrip generato correttamente.");
      } else {
        container.innerHTML += `<p><strong>⚠️ Nessun Cantrip disponibile per questa classe!</strong></p>`;
      }
    });
  }
}

/**
 * Wrapper che richiama sia handleSpellcastingOptions che handleAdditionalSpells.
 */
function handleAllSpellcasting(data, traitsHtml) {
  handleSpellcastingOptions(data, "spellSelectionContainer");
  handleAdditionalSpells(data);
  return traitsHtml;
}

// ==================== FUNZIONI PER EXTRA (LINGUE, SKILLS, TOOLS, ANCESTRY) ====================
function handleExtraLanguages(data, containerId) {
  if (data.languages && data.languages.choice > 0) {
    loadLanguages(langs => {
      const availableLangs = langs.filter(lang => !data.languages.fixed.includes(lang));
      const options = availableLangs
        .map(lang => `<option value="${lang}">${lang}</option>`)
        .join("");
      const html = `<h4>Lingue Extra</h4>
                    <select id="extraLanguageSelect">
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
    let html = `<h4>Skill Extra</h4>`;
    for (let i = 0; i < data.skill_choices.number; i++) {
      html += `<select class="skillChoice" id="skillChoice${i}" data-options='${skillOptions}' onchange="updateSkillOptions()">
                  <option value="">Seleziona...</option>`;
      html += data.skill_choices.options.map(s => `<option value="${s}">${s}</option>`).join("");
      html += `</select>`;
    }
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = html;
  } else {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = "";
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

// ==================== FUNZIONI COMMON (UTILITÀ) ====================
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
    .catch(error => handleError(`Errore caricando ${jsonPath}: ${error}`));
}

function populateDropdown(selectId, options) {
  const select = document.getElementById(selectId);
  if (!select) {
    handleError(`Elemento #${selectId} non trovato!`);
    return;
  }
  select.innerHTML = `<option value="">Seleziona...</option>`;
  options.forEach(option => {
    const opt = document.createElement("option");
    opt.value = option.path;
    opt.textContent = option.name;
    select.appendChild(opt);
  });
}

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

// ==================== CONVERSIONE DEI DATI DELLA RAZZA ====================
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
  // Variant Feature e Tratti
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
  // Spellcasting – elaborazione completa
  let spellsArray = [];
  let abilityChoices = [];
  let spellcasting = {};
  if (rawData.additionalSpells && rawData.additionalSpells.length > 0) {
    rawData.additionalSpells.forEach(spellData => {
      if (spellData.innate) {
        Object.keys(spellData.innate).forEach(levelKey => {
          const level = parseInt(levelKey);
          const spellList = (typeof spellData.innate[levelKey] === "object" &&
                              spellData.innate[levelKey].daily &&
                              spellData.innate[levelKey].daily["1"])
            ? spellData.innate[levelKey].daily["1"]
            : spellData.innate[levelKey];
          const spellName = extractSpellName(spellList);
          if (spellName) {
            spellsArray.push({ name: spellName, level: level, type: "innate" });
          }
        });
      }
      if (spellData.known) {
        Object.keys(spellData.known).forEach(levelKey => {
          const level = parseInt(levelKey);
          const spellList = spellData.known[levelKey];
          let spellName;
          if (spellList && spellList["_"] && Array.isArray(spellList["_"])) {
            spellName = extractSpellName(spellList["_"]);
          } else {
            spellName = extractSpellName(spellList);
          }
          if (spellName) {
            spellsArray.push({ name: spellName, level: level, type: "known" });
          }
        });
      }
      if (spellData.ability) {
        if (typeof spellData.ability === "object" && spellData.ability.choose) {
          abilityChoices = spellData.ability.choose;
        } else if (typeof spellData.ability === "string") {
          abilityChoices = [spellData.ability];
        }
      }
    });
    if (spellsArray.length > 0) {
      const distinctLevels = new Set(spellsArray.map(s => s.level));
      if (distinctLevels.size > 1) {
        spellcasting = {
          spell_choices: { type: "filter" },
          allSpells: spellsArray,
          ability_choices: abilityChoices,
          uses: "1 per long rest"
        };
      } else {
        if (spellsArray.length === 1) {
          spellcasting = {
            fixed_spell: spellsArray[0].name,
            level_requirement: spellsArray[0].level,
            uses: "1 per long rest",
            ability_choices: abilityChoices
          };
        } else {
          spellcasting = {
            spell_choices: { type: "fixed_list", options: spellsArray.map(s => s.name) },
            level_requirement: Math.min(...spellsArray.map(s => s.level)),
            uses: "1 per long rest",
            ability_choices: abilityChoices
          };
        }
      }
    }
  }
  // Lingue
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

// ==================== DISPLAY DEI TRATTI DELLA RAZZA ====================
function displayRaceTraits() {
  const racePath = document.getElementById("raceSelect").value;
  const raceTraitsDiv = document.getElementById("raceTraits");
  const racialBonusDiv = document.getElementById("racialBonusSelection");
  
  // Pulisce i container extra
  ["skillSelectionContainer", "toolSelectionContainer", "spellSelectionContainer", "variantFeatureSelectionContainer", "variantExtraContainer", "languageSelection", "ancestrySelection"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });
  
  if (!racePath) {
    if (raceTraitsDiv) {
      raceTraitsDiv.innerHTML = "<p>Seleziona una razza per vedere i tratti.</p>";
    }
    if (racialBonusDiv) {
      racialBonusDiv.style.display = "none";
    }
    resetRacialBonuses();
    return;
  }
  
  fetch(racePath)
    .then(response => response.json())
    .then(data => {
      console.log("📜 Dati razza caricati:", data);
      if (raceTraitsDiv) raceTraitsDiv.innerHTML = "";
      const raceData = convertRaceData(data);
      let traitsHtml = `<h3>Tratti di ${raceData.name}</h3>`;
      
      // Velocità
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
      
      // Visione
      if (raceData.senses && raceData.senses.darkvision) {
        traitsHtml += `<p><strong>Visione:</strong> ${raceData.senses.darkvision} ft</p>`;
      }
      
      // Tratti
      if (raceData.traits && raceData.traits.length > 0) {
        traitsHtml += `<p><strong>Tratti:</strong></p><ul>`;
        raceData.traits.forEach(trait => {
          traitsHtml += `<li><strong>${trait.name}:</strong> ${trait.description || ""}</li>`;
        });
        traitsHtml += `</ul>`;
      }
      
      // Tabelle (rawEntries)
      const tablesHtml = renderTables(raceData.rawEntries);
      traitsHtml += tablesHtml;
      
      // Spellcasting – gestisce sia lo spellcasting standard che quello aggiuntivo
      handleAllSpellcasting(raceData, traitsHtml);
      
      // Lingue
      let languageHtml = "";
      if (raceData.languages && Array.isArray(raceData.languages.fixed) && raceData.languages.fixed.length > 0) {
        languageHtml = `<p><strong>Lingue Concesse:</strong> ${raceData.languages.fixed.join(", ")}</p>`;
      } else {
        languageHtml = `<p><strong>Lingue Concesse:</strong> Nessuna</p>`;
      }
      if (raceData.languages.choice > 0) {
        languageHtml += `<p>Scegli ${raceData.languages.choice} lingua/e extra:</p>`;
        loadLanguages(langs => {
          const availableLangs = langs.filter(lang => !raceData.languages.fixed.includes(lang));
          let opts = availableLangs.map(lang => `<option value="${lang}">${lang}</option>`).join("");
          opts = `<option value="">Seleziona...</option>` + opts;
          const select = `<select id="extraLanguageSelect">${opts}</select>`;
          const langContainer = document.getElementById("languageSelection");
          if (langContainer) {
            langContainer.innerHTML = languageHtml + select;
          }
        });
      } else {
        const langContainer = document.getElementById("languageSelection");
        if (langContainer) langContainer.innerHTML = languageHtml;
      }
      
      if (raceTraitsDiv) {
        raceTraitsDiv.innerHTML = traitsHtml;
      }
      if (racialBonusDiv) {
        racialBonusDiv.style.display = "block";
      }
      
      // Extra: Skill e Tool choices
      handleExtraSkills(raceData, "skillSelectionContainer");
      handleExtraTools(raceData, "toolSelectionContainer");
      
      // Extra: Variant Feature Choices
      handleVariantFeatureChoices(raceData);
      
      // Extra: Ancestry (se presente)
      handleExtraAncestry(raceData, "ancestrySelection");
      
      resetRacialBonuses();
      
      // Salva globalmente i dati della razza per eventuali step successivi (es. Step 4)
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
  fetch(classPath)
    .then(response => response.json())
    .then(data => {
      subclassSelect.innerHTML = `<option value="">Seleziona una sottoclasse</option>`;
      data.subclasses.forEach(subclass => {
        const option = document.createElement("option");
        option.value = subclass.name;
        option.textContent = subclass.name;
        subclassSelect.appendChild(option);
      });
      subclassSelect.style.display = data.subclasses.length > 0 ? "block" : "none";
    })
    .catch(error => handleError(`Errore caricando le sottoclasse: ${error}`));
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
      selected: document.getElementById("extraLanguageSelect") ? document.getElementById("extraLanguageSelect").value : []
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
  const abilities = ["str", "dex", "con", "int", "wis", "cha"];
  abilities.forEach(ability => {
    const basePoints = parseInt(document.getElementById(ability + "Points").textContent);
    const raceModifier = parseInt(document.getElementById(ability + "RaceModifier").textContent);
    const finalScore = basePoints + raceModifier;
    const finalScoreElement = document.getElementById(ability + "FinalScore");
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

// ==================== ESPOSTE GLOBALMENTE PER I LISTENER ====================
window.displayRaceTraits = displayRaceTraits;
window.applyRacialBonuses = applyRacialBonuses;
window.updateSubclasses = updateSubclasses;

// Inizializza al caricamento della pagina
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script.js caricato!");
  loadDropdownData("data/races.json", "raceSelect", "races");
  loadDropdownData("data/classes.json", "classSelect", "classes");
  
  document.getElementById("raceSelect").addEventListener("change", displayRaceTraits);
  document.getElementById("levelSelect").addEventListener("change", () => displayRaceTraits());
  document.getElementById("generateJson").addEventListener("click", generateFinalJson);
  
  initializeValues();
});
