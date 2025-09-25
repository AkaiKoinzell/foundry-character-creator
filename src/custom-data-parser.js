import { deepMerge } from './utils/merge.js';

function splitLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line);
}

function parseKeyValue(line) {
  const idx = line.indexOf(':');
  if (idx === -1) {
    return { key: line.trim().toLowerCase(), value: '' };
  }
  const key = line.slice(0, idx).trim().toLowerCase();
  const value = line.slice(idx + 1).trim();
  return { key, value };
}

function parseAbilityBonuses(value) {
  const bonuses = {};
  value
    .split(',')
    .map((segment) => segment.trim())
    .forEach((segment) => {
      const match = segment.match(/([A-Za-z]{3})\s*[+](\d+)/);
      if (match) {
        const [, ability, amount] = match;
        const key = ability.slice(0, 3).toLowerCase();
        bonuses[key] = Number(amount);
      }
    });
  return Object.keys(bonuses).length ? bonuses : null;
}

function parseEntries(lines) {
  const entries = [];
  let current = null;
  lines.forEach((line) => {
    if (!line) return;
    const headerMatch = line.match(/^(?:[-*]\s+)?([A-Za-z][^:]+):\s*(.*)$/);
    if (headerMatch) {
      const [, name, rest] = headerMatch;
      if (current) entries.push(current);
      current = { name: name.trim(), entries: rest ? [rest.trim()] : [] };
    } else if (current) {
      current.entries.push(line);
    } else {
      entries.push(line);
    }
  });
  if (current) entries.push(current);
  return entries;
}

