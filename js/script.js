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
  let spellcasting = null;
  let extraSpellcasting = null;
  if (rawData.additionalSpells && rawData.additionalSpells.length > 0) {
    let firstSpellGroup = rawData.additionalSpells[0];
    if (firstSpellGroup.known && firstSpellGroup.known["1"] && firstSpellGroup.known["1"]["_"]) {
      extraSpellcasting = rawData.additionalSpells;
    } else {
      let spellsArray = [];
      let abilityChoices = [];
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
            const spellName = extractSpellName(spellList);
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
    extraSpellcasting: extraSpellcasting,
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
  
  // Clear extra containers
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
      
      // Spellcasting – handle standard and additional spells
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
          const select = `<select id="extraLanguageSelect" data-category="Languages">${opts}</select>`;
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
      
      // Extra: Skill and Tool choices
      handleExtraSkills(raceData, "skillSelectionContainer");
      handleExtraTools(raceData, "toolSelectionContainer");
      
      // Extra: Variant Feature Choices and Ancestry
      handleVariantFeatureChoices(raceData);
      handleExtraAncestry(raceData, "ancestrySelection");
      
      resetRacialBonuses();
      
      // Save current race data for later steps
      window.currentRaceData = raceData;
    })
    .catch(error => handleError(`Errore caricando i tratti della razza: ${error}`));
}

// ==================== POP-UP PER LE SCELTE EXTRA ====================

// Global variables for extra selections
let extraSelections = [];
let currentSelectionIndex = 0;
let selectedExtra = {}; // Global object to hold selections by category

/**
 * Updates the global selectedExtra object by iterating over all extra-selection dropdowns.
 */
function updateExtraSelections() {
  selectedExtra = {};
  document.querySelectorAll(".extra-selection").forEach(select => {
    const category = select.getAttribute("data-category");
    if (!selectedExtra[category]) {
      selectedExtra[category] = [];
    }
    if (select.value && !selectedExtra[category].includes(select.value)) {
      selectedExtra[category].push(select.value);
    }
  });
  console.log("Updated extra selections:", selectedExtra);
}

/**
 * Displays the current extra selection in the popup.
 * Each extra-selection dropdown is given a data-category attribute to identify its category.
 * The "close" button is only shown on the last extra selection page.
 */
function showExtraSelection() {
  const titleElem = document.getElementById("extraTraitTitle");
  const descElem = document.getElementById("extraTraitDescription");
  const selectionElem = document.getElementById("extraTraitSelection");

  if (!extraSelections || extraSelections.length === 0) {
    console.error("❌ Nessuna scelta extra trovata.");
    return;
  }

  const currentSelection = extraSelections[currentSelectionIndex];
  titleElem.innerText = currentSelection.name;
  descElem.innerText = currentSelection.description;
  selectionElem.innerHTML = ""; // Clear previous content

  if (currentSelection.selection) {
    let dropdownHTML = "";
    const numChoices = currentSelection.count || 1; // Default to 1 if not specified

    for (let i = 0; i < numChoices; i++) {
      dropdownHTML += `<select class="extra-selection" data-category="${currentSelection.name}">
                        <option value="">Seleziona...</option>`;
      currentSelection.selection.forEach(option => {
        dropdownHTML += `<option value="${option}">${option}</option>`;
      });
      dropdownHTML += `</select><br>`;
    }
    selectionElem.innerHTML = dropdownHTML;

    // Attach change event listeners to update selections immediately
    document.querySelectorAll(".extra-selection").forEach(select => {
      select.addEventListener("change", updateExtraSelections);
    });
  }

  // Enable/disable navigation buttons
  document.getElementById("prevTrait").disabled = (currentSelectionIndex === 0);
  document.getElementById("nextTrait").disabled = (currentSelectionIndex === extraSelections.length - 1);

  // Show the "close" button only on the final extra selection page
  const closeBtn = document.getElementById("closeModal");
  if (currentSelectionIndex === extraSelections.length - 1) {
    closeBtn.style.display = "block";
  } else {
    closeBtn.style.display = "none";
  }
}

/**
 * Navigation buttons for the extra-selection popup.
 */
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

/**
 * Closes the extra-selection popup and saves the selections.
 * The selections are grouped by the data-category attribute.
 */
