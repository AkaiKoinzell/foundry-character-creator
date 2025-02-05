// =====================
// CONFIGURAZIONE GLOBALI
// =====================

// Mapping globale per le extra variant features
const variantExtraMapping = {
  "Drow Magic": {
    type: "none" // Se viene scelta "Drow Magic", non mostriamo extra (le spell fisse verranno gestite separatamente)
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
};

// =====================
// FUNZIONI DI SPELLCASTING
// =====================

function handleSpellcastingOptions(data, traitsHtml) {
  // Se la razza non ha la proprietà spellcasting, restituisce traitsHtml senza modificarlo
  if (!data.spellcasting) return traitsHtml;

  // Modalità "filter" (ad esempio, per High Elf, Fairy, ecc.)
  if (data.spellcasting.spell_choices && data.spellcasting.spell_choices.type === "filter") {
    const currentLevel = parseInt(document.getElementById("levelSelect").value) || 1;
    const filteredSpells = data.spellcasting.allSpells.filter(spell => parseInt(spell.level) <= currentLevel);
    const grouped = {};
    filteredSpells.forEach(spell => {
      const lvl = parseInt(spell.level);
      if (!grouped[lvl]) grouped[lvl] = [];
      grouped[lvl].push(spell);
    });
    const levels = Object.keys(grouped).map(Number).sort((a, b) => a - b);
    let htmlOut = "<h4>📖 Incantesimi</h4>";
    levels.forEach(lvl => {
      const spellsAtLvl = grouped[lvl];
      if (spellsAtLvl.length === 1) {
        htmlOut += `<p><strong>Incantesimo di livello ${lvl}:</strong> ${spellsAtLvl[0].name}</p>`;
      } else if (spellsAtLvl.length > 1) {
        const opts = spellsAtLvl.map(spell => `<option value="${spell.name}">${spell.name} (lvl ${spell.level})</option>`).join("");
        htmlOut += `<p><strong>Incantesimo di livello ${lvl}:</strong>
                    <select id="spellSelection_level_${lvl}"><option value="">Seleziona...</option>${opts}</select>
                    </p>`;
      }
    });
    let abilityHtml = "";
    if (data.spellcasting.ability_choices) {
      if (Array.isArray(data.spellcasting.ability_choices) && data.spellcasting.ability_choices.length === 1) {
        abilityHtml = `<p><strong>Abilità di lancio:</strong> ${data.spellcasting.ability_choices[0]}</p>`;
      } else if (Array.isArray(data.spellcasting.ability_choices) && data.spellcasting.ability_choices.length > 1) {
        const abOpts = data.spellcasting.ability_choices.map(a => `<option value="${a}">${a}</option>`).join("");
        abilityHtml = `<p><strong>Abilità di lancio:</strong>
                      <select id="castingAbility"><option value="">Seleziona...</option>${abOpts}</select>
                      </p>`;
      }
    }
    document.getElementById("spellSelectionContainer").innerHTML = htmlOut + abilityHtml;
    return traitsHtml;
  }
  
  // Modalità "fixed_list" / "fixed_spell"
  const currentLevel = parseInt(document.getElementById("levelSelect").value) || 1;
  let availableSpells = [];
  if (data.spellcasting.spells) {
    availableSpells = data.spellcasting.spells.filter(spell => parseInt(spell.level) <= currentLevel);
  } else if (data.spellcasting.fixed_spell) {
    availableSpells.push({ name: data.spellcasting.fixed_spell, level: currentLevel });
  }
  const grouped = {};
  availableSpells.forEach(spell => {
    const lvl = parseInt(spell.level);
    if (!grouped[lvl]) grouped[lvl] = [];
    grouped[lvl].push(spell);
  });
  const levels = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  let htmlOut = "<h4>📖 Incantesimi</h4>";
  levels.forEach(lvl => {
    const spellsAtLvl = grouped[lvl];
    if (spellsAtLvl.length === 1) {
      htmlOut += `<p><strong>Incantesimo di livello ${lvl}:</strong> ${spellsAtLvl[0].name}</p>`;
    } else if (spellsAtLvl.length > 1) {
      const opts = spellsAtLvl.map(spell => `<option value="${spell.name}">${spell.name} (lvl ${spell.level})</option>`).join("");
      htmlOut += `<p><strong>Incantesimo di livello ${lvl}:</strong>
                  <select id="spellSelection_level_${lvl}"><option value="">Seleziona...</option>${opts}</select>
                  </p>`;
    }
  });
  if (data.spellcasting.ability_choices) {
    let abilityHtml = "";
    if (data.spellcasting.ability_choices.length === 1) {
      abilityHtml = `<p><strong>Abilità di lancio:</strong> ${data.spellcasting.ability_choices[0]}</p>`;
    } else {
      const abOpts = data.spellcasting.ability_choices.map(a => `<option value="${a}">${a}</option>`).join("");
      abilityHtml = `<p><strong>Abilità di lancio:</strong>
                    <select id="castingAbility"><option value="">Seleziona...</option>${abOpts}</select>
                    </p>`;
    }
    htmlOut += abilityHtml;
  }
  if (data.spellcasting.level_up_spells) {
    const bonusSpells = data.spellcasting.level_up_spells
      .filter(spell => currentLevel >= spell.level)
      .map(spell => `<li><strong>${spell.spell_choices.join(", ")}</strong> (Usi: ${spell.uses}, Ricarica: ${spell.refresh})</li>`)
      .join("");
    if (bonusSpells) {
      htmlOut += `<p><strong>Incantesimi Bonus:</strong></p><ul>${bonusSpells}</ul>`;
    }
  }
  return traitsHtml + htmlOut;
}

// =====================
// EVENTI DOMCONTENTLOADED E CARICAMENTO DATI
// =====================
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script.js caricato!");

  // Carica la lista delle razze e classi
  loadDropdownData("data/races.json", "raceSelect", "races");
  loadDropdownData("data/classes.json", "classSelect", "classes");

  // Listener per aggiornare sottorazze, sottoclasse e bonus
  document.getElementById("raceSelect").addEventListener("change", displayRaceTraits);
  document.getElementById("racialBonus1").addEventListener("change", applyRacialBonuses);
  document.getElementById("racialBonus2").addEventListener("change", applyRacialBonuses);
  document.getElementById("racialBonus3").addEventListener("change", applyRacialBonuses);
  document.getElementById("levelSelect").addEventListener("change", () => displayRaceTraits());
  document.getElementById("generateJson").addEventListener("click", generateFinalJson);

  initializeValues();

  // Esponi globalmente le funzioni usate nei listener
  window.displayRaceTraits = displayRaceTraits;
  window.applyRacialBonuses = applyRacialBonuses;
});

