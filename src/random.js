import {
  DATA,
  loadClasses,
  loadBackgrounds,
  loadRaces,
  fetchJsonWithRetry
} from './data.js';

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a simple random character and store it for the main app to load.
 */
export async function generateRandomCharacter() {
  await Promise.all([loadClasses(), loadBackgrounds(), loadRaces()]);

  const raceGroup = randomChoice(Object.keys(DATA.races));
  const raceVariant = randomChoice(DATA.races[raceGroup]);
  const raceDetail = await fetchJsonWithRetry(
    raceVariant.path,
    `race at ${raceVariant.path}`
  );

  const backgroundName = randomChoice(Object.keys(DATA.backgrounds));
  const background = DATA.backgrounds[backgroundName];
  const classObj = randomChoice(DATA.classes);

  const baseAbilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const abilities = {};
  for (const ab of Object.keys(baseAbilities)) {
    abilities[ab] = { value: baseAbilities[ab] };
  }

  const character = {
    playerName: '',
    name: 'Random Hero',
    type: 'character',
    classes: [
      {
        name: classObj.name || classObj.className || 'Class',
        level: 1,
      },
    ],
    feats: [],
    equipment: [],
    knownSpells: {},
    raceChoices: {
      spells: [],
      spellAbility: '',
      size: '',
      alterations: {},
      resist: '',
      tools: [],
      weapons: [],
    },
    bonusAbilities: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    baseAbilities,
    system: {
      details: {
        race: raceDetail.name || raceVariant.name || raceGroup,
        background: background.name || backgroundName,
        origin: '',
        age: 0,
      },
      abilities,
      skills: [],
      tools: [],
      spells: { cantrips: [], pact: { value: 0, max: 0, level: 0 } },
      traits: { languages: { value: [] } },
      expertise: [],
      resources: {},
      attributes: { prof: 2 },
    },
    prototypeToken: { name: 'Random Hero' },
  };

  localStorage.setItem('characterState', JSON.stringify(character));
  window.location.href = 'index.html';
}

export default { generateRandomCharacter };
