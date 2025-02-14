// ==================== RACE DATA CONVERSION ====================
export function convertRaceData(rawData) {
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
    let abilityChoices = new Set(); // Evitiamo duplicati

    rawData.additionalSpells.forEach(spellData => {
        // 📌 Gestione incantesimi conosciuti
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

        // 📌 Raccolta delle opzioni per lo spellcasting ability
        if (spellData.ability) {
            if (typeof spellData.ability === "string") { 
                abilityChoices.add(spellData.ability.toUpperCase()); 
            } else if (spellData.ability.choose && Array.isArray(spellData.ability.choose)) {
                spellData.ability.choose.forEach(a => abilityChoices.add(a.toUpperCase()));
            }
        }
    });

    // 📌 Se sono presenti incantesimi conosciuti, aggiungiamo la lista di selezione fissa
    if (spellsArray.length > 0) {
        spellcasting = spellcasting || {};  
        spellcasting.spell_choices = {
            type: "fixed_list",
            options: spellsArray.map(s => s.name)
        };
    }

    spellcasting = spellcasting || {};  

    // 📌 Controllo per Alto Elfo
    if (rawData.name.toLowerCase().includes("elf (high)")) {
        console.log(`🧠 ${rawData.name}: Spellcasting Ability forzata a INT (nessun dropdown).`);
        spellcasting.ability_choices = ["INT"];
    } 
    // 📌 Controllo per Deep Gnome
    else if (rawData.name.toLowerCase().includes("deep gnome")) {
        console.log(`🧠 ${rawData.name}: Spellcasting Ability selezionabile tra INT, WIS, CHA.`);
        spellcasting.ability_choices = Array.from(abilityChoices).length > 0 ? Array.from(abilityChoices) : ["INT", "WIS", "CHA"];
    } 
    // 📌 Per tutte le altre razze
    else {
        spellcasting.ability_choices = Array.from(abilityChoices);
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
    languages.options.push("Qualsiasi lingua (decisa con il DM)");
  }
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
    skill_choices: rawData.skillProficiencies || null,
    tool_choices: rawData.toolProficiencies || null,
    variant_feature_choices: variant_feature_choices
  };
}
