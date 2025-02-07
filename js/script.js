// ====================================================================
// COMMON FUNCTIONS – Queste funzioni possono essere riutilizzate in tutti gli step
// ====================================================================

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
          if (!spell.spell_list.map(x => x.toLowerCase()).includes(value)) valid = false;
        }
      }
    });
    return valid;
  });
}

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
          // Se l'entry riguarda "ancestry", aggiunge un dropdown
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
  // Traits
  let traits = [];
  const rawEntries = rawData.entries || [];
  rawEntries.forEach(entry => {
    if (entry.name && entry.entries) {
      const description = Array.isArray(entry.entries)
        ? entry.entries.join(" ")
        : entry.entries;
      traits.push({
        name: entry.name,
        description: description,
        level_requirement: 1
      });
    }
  });
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
  // Spellcasting: in questa versione base non elaboriamo particolarmente, prendiamo direttamente additionalSpells
  let spellcasting = rawData.additionalSpells || null;

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
    tool_choices: tool_choices
  };
}

// ====================================================================
// STEP FUNCTIONS – Funzioni specifiche per ciascun step
// ====================================================================

// ----- STEP 1: Nome & Livello -----
document.addEventListener("DOMContentLoaded", () => {
  const step1Container = document.getElementById("step1");
  if (!step1Container) return;
  step1Container.innerHTML = `
    <h2>Step 1: Inserisci Nome e Livello</h2>
    <label for="characterName">Nome del Personaggio:</label>
    <input type="text" id="characterName" placeholder="Inserisci il nome">
    <br><br>
    <label for="levelSelect">Livello:</label>
    <select id="levelSelect">
      ${[...Array(20)].map((_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
    </select>
  `;
});

// ----- STEP 2: Razza e Visualizzazione Tratti -----
document.addEventListener("DOMContentLoaded", () => {
  const step2Container = document.getElementById("step2");
  if (!step2Container) return;
  
  // Popola il dropdown delle razze
  loadDropdownData("data/races.json", "raceSelect", "races");

  // Definisci la funzione per mostrare i tratti della razza selezionata
  window.displayRaceTraits = function () {
    const raceSelect = document.getElementById("raceSelect");
    if (!raceSelect) return;
    const racePath = raceSelect.value;
    if (!racePath) {
      document.getElementById("raceTraits").innerHTML = "<p>Seleziona una razza per vedere i tratti.</p>";
      return;
    }
    fetch(racePath)
      .then(response => response.json())
      .then(data => {
        const raceData = convertRaceData(data);
        // Salva globalmente i dati della razza per gli step successivi (es. Step 4)
        window.currentRaceData = raceData;
        let html = `<h3>Tratti di ${raceData.name}</h3>`;
        // Velocità
        if (raceData.speed) {
          if (typeof raceData.speed === "object") {
            const speeds = Object.entries(raceData.speed)
              .map(([type, value]) => `${type}: ${value} ft`)
              .join(", ");
            html += `<p><strong>Velocità:</strong> ${speeds}</p>`;
          } else {
            html += `<p><strong>Velocità:</strong> ${raceData.speed} ft</p>`;
          }
        }
        // Visione
        if (raceData.senses && raceData.senses.darkvision) {
          html += `<p><strong>Visione:</strong> ${raceData.senses.darkvision} ft</p>`;
        }
        // Tratti (lista)
        if (raceData.traits && raceData.traits.length > 0) {
          html += "<ul>";
          raceData.traits.forEach(trait => {
            html += `<li><strong>${trait.name}:</strong> ${trait.description || ""}</li>`;
          });
          html += "</ul>";
        }
        // Tabelle, se presenti
        const tablesHtml = renderTables(raceData.rawEntries);
        html += tablesHtml;
        document.getElementById("raceTraits").innerHTML = html;
      })
      .catch(err => {
        console.error("Errore caricando i tratti della razza:", err);
        handleError("Errore caricando i tratti della razza: " + err);
      });
  };

  document.getElementById("raceSelect").addEventListener("change", displayRaceTraits);
});

