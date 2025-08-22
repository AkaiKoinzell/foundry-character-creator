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
  level: 1,
  class: null,
  race: null,
  background: null,
  skills: [],
  tools: [],
  languages: [],
  equipment: [],
  attributes: {
    str: 8,
    dex: 8,
    con: 8,
    int: 8,
    wis: 8,
    cha: 8,
  },
};

export function logCharacterState() {
  // Log a cloned copy to avoid reactive updates in the console
  console.log("CharacterState", JSON.parse(JSON.stringify(CharacterState)));
}
