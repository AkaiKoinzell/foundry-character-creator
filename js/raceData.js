export const ALL_SKILLS = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival"
];

function flattenEntries(entries) {
  if (!Array.isArray(entries)) return "";
  return entries
    .map(e => {
      if (typeof e === "string") return e;
      if (e.entries) return flattenEntries(e.entries);
      if (e.items) return flattenEntries(e.items);
      return "";
    })
    .join(" ");
}

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
    if (typeof rawData.speed === 'object') {
      for (let key in rawData.speed) {
        speed[key] = (typeof rawData.speed[key] === 'boolean')
          ? (key === 'fly' ? 'equal to your walking speed' : 'unknown')
          : rawData.speed[key];
      }
    } else {
      speed = rawData.speed;
    }
  }

  // Senses
  let senses = {};
  if (rawData.senses && typeof rawData.senses === 'object') {
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
          ability_bonus.options.push({ type: 'fixed', values: { any: 2, any_other: 1 } });
        } else if (weights.length === 3) {
          ability_bonus.options.push({ type: 'three', values: { any: 1, any_other: 1, any_other_2: 1 } });
        }
      }
    });
  }

  // Variant Feature and Traits
  let variant_feature_choices = null;
  let traits = [];
  const rawEntries = rawData.entries || [];
  rawEntries.forEach(entry => {
    if (entry.type === 'inset' && entry.name && entry.name.toLowerCase().includes('variant feature')) {
      variant_feature_choices = (entry.entries || []).map(opt => ({
        name: opt.name,
        description: flattenEntries(opt.entries)
      }));
      const variantSummary = variant_feature_choices
        .map(opt => `<strong>${opt.name}:</strong> ${opt.description}`)
        .join(' ');
      traits.push({
        name: entry.name,
        description: variantSummary,
        level_requirement: 1
      });
    } else if (entry.name && entry.entries) {
      traits.push({
        name: entry.name,
        description: flattenEntries(entry.entries),
        level_requirement: entry.level || 1
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
      } else if (typeof lp[lang] === 'number') {
        languages.choice = lp[lang];
      }
    }
    if (languages.choice > 0 && languages.options.length === 0) {
      languages.options.push('Any other language you and your DM agree is appropriate');
    }
  }

  // Skill Choices
  let skill_choices = null;
  if (rawData.skillProficiencies && rawData.skillProficiencies.length > 0) {
    const spObj = rawData.skillProficiencies[0];
    if (spObj.choose && spObj.choose.from) {
      const count = spObj.choose.count ? spObj.choose.count : 1;
      skill_choices = { number: count, options: spObj.choose.from };
    } else if (typeof spObj.any === 'number') {
      skill_choices = { number: spObj.any, options: ALL_SKILLS };
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

  // Spellcasting (if present)
  let spellcasting = null;
  if (rawData.additionalSpells && rawData.additionalSpells.length > 0) {
    const sc = rawData.additionalSpells[0];
    spellcasting = {};

    // Ability choices (store as uppercase values)
    if (sc.ability) {
      let abilities = [];
      if (Array.isArray(sc.ability)) {
        abilities = sc.ability;
      } else if (typeof sc.ability === 'object' && sc.ability.choose) {
        abilities = Array.isArray(sc.ability.choose)
          ? sc.ability.choose
          : [sc.ability.choose];
      } else {
        abilities = [sc.ability];
      }
      spellcasting.ability_choices = abilities.map(a => a.toString().toUpperCase());
    }

    // Known spells / spell choices
    if (sc.known) {
      const fixedSpells = [];
      Object.values(sc.known).forEach(levelObj => {
        const entries = levelObj._ || [];
        entries.forEach(entry => {
          if (typeof entry === 'string') {
            fixedSpells.push(entry);
          } else if (entry.choose) {
            spellcasting.spell_choices = {
              type: 'filter',
              filter: entry.choose
            };
          }
        });
      });

      if (!spellcasting.spell_choices && fixedSpells.length > 1) {
        spellcasting.spell_choices = {
          type: 'fixed_list',
          options: fixedSpells
        };
      } else if (fixedSpells.length === 1) {
        spellcasting.fixed_spell = fixedSpells[0];
      }
    }
  }

  return {
    name: rawData.name,
    source: rawData.source + (rawData.page ? `, page ${rawData.page}` : ''),
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
    variant_feature_choices
  };
}