// ----- STEP 3: Point Buy System -----
document.addEventListener("DOMContentLoaded", () => {
  // Inizializza i valori al caricamento dello step
  initializeValues();
});

// (Le funzioni per il Point Buy (adjustPoints, updateFinalScores, initializeValues, applyRacialBonuses, resetRacialBonuses)
// sono già incluse nel file e sono utilizzate anche dallo step 3)

// ----- STEP 4: Selezione dei Tratti Extra -----
document.addEventListener("DOMContentLoaded", () => {
  const step4Container = document.getElementById("step4");
  if (!step4Container) return;

  // Imposta il markup iniziale dello step 4
  step4Container.innerHTML = `
    <h2>Step 4: Selezione dei Tratti Extra</h2>
    <div id="extraSpellcasting"></div>
    <div id="extraLanguages"></div>
    <div id="extraSkills"></div>
    <div id="extraTools"></div>
  `;

  // Render Extra Spellcasting
  function renderExtraSpellcasting(raceData) {
    if (
      raceData.spellcasting &&
      raceData.spellcasting.spell_choices &&
      raceData.spellcasting.spell_choices.type === "filter" &&
      Array.isArray(raceData.spellcasting.allSpells)
    ) {
      const levelSelect = document.getElementById("levelSelect");
      const currentLevel = levelSelect ? parseInt(levelSelect.value) || 1 : 1;
      const filteredSpells = raceData.spellcasting.allSpells.filter(
        spell => parseInt(spell.level) <= currentLevel
      );
      const groupedSpells = {};
      filteredSpells.forEach(spell => {
        const lvl = parseInt(spell.level);
        if (!groupedSpells[lvl]) groupedSpells[lvl] = [];
        groupedSpells[lvl].push(spell);
      });
      const levels = Object.keys(groupedSpells).map(Number).sort((a, b) => a - b);
      let html = "<h4>Spellcasting</h4>";
      levels.forEach(lvl => {
        const spellsAtLvl = groupedSpells[lvl];
        if (spellsAtLvl.length === 1) {
          html += `<p>Incantesimo di livello ${lvl}: ${spellsAtLvl[0].name}</p>`;
        } else if (spellsAtLvl.length > 1) {
          const options = spellsAtLvl
            .map(spell => `<option value="${spell.name}">${spell.name} (lvl ${spell.level})</option>`)
            .join("");
          html += `<p>Incantesimo di livello ${lvl}: 
                    <select id="extraSpellSelection_level_${lvl}">
                      <option value="">Seleziona...</option>
                      ${options}
                    </select>
                   </p>`;
        }
      });
      // Abilità di lancio
      if (raceData.spellcasting.ability_choices && Array.isArray(raceData.spellcasting.ability_choices)) {
        if (raceData.spellcasting.ability_choices.length === 1) {
          html += `<p>Abilità di lancio: ${raceData.spellcasting.ability_choices[0]}</p>`;
        } else if (raceData.spellcasting.ability_choices.length > 1) {
          const abilityOptions = raceData.spellcasting.ability_choices
            .map(ability => `<option value="${ability}">${ability}</option>`)
            .join("");
          html += `<p>Abilità di lancio: 
                    <select id="extraCastingAbility">
                      <option value="">Seleziona...</option>
                      ${abilityOptions}
                    </select>
                   </p>`;
        }
      }
      document.getElementById("extraSpellcasting").innerHTML = html;
    } else {
      document.getElementById("extraSpellcasting").innerHTML = "";
    }
  }

  // Render Extra Languages
  function renderExtraLanguages(raceData) {
    if (raceData.languages && raceData.languages.choice > 0) {
      loadLanguages(langs => {
        const availableLangs = langs.filter(
          lang => !raceData.languages.fixed.includes(lang)
        );
        const options = availableLangs
          .map(lang => `<option value="${lang}">${lang}</option>`)
          .join("");
        const html = `<h4>Lingue Extra</h4>
                      <select id="extraLanguageSelect">
                        <option value="">Seleziona...</option>
                        ${options}
                      </select>`;
        document.getElementById("extraLanguages").innerHTML = html;
      });
    } else {
      document.getElementById("extraLanguages").innerHTML = "";
    }
  }

  // (Placeholder) Render Extra Skills e Tools – da espandere se i dati lo prevedono
  function renderExtraSkills(raceData) {
    document.getElementById("extraSkills").innerHTML = "";
  }
  function renderExtraTools(raceData) {
    document.getElementById("extraTools").innerHTML = "";
  }

  // Se i dati della razza sono già salvati globalmente (step 2), li utilizza per renderizzare gli extra
  if (window.currentRaceData) {
    renderExtraSpellcasting(window.currentRaceData);
    renderExtraLanguages(window.currentRaceData);
    renderExtraSkills(window.currentRaceData);
    renderExtraTools(window.currentRaceData);
  }

  // Se il livello cambia, aggiorna la sezione spellcasting extra
  const levelSelect = document.getElementById("levelSelect");
  if (levelSelect) {
    levelSelect.addEventListener("change", () => {
      if (window.currentRaceData) {
        renderExtraSpellcasting(window.currentRaceData);
      }
    });
  }
});