function parseList(value = '') {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseSkillProficiencies(value) {
  if (!value) return undefined;
  const chooseMatch = value.match(/choose\s+(\d+)/i);
  if (chooseMatch) {
    const optionsSegment = value.split(/from/i)[1] || '';
    const options = parseList(optionsSegment);
    return { choose: Number(chooseMatch[1]), from: options };
  }
  const list = parseList(value);
  return list.length ? list : undefined;
}

function pushFeature(featuresByLevel, feature) {
  if (!feature) return;
  const { level, data } = feature;
  if (!level || !data.name) return;
  const bucket = (featuresByLevel[level] = featuresByLevel[level] || []);
  data.entries = data.entries && data.entries.length ? data.entries : undefined;
  bucket.push(data);
}

function parseClassBlock(block) {
  const lines = splitLines(block);
  if (!lines.length) return null;
  const cls = { features_by_level: {} };
  let currentFeature = null;

  lines.forEach((line) => {
    const featureMatch = line.match(/^(?:[-*]\s*)?level\s*(\d+)\s*-\s*([^:]+):?\s*(.*)$/i);
    if (featureMatch) {
      pushFeature(cls.features_by_level, currentFeature);
      const [, lvl, name, rest] = featureMatch;
      currentFeature = {
        level: lvl,
        data: { name: name.trim(), entries: rest ? [rest.trim()] : [] },
      };
      return;
    }

    const { key, value } = parseKeyValue(line);
    switch (key) {
      case 'name':
        cls.name = value;
        break;
      case 'description':
        cls.description = value;
        break;
      case 'hit die':
      case 'hitdie':
        cls.hit_die = value.startsWith('d') ? value : `d${value}`;
        break;
      case 'saving throws':
      case 'saves':
        cls.saving_throws = parseList(value);
        break;
      case 'skill proficiencies':
      case 'skills':
        cls.skill_proficiencies = parseSkillProficiencies(value);
        break;
      case 'armor proficiencies':
      case 'armor':
        cls.armor_proficiencies = parseList(value);
        break;
      case 'weapon proficiencies':
      case 'weapons':
        cls.weapon_proficiencies = parseList(value);
        break;
      case 'tool proficiencies':
      case 'tools':
        cls.tool_proficiencies = parseList(value);
        break;
      case 'language proficiencies':
      case 'languages':
        cls.language_proficiencies = parseList(value);
        break;
      case 'spellcasting ability':
        cls.spellcasting = cls.spellcasting || {};
        cls.spellcasting.ability = value;
        break;
      case 'subclass':
      case 'subclasses':
        cls.subclasses = parseList(value).map((name) => ({ name }));
        break;
      case 'features':
        // Treat remainder as traits collection
        if (currentFeature) {
          currentFeature.data.entries.push(value);
        }
        break;
      default:
        if (currentFeature) {
          currentFeature.data.entries.push(line);
        }
        break;
    }
  });

  pushFeature(cls.features_by_level, currentFeature);

  if (!Object.keys(cls.features_by_level).length) delete cls.features_by_level;
  return cls.name ? cls : null;
}

function parseSpellBlock(block) {
  const lines = splitLines(block);
  if (!lines.length) return null;
  const spell = { entries: [] };
  lines.forEach((line) => {
    const { key, value } = parseKeyValue(line);
    switch (key) {
      case 'name':
        spell.name = value;
        break;
      case 'level':
        spell.level = Number(value);
        if (Number.isNaN(spell.level)) spell.level = 0;
        break;
      case 'school':
        spell.school = value;
        break;
      case 'casting time':
      case 'time':
        spell.casting_time = value;
        break;
      case 'range':
        spell.range = value;
        break;
      case 'components':
        spell.components = parseList(value);
        break;
      case 'duration':
        spell.duration = value;
        break;
      case 'classes':
      case 'spell list':
        spell.spell_list = parseList(value);
        break;
      case 'ritual':
        spell.ritual = /yes|true/i.test(value);
        break;
      default:
        spell.entries.push(line);
        break;
    }
  });
  if (!spell.entries.length) delete spell.entries;
  return spell.name ? spell : null;
}

function parseRaceBlock(block) {
  const lines = splitLines(block);
  if (!lines.length) return null;
  const race = {};
  let traitsStart = [];
  lines.forEach((line) => {
    const { key, value } = parseKeyValue(line);
    switch (key) {
      case 'group':
      case 'base':
      case 'ancestry':
        race.group = value || undefined;
        break;
      case 'name':
        race.name = value;
        break;
      case 'size':
        race.size = value ? [value] : undefined;
        break;
      case 'speed':
        race.speed = Number(value) || value;
        break;
      case 'languages':
        race.languageProficiencies = [
          value
            .split(',')
            .map((v) => v.trim())
            .reduce((acc, lang) => {
              if (lang) acc[lang.toLowerCase()] = true;
              return acc;
            }, {}),
        ];
        break;
      case 'ability':
      case 'abilities':
        race.ability = parseAbilityBonuses(value) ? [parseAbilityBonuses(value)] : undefined;
        break;
      case 'resist':
      case 'resistance':
        race.resist = value.split(',').map((v) => v.trim()).filter(Boolean);
        break;
      case 'spells':
        race.additionalSpells = value.split(',').map((v) => v.trim()).filter(Boolean);
        break;
      case 'traits':
        traitsStart = value ? [value] : [];
        break;
      default:
        traitsStart.push(line);
        break;
    }
  });
  if (traitsStart.length) {
    race.entries = parseEntries(traitsStart);
  }
  return race.name ? race : null;
}

function parseBackgroundBlock(block) {
  const lines = splitLines(block);
  if (!lines.length) return null;
  const bg = { entries: [] };
  let featureLines = [];
  lines.forEach((line) => {
    const { key, value } = parseKeyValue(line);
    switch (key) {
      case 'name':
        bg.name = value;
        break;
      case 'summary':
      case 'description':
        bg.short = value;
        break;
      case 'skills':
        bg.skills = value.split(',').map((v) => v.trim()).filter(Boolean);
        break;
      case 'tools':
        bg.tools = value.split(',').map((v) => v.trim()).filter(Boolean);
        break;
      case 'languages':
        bg.languages = value.split(',').map((v) => v.trim()).filter(Boolean);
        break;
      case 'feat':
        bg.featOptions = value ? [value] : [];
        break;
      case 'feature':
        featureLines.push(value);
        break;
      default:
        featureLines.push(line);
    }
  });
  if (featureLines.length) {
    bg.entries.push({ name: 'Feature', entries: featureLines });
  }
  return bg.name ? bg : null;
}

function parseFeatBlock(block) {
  const lines = splitLines(block);
  if (!lines.length) return null;
  const feat = { details: { entries: [] } };
  lines.forEach((line) => {
    const { key, value } = parseKeyValue(line);
    switch (key) {
      case 'name':
        feat.name = value;
        feat.details.name = value;
        break;
      case 'prerequisite':
        feat.details.prerequisite = [value];
        break;
      case 'ability': {
        const ability = parseAbilityBonuses(value);
        if (ability) feat.details.ability = ability;
        break;
      }
      case 'benefit':
        feat.details.entries.push(value);
        break;
      default:
        feat.details.entries.push(line);
        break;
    }
  });
  return feat.name ? feat : null;
}

function parseEquipmentBlock(block) {
  const lines = splitLines(block);
  if (!lines.length) return null;
  const eq = { classes: {} };
  let currentClass = null;
  let currentChoice = null;
  lines.forEach((line) => {
    const { key, value } = parseKeyValue(line);
    switch (key) {
      case 'standard':
        eq.standard = value.split(',').map((v) => v.trim()).filter(Boolean);
        break;
      case 'class':
        currentClass = value;
        if (!eq.classes[currentClass]) {
          eq.classes[currentClass] = { fixed: [], choices: [] };
        }
        break;
      case 'fixed':
        if (currentClass) {
          eq.classes[currentClass].fixed.push(
            ...value.split(',').map((v) => v.trim()).filter(Boolean)
          );
        }
        break;
      case 'choice':
        if (currentClass) {
          currentChoice = { label: value, options: [] };
          eq.classes[currentClass].choices.push(currentChoice);
        }
        break;
      case 'type':
        if (currentChoice) currentChoice.type = value;
        break;
      case 'option':
        if (currentChoice) {
          const [label, result = label] = value.split('-').map((v) => v.trim());
          currentChoice.options.push({ label, value: result });
        }
        break;
      default:
        break;
    }
  });
  return Object.keys(eq.classes).length || (eq.standard && eq.standard.length) ? eq : null;
}

export function parseFreeformText(category, text) {
  if (!text || !text.trim()) return null;
  const blocks = text.split(/\n\s*---+\s*\n?/);
  const parsed = [];
  blocks.forEach((block) => {
    const trimmed = block.trim();
    if (!trimmed) return;
    let result = null;
    switch (category) {
      case 'classes':
        result = parseClassBlock(trimmed);
        break;
      case 'races':
        result = parseRaceBlock(trimmed);
        break;
      case 'backgrounds':
        result = parseBackgroundBlock(trimmed);
        break;
      case 'feats':
        result = parseFeatBlock(trimmed);
        break;
      case 'spells':
        result = parseSpellBlock(trimmed);
        break;
      case 'equipment':
        result = parseEquipmentBlock(trimmed);
        break;
      default:
        break;
    }
    if (result) parsed.push(result);
  });
  if (!parsed.length) return null;
  if (category === 'equipment') {
    return parsed.reduce((acc, entry) => deepMerge(acc, entry), {});
  }
  if (category === 'classes' || category === 'spells' || category === 'feats' || category === 'races' || category === 'backgrounds') {
    return parsed;
  }
  return parsed;
}
