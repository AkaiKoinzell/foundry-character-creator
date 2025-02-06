// common.js

// ----------------------
// Utility Functions
// ----------------------

// Gestione degli errori: stampa il messaggio in console e mostra un alert
function handleError(message) {
  console.error("❌ " + message);
  alert("⚠️ " + message);
}

// ----------------------
// Caricamento dati JSON
// ----------------------

// Carica i dati da un file JSON e popola un dropdown
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
        name,
        path: data[key][name]
      }));
      populateDropdown(selectId, options);
    })
    .catch(error => handleError(`Errore caricando ${jsonPath}: ${error}`));
}

// Carica le lingue da un file JSON e chiama la callback passando l’array di lingue
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

// ----------------------
// Funzioni per la manipolazione del DOM
// ----------------------

// Popola un dropdown (elemento select) con un array di opzioni
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

// ----------------------
// Funzioni per la conversione dei dati delle razze
// ----------------------

// Converti i dati grezzi di una razza nel formato usato dall’applicazione
function convertRaceData(rawData) {
  // Size: converti array in stringa (es. "M" diventa "Medium")
  let size = "Unknown";
  if (Array.isArray(rawData.size)) {
    size = (rawData.size[0] === "M") ? "Medium" : (rawData.size[0] === "S") ? "Small" : rawData.size[0];
  } else {
    size = rawData.size || "Unknown";
  }

  // Speed: gestisci sia oggetti che valori numerici
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

  // Senses: usa rawData.senses oppure rawData.darkvision
  let senses = {};
  if (rawData.senses && typeof rawData.senses === "object") {
    senses = rawData.senses;
  } else if (rawData.darkvision) {
    senses.darkvision = rawData.darkvision;
  }

  // Ability Bonus: estrai eventuali bonus dalle proprietà "ability"
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

  // Tratti: crea un array dei tratti (entries)
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

  // Spellcasting: elaborazione degli incantesimi
  let spellsArray = [];
  let abilityChoices = [];
  let spellcasting = {};
  if (rawData.additionalSpells && rawData.additionalSpells.length > 0) {
    rawData.additionalSpells.forEach(spellData => {
      // Gestione degli incantesimi innate
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
      // Gestione degli incantesimi "known"
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
      // Gestione della scelta dell'abilità di lancio
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

  // Lingue: converte la sezione languageProficiencies
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

  // Skill Choices: dalle skillProficiencies
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

  // Tool Choices: dalle toolProficiencies (se presenti)
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
    tool_choices: tool_choices
  };
}

// ----------------------
// Helper: Estrai il nome di uno spell
// ----------------------
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