// ----- STEP 8: Recap & Esportazione -----
document.addEventListener("DOMContentLoaded", () => {
  const step8Container = document.getElementById("step8");
  if (!step8Container) return;
  step8Container.innerHTML = `
    <h2>Step 8: Riepilogo ed Esportazione</h2>
    <div id="finalRecap"></div>
    <button id="btnGenerateJson">Esporta JSON</button>
  `;
  document.getElementById("btnGenerateJson").addEventListener("click", () => {
    // Esempio: raccoglie alcuni dati (puoi espandere questa parte)
    const character = {
      name: document.getElementById("characterName") ? document.getElementById("characterName").value : "",
      level: document.getElementById("levelSelect") ? document.getElementById("levelSelect").value : "",
      race: document.getElementById("raceSelect").selectedOptions[0] ? document.getElementById("raceSelect").selectedOptions[0].text : "",
      // Aggiungi altri campi se necessario
    };
    downloadJsonFile(
      character.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() + "_character.json",
      character
    );
    document.getElementById("finalRecap").innerHTML = `<pre>${JSON.stringify(character, null, 2)}</pre>`;
  });
});

// ====================================================================
// GENERATE FINAL JSON & DOWNLOAD (funzione comune usata anche nello Step 8)
// ====================================================================
function downloadJsonFile(filename, jsonData) {
  const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(jsonBlob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ====================================================================
// POINT BUY SYSTEM – (già integrato nello step3 e comune)
// ====================================================================

var totalPoints = 27;

function adjustPoints(ability, action) {
  const pointsSpan = document.getElementById(ability + "Points");
  let points = parseInt(pointsSpan.textContent);
  if (action === "add" && totalPoints > 0 && points < 15) {
    totalPoints -= (points >= 13 ? 2 : 1);
    points++;
  } else if (action === "subtract" && points > 8) {
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
    if (raceModEl) raceModEl.textContent = "0";
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

// ====================================================================
// NAVIGATION – Gestione della visualizzazione degli step
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {
  const steps = document.querySelectorAll(".step");
  function showStep(stepId) {
    steps.forEach(step => {
      if (step.id === stepId) {
        step.classList.add("active");
      } else {
        step.classList.remove("active");
      }
    });
  }
  document.getElementById("btnStep1").addEventListener("click", () => showStep("step1"));
  document.getElementById("btnStep2").addEventListener("click", () => showStep("step2"));
  document.getElementById("btnStep3").addEventListener("click", () => showStep("step3"));
  document.getElementById("btnStep4").addEventListener("click", () => showStep("step4"));
  document.getElementById("btnStep8").addEventListener("click", () => showStep("step8"));
  // Inizialmente mostra lo Step 1
  showStep("step1");
});
