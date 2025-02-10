// conversion.js
// ========================================================
// CONVERSIONE DEI DATI DELLA RAZZA
// Questa sezione contiene la funzione principale convertRaceData,
// che trasforma il JSON "grezzo" di una razza in un formato standardizzato.
// Vengono elaborati: size, speed, senses, ability_bonus, variant feature choices,
// tratti (traits), spellcasting, lingue, skill choices e tool choices.
// Tutto ciò verrà poi utilizzato dagli altri moduli dell’applicazione.
// ========================================================

console.log("✅ conversion.js loaded!");


/**
 * convertRaceData
 * Converte i dati grezzi (rawData) della razza in un oggetto formattato in modo standard.
 * Questa funzione gestisce vari aspetti:
 *   - Size: Determina la taglia ("Medium", "Small", etc.)
 *   - Speed: Processa la velocità (anche se è un oggetto, ad esempio per fly o walk)
 *   - Senses: Include proprietà come darkvision
 *   - Ability Bonus: Estrae eventuali bonus di abilità
 *   - Variant Feature e Traits: Converte le "entries" per tratti e variant feature
 *   - Spellcasting: Elabora lo spellcasting standard e/o extra (da additionalSpells)
 *   - Lingue: Gestisce le lingue conosciute e quelle extra da scegliere
 *   - Skill Choices e Tool Choices: Estrae eventuali opzioni per skills e tools
 *
 * @param {Object} rawData - I dati grezzi della razza (come ricevuti dal JSON)
 * @returns {Object} Un oggetto contenente i dati della razza in formato standardizzato
 */
function convertRaceData(rawData) {
  console.log("🔄 convertRaceData: Inizio conversione dei dati per la razza:", rawData.name);

  // ==================== Size ====================
  let size = "Unknown";
  if (Array.isArray(rawData.size)) {
    // Se l'array contiene "M" o "S", restituisce "Medium" o "Small"
    size = (rawData.size[0] === "M") ? "Medium" : (rawData.size[0] === "S") ? "Small" : rawData.size[0];
  } else {
    size = rawData.size || "Unknown";
  }
  console.log("   Size:", size);

  // ==================== Speed ====================
  let speed = {};
  if (rawData.speed) {
    if (typeof rawData.speed === "object") {
      for (let key in rawData.speed) {
        // Se il valore è booleano (es. per fly), restituisce un valore descrittivo
        speed[key] = (typeof rawData.speed[key] === "boolean")
          ? (key === "fly" ? "equal to your walking speed" : "unknown")
          : rawData.speed[key];
      }
    } else {
      speed = rawData.speed;
    }
  }
  console.log("   Speed:", speed);

  // ==================== Senses ====================
  let senses = {};
  if (rawData.senses && typeof rawData.senses === "object") {
    senses = rawData.senses;
  } else if (rawData.darkvision) {
    senses.darkvision = rawData.darkvision;
  }
  console.log("   Senses:", senses);

  // ==================== Ability Bonus ====================
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
  console.log("   Ability Bonus:", ability_bonus);

  // ==================== Variant Feature e Traits ====================
  let variant_feature_choices = null;
  let traits = [];
  const rawEntries = rawData.entries || [];
  rawEntries.forEach(entry => {
    // Se l'entry è una Variant Feature (tipicamente indicata come "inset" e contenente "variant feature")
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
      return; // Salta ulteriori elaborazioni per questa entry
    }
    // Se l'entry contiene tabelle (es. per dati particolari), le aggiunge così come sono
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
  console.log("   Traits elaborati:", traits.length, "elementi");

  // ==================== Spellcasting ====================
  // La logica per lo spellcasting è divisa in due rami:
  // 1. Lo spellcasting "standard", se esiste (data.spellcasting)
  // 2. Il caso extra, basato su additionalSpells (ad es. High Elf)
  let spellcasting = null;
  let extraSpellcasting = null;
  if (rawData.additionalSpells && rawData.additionalSpells.length > 0) {
    // Se il primo gruppo di additionalSpells contiene una struttura "known" con proprietà "_" (usata per filtri),
    // lo consideriamo come extraSpellcasting (ad es. per High Elf)
    let firstSpellGroup = rawData.additionalSpells[0];
    if (firstSpellGroup.known && firstSpellGroup.known["1"] && firstSpellGroup.known["1"]["_"]) {
      extraSpellcasting = rawData.additionalSpells;
      console.log("   Trovato extraSpellcasting (usato per razze come High Elf).");
    } else {
      // Altrimenti, processa additionalSpells in modo standard
      let spellsArray = [];
      let abilityChoices = [];
      rawData.additionalSpells.forEach(spellData => {
        // Incantesimi innate
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
        // Incantesimi "known"
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
        // Scelta dell'abilità di lancio
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
  console.log("   Spellcasting (standard):", spellcasting);
  console.log("   Extra Spellcasting:", extraSpellcasting);

  // ==================== Lingue ====================
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
  console.log("   Lingue:", languages);

  // ==================== Skill Choices ====================
  let skill_choices = null;
  if (rawData.skillProficiencies && rawData.skillProficiencies.length > 0) {
    const sp = rawData.skillProficiencies[0].choose;
    if (sp && sp.from) {
      const count = sp.count ? sp.count : 1;
      skill_choices = { number: count, options: sp.from };
    }
  }
  console.log("   Skill Choices:", skill_choices);

  // ==================== Tool Choices ====================
  let tool_choices = null;
  if (rawData.toolProficiencies && Array.isArray(rawData.toolProficiencies)) {
    rawData.toolProficiencies.forEach(tp => {
      if (tp.choose && tp.choose.from) {
        tool_choices = { number: 1, options: tp.choose.from };
      }
    });
  }
  console.log("   Tool Choices:", tool_choices);

  // Costruisce l'oggetto finale con tutti i dati convertiti
  const convertedData = {
    name: rawData.name,
    source: rawData.source + (rawData.page ? `, page ${rawData.page}` : ""),
    size: size,
    speed: speed,
    senses: senses,
    ability_bonus: ability_bonus,
    traits: traits,
    rawEntries: rawEntries,
    spellcasting: spellcasting,             // Dati spellcasting standard (se presenti)
    extraSpellcasting: extraSpellcasting,   // Dati extra per spellcasting (se presenti)
    languages: languages,
    skill_choices: skill_choices,
    tool_choices: tool_choices,
    variant_feature_choices: variant_feature_choices
  };

  console.log("✅ Conversione completata per la razza:", convertedData.name);
  return convertedData;
}

// Esponi la funzione globalmente per l'uso in altri moduli
window.convertRaceData = convertRaceData;
