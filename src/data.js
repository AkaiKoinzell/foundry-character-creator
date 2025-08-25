export const DATA = {};

/**
 * Fetches class data from the JSON index if it hasn't been loaded yet.
 * The resulting array of class objects is stored on `DATA.classes`.
 */
export async function loadClasses() {
  // Avoid re-fetching if classes are already present
  if (Array.isArray(DATA.classes) && DATA.classes.length) return;

  const indexRes = await fetch('data/classes.json');
  if (!indexRes.ok) throw new Error('Failed loading classes');
  const index = await indexRes.json();

  DATA.classes = [];
  for (const path of Object.values(index.items || {})) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed loading class at ${path}`);
    const cls = await res.json();
    DATA.classes.push(cls);
  }
}

/**
 * Fetches feats list if not already loaded.
 */
export async function loadFeats() {
  if (Array.isArray(DATA.feats) && DATA.feats.length) return;
  const res = await fetch('data/feats.json');
  if (!res.ok) throw new Error('Failed loading feats');
  const json = await res.json();
  DATA.feats = Object.keys(json.feats || {});
}

export const CharacterState = {
  name: "",
  type: "character",
  classes: [],
  feats: [],
  equipment: [],
  system: {
    abilities: {
      str: { value: 8 },
      dex: { value: 8 },
      con: { value: 8 },
      int: { value: 8 },
      wis: { value: 8 },
      cha: { value: 8 },
    },
    skills: [],
    currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
    attributes: {
      ac: 10,
      hp: { value: 1, max: 1 },
      init: { value: 0 },
      prof: 2,
    },
    details: {
      background: "",
      race: "",
      alignment: "",
    },
    traits: {
      size: "med",
      senses: { darkvision: 0 },
      languages: { value: [] },
    },
    resources: {
      primary: { value: 0, max: 0 },
      secondary: { value: 0, max: 0 },
      tertiary: { value: 0, max: 0 },
    },
    spells: {
      cantrips: [],
      spell1: { value: 0, max: 0 },
      spell2: { value: 0, max: 0 },
      spell3: { value: 0, max: 0 },
      spell4: { value: 0, max: 0 },
      spell5: { value: 0, max: 0 },
      spell6: { value: 0, max: 0 },
      spell7: { value: 0, max: 0 },
      spell8: { value: 0, max: 0 },
      spell9: { value: 0, max: 0 },
      pact: { value: 0, max: 0 },
    },
    tools: [],
  },
  prototypeToken: {
    name: "",
    actorLink: true,
    disposition: 1,
  },
};

export function totalLevel() {
  return (CharacterState.classes || []).reduce(
    (sum, cls) => sum + (cls.level || 0),
    0
  );
}

export function logCharacterState() {
  // Log a cloned copy to avoid reactive updates in the console
  console.log("CharacterState", JSON.parse(JSON.stringify(CharacterState)));
}
