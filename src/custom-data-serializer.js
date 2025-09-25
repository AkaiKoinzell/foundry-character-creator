function joinList(arr, separator = ', ') {
  return Array.isArray(arr) ? arr.filter(Boolean).join(separator) : '';
}

function formatEntries(entries = []) {
  return entries
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (!entry || typeof entry !== 'object') return '';
      const lines = [];
      if (entry.name) {
        lines.push(`${entry.name}: ${joinList(entry.entries, '\n') || ''}`.trim());
      } else if (entry.entries) {
        lines.push(entry.entries.join('\n'));
      }
      return lines.join('\n');
    })
    .filter(Boolean)
    .join('\n');
}

function serializeClass(entry = {}) {
  const lines = [];
  if (entry.name) lines.push(`Name: ${entry.name}`);
  if (entry.description) lines.push(`Description: ${entry.description}`);
  if (entry.hit_die) lines.push(`Hit Die: ${entry.hit_die}`);
  if (entry.saving_throws) lines.push(`Saving Throws: ${joinList(entry.saving_throws)}`);
  if (entry.skill_proficiencies) {
    if (Array.isArray(entry.skill_proficiencies)) {
      lines.push(`Skill Proficiencies: ${joinList(entry.skill_proficiencies)}`);
    } else if (entry.skill_proficiencies.choose) {
      lines.push(
        `Skill Proficiencies: choose ${entry.skill_proficiencies.choose} from ${joinList(
          entry.skill_proficiencies.from
        )}`
      );
    }
  }
  if (entry.armor_proficiencies)
    lines.push(`Armor Proficiencies: ${joinList(entry.armor_proficiencies)}`);
  if (entry.weapon_proficiencies)
    lines.push(`Weapon Proficiencies: ${joinList(entry.weapon_proficiencies)}`);
  if (entry.tool_proficiencies) lines.push(`Tool Proficiencies: ${joinList(entry.tool_proficiencies)}`);
  if (entry.language_proficiencies)
    lines.push(`Language Proficiencies: ${joinList(entry.language_proficiencies)}`);
  if (entry.spellcasting?.ability)
    lines.push(`Spellcasting Ability: ${entry.spellcasting.ability}`);
  if (Array.isArray(entry.subclasses) && entry.subclasses.length) {
    lines.push(`Subclasses: ${joinList(entry.subclasses.map((sc) => sc.name))}`);
  }
  const features = entry.features_by_level || {};
  Object.keys(features)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((lvl) => {
      (features[lvl] || []).forEach((feature) => {
        if (!feature || !feature.name) return;
        const desc = feature.entries ? feature.entries.join(' ') : '';
        const line = `Level ${lvl} - ${feature.name}: ${desc}`.trim();
        lines.push(line);
      });
    });
  return lines.join('\n');
}

function serializeRace(entry = {}) {
  const lines = [];
  if (entry.group) lines.push(`Group: ${entry.group}`);
  if (entry.name) lines.push(`Name: ${entry.name}`);
  if (entry.ability && entry.ability.length) {
    const parts = Object.entries(entry.ability[0] || {})
      .map(([key, val]) => `${key.toUpperCase()} +${val}`)
      .join(', ');
    if (parts) lines.push(`Ability: ${parts}`);
  }
  if (entry.size) lines.push(`Size: ${Array.isArray(entry.size) ? entry.size.join(', ') : entry.size}`);
  if (entry.speed) lines.push(`Speed: ${entry.speed}`);
  if (Array.isArray(entry.languageProficiencies) && entry.languageProficiencies.length) {
    const langs = Object.keys(entry.languageProficiencies[0] || {})
      .filter((k) => entry.languageProficiencies[0][k])
      .map((lang) => lang.charAt(0).toUpperCase() + lang.slice(1));
    if (langs.length) lines.push(`Languages: ${langs.join(', ')}`);
  }
  if (Array.isArray(entry.resist)) lines.push(`Resist: ${entry.resist.join(', ')}`);
  if (Array.isArray(entry.entries)) {
    lines.push('Traits:');
    entry.entries.forEach((trait) => {
      if (!trait) return;
      if (typeof trait === 'string') {
        lines.push(trait);
      } else if (trait.name) {
        lines.push(`${trait.name}: ${joinList(trait.entries, ' ')}`.trim());
      }
    });
  }
  return lines.join('\n');
}

