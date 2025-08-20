#!/usr/bin/env python3
import json

STARTING_CANTRIPS = {
    "Artificer": 2,
    "Bard": 2,
    "Cleric": 3,
    "Druid": 2,
    "Sorcerer": 4,
    "Warlock": 2,
    "Wizard": 3,
}

CLASS_FILES = {cls: f"data/classes/{cls.lower()}.json" for cls in STARTING_CANTRIPS}

def main():
    with open("data/spells.json", "r", encoding="utf-8") as f:
        spells = json.load(f)

    cantrips_by_class = {cls: [] for cls in STARTING_CANTRIPS}
    for spell in spells:
        if spell.get("level") == 0:
            for cls in spell.get("spell_list", []):
                if cls in cantrips_by_class:
                    cantrips_by_class[cls].append(spell["name"])

    for cls, cantrips in cantrips_by_class.items():
        cantrips.sort()
        path = CLASS_FILES[cls]
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        choices = data.get("choices", [])
        choices = [c for c in choices if not (c.get("type") == "cantrips" and c.get("level") == 1)]
        count = STARTING_CANTRIPS[cls]
        choice = {
            "level": 1,
            "name": "Cantrip",
            "description": f"Choose {count} {cls.lower()} cantrips to learn",
            "count": count,
            "type": "cantrips",
            "selection": cantrips,
        }
        choices.append(choice)
        choices.sort(key=lambda c: c.get("level", 0))
        data["choices"] = choices
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
    print("Updated cantrip choices for classes.")

if __name__ == "__main__":
    main()
