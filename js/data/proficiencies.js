export const ARTISAN_TOOLS = [
  "Alchemist's Supplies",
  "Brewer's Supplies",
  "Calligrapher's Tools",
  "Carpenter's Tools",
  "Cartographer's Tools",
  "Cobbler's Tools",
  "Cook's Utensils",
  "Glassblower's Tools",
  "Jeweler's Tools",
  "Leatherworker's Tools",
  "Mason's Tools",
  "Painter's Supplies",
  "Potter's Tools",
  "Smith's Tools",
  "Tinker's Tools",
  "Weaver's Tools",
  "Woodcarver's Tools",
];

export const MUSICAL_INSTRUMENTS = [
  "Bagpipes",
  "Drum",
  "Dulcimer",
  "Flute",
  "Lute",
  "Lyre",
  "Horn",
  "Pan Flute",
  "Shawm",
  "Viol",
];

export const ALL_TOOLS = [
  ...ARTISAN_TOOLS,
  ...MUSICAL_INSTRUMENTS,
  "Disguise Kit",
  "Forgery Kit",
  "Herbalism Kit",
  "Navigator's Tools",
  "Poisoner's Kit",
  "Thieves' Tools",
  "Dice Set",
  "Dragonchess Set",
  "Playing Card Set",
  "Three-Dragon Ante Set",
  "Vehicle (Land)",
  "Vehicle (Water)",
];

export const ALL_LANGUAGES = [
  "Common",
  "Dwarvish",
  "Elvish",
  "Giant",
  "Gnomish",
  "Goblin",
  "Halfling",
  "Orc",
  "Abyssal",
  "Celestial",
  "Draconic",
  "Deep Speech",
  "Infernal",
  "Primordial",
  "Sylvan",
  "Undercommon",
];

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
  "Survival",
];

/**
 * Filters available proficiencies, returning a note if none of the provided
 * options remain. When no options are left, a full list minus taken entries is
 * returned instead with a localized note.
 * @param {string} type - 'languages', 'skills', or 'tools'.
 * @param {string[]} options - Initial options to consider.
 * @param {Set<string>} taken - Set of taken proficiencies (lowercase).
 * @param {string[]} [selected=[]] - Already selected proficiencies to retain.
 * @returns {{options: string[], note: string}}
 */
export function filterAvailableProficiencies(type, options, taken, selected = []) {
  const ALL = {
    languages: ALL_LANGUAGES,
    skills: ALL_SKILLS,
    tools: ALL_TOOLS,
  };
  const NOTES = {
    languages: " (tutte le lingue disponibili)",
    skills: " (tutte le abilità disponibili)",
    tools: " (tutti gli strumenti disponibili)",
  };

  const selectedLower = selected.map(s => s.toLowerCase());
  let filtered = options.filter(
    o => !taken.has(o.toLowerCase()) || selectedLower.includes(o.toLowerCase())
  );

  if (filtered.length === 0) {
    filtered = (ALL[type] || []).filter(
      o => !taken.has(o.toLowerCase()) || selectedLower.includes(o.toLowerCase())
    );
    return { options: filtered, note: NOTES[type] || "" };
  }

  return { options: filtered, note: "" };
}