// =====================
// FUNZIONI DI CARICAMENTO E CONVERSIONE DATI
// =====================

function loadDropdownData(jsonPath, selectId, key) {
  fetch(jsonPath)
    .then(response => response.json())
    .then(data => {
      console.log(`📜 Dati ricevuti da ${jsonPath}:`, data);
      if (!data[key] && !Array.isArray(data)) {
        handleError(`Chiave ${key} non trovata in ${jsonPath}`);
        return;
      }
      let options = [];
      if (data[key]) {
        options = Object.keys(data[key]).map(name => ({ name, path: data[key][name] }));
      } else if (Array.isArray(data)) {
        options = data.map(obj => ({ name: obj.name, path: jsonPath }));
      }
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
          const optDesc = Array.isArray(opt.entries) ? opt.entries.join(" ") : opt.entries;
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

  // Spellcasting
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
          if (typeof spellList === "object" && spellList._ && Array.isArray(spellList._) && spellList._[0].choose) {
            spellcasting = {
              spell_choices: { type: "filter" },
              allSpells: spellsArray,
              ability_choices: (typeof spellData.ability === "string")
                ? [spellData.ability]
                : (spellData.ability && spellData.ability.choose ? spellData.ability.choose : []),
              uses: "n/a"
            };
          } else {
            const spellName = extractSpellName(spellList);
            if (spellName) {
              spellsArray.push({ name: spellName, level: level, type: "known" });
            }
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
    if (!spellcasting.spell_choices && spellsArray.length > 0) {
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
      skill_choices = {
        number: count,
        options: sp.from
      };
    }
  }

  // Tool Choices (solo se esiste "choose")
  let tool_choices = null;
  if (rawData.toolProficiencies && Array.isArray(rawData.toolProficiencies)) {
    rawData.toolProficiencies.forEach(tp => {
      if (tp.choose && tp.choose.from) {
        tool_choices = {
          number: 1,
          options: tp.choose.from
        };
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

// =====================
// RENDERING DELLE INFO (TABLES, etc.)
// =====================
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

// =====================
// VISUALIZZAZIONE DEI TRATTI DELLA RAZZA
// =====================
function displayRaceTraits() {
  const racePath = document.getElementById("raceSelect").value;
  const raceTraitsDiv = document.getElementById("raceTraits");
  const racialBonusDiv = document.getElementById("racialBonusSelection");

  // Pulisce i container extra
  document.getElementById("skillSelectionContainer").innerHTML = "";
  document.getElementById("toolSelectionContainer").innerHTML = "";
  document.getElementById("spellSelectionContainer").innerHTML = "";
  document.getElementById("variantFeatureSelectionContainer").innerHTML = "";
  document.getElementById("variantExtraContainer").innerHTML = "";

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
      const raceData = convertRaceData(data);
      let traitsHtml = `<h3>Tratti di ${raceData.name}</h3>`;

      // Velocità
      if (typeof raceData.speed === "object") {
        const speedDetails = [];
        for (let type in raceData.speed) {
          speedDetails.push(`${type}: ${raceData.speed[type]} ft`);
        }
        traitsHtml += `<p><strong>Velocità:</strong> ${speedDetails.join(", ")}</p>`;
      } else if (typeof raceData.speed === "number") {
        traitsHtml += `<p><strong>Velocità:</strong> ${raceData.speed} ft</p>`;
      } else if (typeof raceData.speed === "string") {
        traitsHtml += `<p><strong>Velocità:</strong> ${raceData.speed}</p>`;
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

      // Tabelle (se presenti)
      const tablesHtml = renderTables(raceData.rawEntries);
      traitsHtml += tablesHtml;

      // Spellcasting (se presente)
      if (raceData.spellcasting) {
        traitsHtml = handleSpellcastingOptions(raceData, traitsHtml);
      }

      // Lingue
      let languageHtml = `<p><strong>Lingue Concesse:</strong> ${raceData.languages.fixed.join(", ")}</p>`;
      if (raceData.languages.choice > 0) {
        languageHtml += `<p>Scegli ${raceData.languages.choice} lingua/e extra:</p>`;
        loadLanguages(langs => {
          const availableLangs = langs.filter(lang => !raceData.languages.fixed.includes(lang));
          let opts = availableLangs.map(lang => `<option value="${lang}">${lang}</option>`).join("");
          opts = `<option value="">Seleziona...</option>` + opts;
          const sel = `<select id="extraLanguageSelect">${opts}</select>`;
          document.getElementById("languageSelection").innerHTML = languageHtml + sel;
        });
      } else {
        document.getElementById("languageSelection").innerHTML = languageHtml;
      }

      if (raceTraitsDiv) {
        raceTraitsDiv.innerHTML = traitsHtml;
      }
      if (racialBonusDiv) {
        racialBonusDiv.style.display = "block";
      }
      if (raceData.skill_choices) {
        handleSkillChoices(raceData);
      }
      if (raceData.tool_choices) {
        handleToolChoices(raceData);
      }
      if (raceData.variant_feature_choices) {
        handleVariantFeatureChoices(raceData);
      }
      resetRacialBonuses();
    })
    .catch(error => handleError(`Errore caricando i tratti della razza: ${error}`));
}

// =====================
// GESTIONE SOTTOCLASSI
// =====================
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

// =====================
// GENERAZIONE JSON FINALE
// =====================
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
    variant_feature: variantFeature
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

// =====================
// POINT BUY SYSTEM
// =====================
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
    const backgroundTalent = parseInt(document.getElementById(ability + "BackgroundTalent").value) || 0;
    const finalScore = basePoints + raceModifier + backgroundTalent;
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
    if (raceModEl) raceModEl.value = "0";
    const backgroundTalentEl = document.getElementById(ability + "BackgroundTalent");
    if (backgroundTalentEl) backgroundTalentEl.value = "0";
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