document.getElementById("closeModal").addEventListener("click", () => {
  // Hide the modal popup
  const modal = document.getElementById("raceExtrasModal");
  if (modal) {
    modal.style.display = "none";
  }
  sessionStorage.removeItem("popupOpened"); // Remove flag

  // Update selections (in case some dropdowns were changed)
  updateExtraSelections();

  console.log("📝 **Scelte salvate:**");
  Object.keys(selectedExtra).forEach(key => {
    console.log(`🔹 ${key}: ${selectedExtra[key].join(", ")}`);
  });

  // Update corresponding UI elements based on the extra selections
  Object.keys(selectedExtra).forEach(category => {
    if (category === "Languages") {
      const langElem = document.getElementById("extraLanguageSelect");
      if (langElem) langElem.value = selectedExtra[category].join(", ");
    } else if (category === "Skill Proficiency") {
      const skillContainer = document.getElementById("skillSelectionContainer");
      if (skillContainer) skillContainer.innerHTML = selectedExtra[category].join(", ");
    } else if (category === "Tool Proficiency") {
      const toolContainer = document.getElementById("toolSelectionContainer");
      if (toolContainer) toolContainer.innerHTML = selectedExtra[category].join(", ");
    } else if (category === "Spellcasting") {
      const spellContainer = document.getElementById("spellSelectionContainer");
      if (spellContainer) spellContainer.innerHTML = selectedExtra[category].join(", ");
    }
  });

  // Re-show the extra traits container in the background
  document.getElementById("raceExtraTraitsContainer").style.display = "block";
});

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

// ==================== STUB FUNCTION: updateSkillOptions ====================
// This function is referenced in the onchange for extra-selection dropdowns.
function updateSkillOptions() {
  console.log("updateSkillOptions called.");
}

// ==================== ESPOSTE GLOBALMENTE PER I LISTENER ====================
window.displayRaceTraits = displayRaceTraits;
window.applyRacialBonuses = applyRacialBonuses;
window.updateSubclasses = updateSubclasses;

// ==================== INIZIALIZZAZIONE ====================
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script.js caricato!");
  // Ensure the popup modal is hidden at startup.
  const modal = document.getElementById("raceExtrasModal");
  if (modal) {
    modal.style.display = "none";
  }

  loadDropdownData("data/races.json", "raceSelect", "races");
  loadDropdownData("data/classes.json", "classSelect", "classes");

  // Navigation events
  document.getElementById("btnStep1").addEventListener("click", () => showStep("step1"));
  document.getElementById("btnStep2").addEventListener("click", () => showStep("step2"));
  document.getElementById("btnStep3").addEventListener("click", () => showStep("step3"));
  document.getElementById("btnStep4").addEventListener("click", () => showStep("step4"));
  document.getElementById("btnStep5").addEventListener("click", () => showStep("step5"));
  document.getElementById("btnStep8").addEventListener("click", () => showStep("step8"));

  // Show initial step
  showStep("step1");

  document.getElementById("raceSelect").addEventListener("change", displayRaceTraits);
  document.getElementById("levelSelect").addEventListener("change", () => displayRaceTraits());
  document.getElementById("generateJson").addEventListener("click", generateFinalJson);

  // When the "Seleziona Razza" button is clicked:
  document.getElementById("confirmRaceSelection").addEventListener("click", () => {
    // Hide the race traits container
    document.getElementById("raceTraits").style.display = "none";

    // Prepare extra selections based on the current race data
    const raceData = window.currentRaceData;
    let selections = [];
    if (raceData.languages && raceData.languages.choice > 0) {
      selections.push({
        name: "Languages",
        description: "Choose an additional language.",
        selection: ["Elvish", "Dwarvish", "Halfling", "Orc", "Gnomish", "Draconic", "Celestial"],
        count: raceData.languages.choice
      });
    }
    if (raceData.skill_choices) {
      selections.push({
        name: "Skill Proficiency",
        description: "Choose skill proficiencies.",
        selection: raceData.skill_choices.options,
        count: raceData.skill_choices.number
      });
    }
    if (raceData.tool_choices) {
      selections.push({
        name: "Tool Proficiency",
        description: "Choose a tool proficiency.",
        selection: raceData.tool_choices.options,
        count: 1
      });
    }
    if (raceData.spellcasting) {
      selections.push({
        name: "Spellcasting",
        description: "Choose a cantrip.",
        selection: ["Fire Bolt", "Mage Hand", "Prestidigitation", "Ray of Frost"],
        count: 1
      });
    }
    sessionStorage.setItem("popupOpened", "true");
    openRaceExtrasModal(selections);
    // Hide the confirm button to prevent re-clicking
    document.getElementById("confirmRaceSelection").style.display = "none";
  });

  initializeValues();
});
