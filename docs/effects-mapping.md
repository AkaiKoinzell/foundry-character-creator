Effects & Activities Mapping (v13)

Overview
- This document summarizes item-level Active Effects and Activities we attach during export to make level-1 features and fighting styles usable immediately. Keys target the dnd5e v13 system.

Fighting Styles (Fighter)
- Archery
  - Active Effect: system.bonuses.rwak.attack = +2
  - Scope: all ranged weapon attacks (approximate)
- Defense
  - Active Effect: system.attributes.ac.bonus = +1
  - Scope: unconditional (approximate, Foundry lacks a simple built-in armor-only constraint)
- Dueling
  - Active Effect: system.bonuses.mwak.damage = +2
  - Scope: unconditional approximation (true rule applies to one-handed melee weapons when no other weapons are held)

Class Features (Level 1)
- Fighter: Second Wind
  - Uses: 1/short rest
  - Activity: heal 1d10 + fighter level (bonus action)
- Barbarian: Rage
  - Uses (per long rest): 2 (Lv1–5), 3 (Lv6–11), 4 (Lv12–16), 5 (Lv17–19), 6 (Lv20)
  - Activity: “Rage” (bonus action); mechanical rider effects are not automated
- Bard: Bardic Inspiration
  - Uses: CHA mod (min 1) per long rest
  - Activity: “Bardic Inspiration (d6)” (bonus action)
- Paladin: Divine Sense
  - Uses: 1 + CHA mod per long rest
  - Activity: “Divine Sense” (action)
- Paladin: Lay on Hands
  - Uses pool: 5 × paladin level (long rest)
  - Activity: “Lay on Hands” (action, simple heal placeholder)
- Rogue: Sneak Attack
  - Activity: “Sneak Attack (Xd6)” (special); X scales ~ ceil(level/2)
- Wizard: Arcane Recovery
  - Uses: 1/long rest
  - Activity: “Arcane Recovery” (special)
- Monk: Martial Arts
  - Activity: “Unarmed Strike (1d4)” (bonus action); die scales with level in rules but remains 1d4 here for Lv1

Spells
- When Plutonium data is available, exported spell items include:
  - system (casting time, range, duration, components, save),
  - description HTML, effects, activities, and image where provided.

Weapons (Mundane, PHB)
- Export writes item.system fields (damage.parts, properties, range, versatile) and merges Plutonium details when present.
- Property codes used: fin (finesse), lgt (light), two (two-handed), hvy (heavy), rch (reach), thr (thrown), amm (ammunition), lod (loading).

Notes & Limitations
- Some style/feature conditions are approximated to avoid complex rule engines (e.g., Dueling, Defense conditions). Adjust as desired.
- For features that depend on context (e.g., Disciple of Life bonus healing), we currently provide description/activities rather than stateful automation.

Tuning
- If you prefer different keys or scopes (e.g., AC path for Defense, add/remove bonuses for specific styles), point me to your preference and I can adjust effects accordingly.