function serializeBackground(entry = {}) {
  const lines = [];
  if (entry.name) lines.push(`Name: ${entry.name}`);
  if (entry.short || entry.description)
    lines.push(`Summary: ${entry.short || entry.description}`);
  if (entry.skills) lines.push(`Skills: ${joinList(entry.skills)}`);
  if (entry.tools) lines.push(`Tools: ${joinList(entry.tools)}`);
  if (entry.languages) lines.push(`Languages: ${joinList(entry.languages)}`);
  if (entry.featOptions && entry.featOptions.length)
    lines.push(`Feat: ${joinList(entry.featOptions)}`);
  const feature = entry.entries?.find((e) => e.name?.toLowerCase().includes('feature'));
  if (feature) {
    lines.push(`Feature: ${joinList(feature.entries, ' ')}`);
  }
  return lines.join('\n');
}

function serializeSpell(entry = {}) {
  const lines = [];
  if (entry.name) lines.push(`Name: ${entry.name}`);
  if (typeof entry.level === 'number') lines.push(`Level: ${entry.level}`);
  if (entry.school) lines.push(`School: ${entry.school}`);
  if (entry.casting_time) lines.push(`Casting Time: ${entry.casting_time}`);
  if (entry.range) lines.push(`Range: ${entry.range}`);
  if (entry.components) {
    const list = Object.keys(entry.components)
      .filter((key) => entry.components[key])
      .map((key) => key.toUpperCase());
    lines.push(`Components: ${list.join(', ')}`);
  }
  if (entry.duration) lines.push(`Duration: ${entry.duration}`);
  if (entry.spell_list) lines.push(`Classes: ${joinList(entry.spell_list)}`);
  if (entry.entries && entry.entries.length) {
    lines.push('Description:');
    entry.entries.forEach((line) => lines.push(typeof line === 'string' ? line : joinList(line.entries)));
  }
  if (entry.augment) lines.push(`Augment: ${entry.augment}`);
  return lines.join('\n');
}

function serializeFeat(entry = {}) {
  const lines = [];
  if (entry.name) lines.push(`Name: ${entry.name}`);
  const details = entry.details || entry;
  if (details.prerequisite) lines.push(`Prerequisite: ${joinList(details.prerequisite)}`);
  if (details.ability) {
    const parts = Object.entries(details.ability)
      .map(([key, val]) => `${key.toUpperCase()} +${val}`)
      .join(', ');
    lines.push(`Ability: ${parts}`);
  }
  const entries = details.entries || [];
  entries.forEach((item) => {
    if (typeof item === 'string') {
      lines.push(`Benefit: ${item}`);
    } else if (item && item.name) {
      lines.push(`${item.name}: ${joinList(item.entries, ' ')}`);
    }
  });
  return lines.join('\n');
}

function serializeEquipment(entry = {}) {
  const lines = [];
  if (entry.standard && entry.standard.length)
    lines.push(`Standard: ${joinList(entry.standard)}`);
  const classes = entry.classes || {};
  Object.entries(classes).forEach(([className, data]) => {
    lines.push(`Class: ${className}`);
    if (data.fixed && data.fixed.length) lines.push(`Fixed: ${joinList(data.fixed)}`);
    (data.choices || []).forEach((choice) => {
      lines.push(`Choice: ${choice.label}`);
      if (choice.type) lines.push(`Type: ${choice.type}`);
      (choice.options || []).forEach((opt) => {
        lines.push(`Option: ${opt.label} - ${opt.value}`);
      });
    });
  });
  return lines.join('\n');
}

export function serializeEntry(category, entry) {
  switch (category) {
    case 'classes':
      return serializeClass(entry);
    case 'races':
      return serializeRace(entry);
    case 'backgrounds':
      return serializeBackground(entry);
    case 'spells':
      return serializeSpell(entry);
    case 'feats':
      return serializeFeat(entry);
    case 'equipment':
      return serializeEquipment(entry);
    default:
      return JSON.stringify(entry, null, 2);
  }
}
