import { DEFAULT_DATA } from './custom-data.js';

const FIELD_DESCRIPTIONS = {
  classes: {
    name: 'Class name as shown in step 2',
    description: 'Short summary displayed on the class card',
    hit_die: 'Hit die such as d8 or d10',
    saving_throws: 'Saving throw proficiencies (comma separated)',
    skill_proficiencies:
      'Either “choose N from ...” or list the fixed proficiencies',
    armor_proficiencies: 'Armor proficiencies (comma separated)',
    weapon_proficiencies: 'Weapon proficiencies (comma separated)',
    tool_proficiencies: 'Tool proficiencies (comma separated)',
    language_proficiencies: 'Languages granted (comma separated)',
    features_by_level:
      'Features “Level X - Feature: description”. One per line.',
  },
  races: {
    group: 'Base ancestry. Leave blank to create a new base race.',
    name: 'Subrace name (or same as group for single race)',
    ability:
      'List ability bonuses, e.g. "STR +2, DEX +1". Use comma separation for multiple bonuses.',
    size: 'Creature size (Tiny, Small, Medium, etc.)',
    speed: 'Speed in feet, e.g. 30',
    entries:
      'Traits. One trait per paragraph — name followed by description.',
    languages: 'Languages granted. Use comma separated list.',
    spells:
      'Optional innate spells. Format Level: Spell (Ability). Example "At will: Light (CHA)".',
    resist: 'Damage resistances (comma separated).',
  },
  backgrounds: {
    name: 'Background name',
    summary: 'Short description shown in the card preview',
    skills: 'Skill proficiencies (comma separated)',
    tools: 'Tool proficiencies (comma separated)',
    languages: 'Languages (comma separated)',
    feat: 'Feat granted or selectable (if any)',
    feature:
      'Feature text. Use paragraphs for multiple sentences.',
  },
  spells: {
    name: 'Spell name',
    level: 'Spell level (0-9)',
    school: 'Magic school (Evocation, etc.)',
    casting_time: 'Casting time, e.g. "1 action"',
    range: 'Range description',
    components: 'Components (V,S,M). Mention material details after dash if needed.',
    duration: 'Duration',
    classes:
      'Which spell lists learn this spell. Comma separated class names.',
    description:
      'Spell effect. Use natural language; bullet points become separate paragraphs.',
  },
  feats: {
    name: 'Feat name',
    prerequisite: 'Prerequisite text (optional)',
    benefit:
      'Main description of the feat. Use paragraphs for multiple effects.',
    ability:
      'Optional ability score increases, e.g. "STR +1".',
    features:
      'Sub-features or bullet list. One per line.',
  },
  equipment: {
    standard:
      'Standard items granted to every character. Comma separated list.',
    class_name: 'Class to extend/override. Use existing class name or the custom one.',
    fixed_items: 'Items always granted to the class (comma separated).',
    choice_label: 'Label for an equipment choice block.',
    choice_type: 'Choice type (radio, checkbox, select).',
    choice_options:
      'Options for the choice. One per line as "Label - Result"',
  },
};

export function getFieldDescriptions(category) {
  return FIELD_DESCRIPTIONS[category] || {};
}

export function getDefaultTemplate(category) {
  const defaults = DEFAULT_DATA[category];
  if (Array.isArray(defaults)) return [];
  if (defaults && typeof defaults === 'object') return {};
  return undefined;
}

export const TEXT_SAMPLES = {
  classes: `Name: Vanguard
Description: Frontline defender with tactical maneuvers.
Hit Die: d10
Saving Throws: Strength, Constitution
Skill Proficiencies: choose 2 from Athletics, Perception, Intimidation, Insight
Armor Proficiencies: Light armor, Medium armor, Shields
Weapon Proficiencies: Simple weapons, Martial weapons
Tool Proficiencies: Smith's tools
Languages: Common
Features:
Level 1 - Vanguard's Courage: You gain temporary hit points equal to your proficiency bonus at the start of each combat.
Level 2 - Tactical Shift: When you move at least 10 feet, one ally within 30 feet can move half their speed without provoking opportunity attacks.
Level 3 - Vanguard Archetype: Choose a specialization for further abilities.
---
Name: Vanguard (Aegis)
Description: Protective archetype for the Vanguard.
Features:
Level 3 - Radiant Shield: When you use Vanguard's Courage, choose an ally within 10 feet to gain the same amount of temporary hit points.
Level 7 - Intercept Strike: As a reaction, reduce the damage an ally takes by your proficiency bonus.`,
  races: `Name: Crystalborn
Group: Crystalborn
Ability: CON +2, WIS +1
Size: Medium
Speed: 30
Languages: Common, Terran
Resist: Radiant
Traits:
Shardlight: You can cast the guidance cantrip.
Crystalline Form: Advantage on checks to resist forced movement.
---
Name: Crystalborn (Ember)
Ability: STR +1
Traits:
Ember Shield: You gain resistance to fire damage.
Molten Burst: Once per long rest, cause a creature that hits you to take fire damage equal to your proficiency bonus.`,
  backgrounds: `Name: City Watcher
Summary: Veteran of the city watch who knows every alley.
Skills: Insight, Perception
Tools: Thieves' Tools
Languages: Common
Feat: Alert
Feature: Watchful Presence - You can always find a safe place to stay within a settlement protected by a watch.`,
  spells: `Name: Radiant Pulse
Level: 1
School: Evocation
Casting Time: 1 action
Range: 60 feet (10-foot radius)
Components: V, S
Duration: Instantaneous
Classes: Cleric, Paladin
Description:
A wave of radiant energy erupts from a point you can see. Creatures in a 10-foot radius must make a Constitution save or take 2d6 radiant damage, half on success.
Augment: Damage increases by 1d6 when cast using a slot of 2nd level or higher.`,
  feats: `Name: Shield Adept
Prerequisite: Proficiency with shields
Ability: STR +1
Benefit: You gain a +1 bonus to AC while wielding a shield.
Benefit: When you Dodge while holding a shield, you can impose disadvantage on one attack made against an ally within 5 feet.`,
  equipment: `Standard: Backpack, Rations (3 days)
Class: Vanguard
Fixed: Chain mail, Shield
Choice: Primary Weapon
Type: radio
Option: Longsword - Longsword
Option: Warhammer - Warhammer
Choice: Pack
Type: select
Option: Explorer's Pack - Explorer's Pack
Option: Diplomat's Pack - Diplomat's Pack`
};
