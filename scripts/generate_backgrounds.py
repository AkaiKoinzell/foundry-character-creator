import json, os

languages = ["Common","Dwarvish","Elvish","Giant","Gnomish","Goblin","Halfling","Orc","Abyssal","Celestial","Draconic","Deep Speech","Infernal","Primordial","Sylvan","Undercommon"]

artisan_tools = [
    "Alchemist's Supplies","Brewer's Supplies","Calligrapher's Tools","Carpenter's Tools",
    "Cartographer's Tools","Cobbler's Tools","Cook's Utensils","Glassblower's Tools",
    "Jeweler's Tools","Leatherworker's Tools","Mason's Tools","Painter's Supplies",
    "Potter's Tools","Smith's Tools","Tinker's Tools","Weaver's Tools","Woodcarver's Tools"
]

musical_instruments = [
    "Bagpipes","Drum","Dulcimer","Flute","Lute","Lyre","Horn","Pan Flute","Shawm","Viol"
]

gaming_sets = ["Dice Set","Dragonchess Set","Playing Card Set","Three-Dragon Ante Set"]

backgrounds = {
    "Acolyte": {
        "skills": ["Insight", "Religion"],
        "tools": [],
        "languages": {"choose": 2, "options": languages},
        "featOptions": ["Magic Initiate", "Eldritch Adept", "Ritual Caster"]
    },
    "Anthropologist": {
        "skills": ["Insight", "Religion"],
        "tools": [],
        "languages": {"choose": 2, "options": languages},
        "featOptions": ["Actor", "Chef", "Linguist"]
    },
    "Archaeologist": {
        "skills": ["History", "Survival"],
        "tools": {"choose": 1, "options": ["Cartographer's Tools", "Navigator's Tools"]},
        "languages": {"choose": 1, "options": languages},
        "featOptions": ["Antiquarian", "Dungeon Delver", "Linguist"]
    },
    "Artisan": {
        "skills": ["Insight", "Sleight of Hand"],
        "tools": {"choose": 1, "options": artisan_tools},
        "languages": {"choose": 1, "options": languages},
        "featOptions": ["Antiquarian", "Apothecary", "Tinkerer's Infusion"]
    },
    "Artist": {
        "skills": [],
        "skillChoices": {"choose": 2, "options": ["Insight", "History", "Perception", "Performance"]},
        "tools": {"choose": 1, "options": artisan_tools},
        "languages": {"choose": 1, "options": languages},
        "featOptions": ["Antiquarian", "Keen Mind", "Observant"]
    },
    "Athlete": {
        "skills": ["Acrobatics", "Athletics"],
        "tools": ["Vehicles (Land)"],
        "languages": {"choose": 1, "options": languages},
        "featOptions": ["Athlete", "Grappler", "Mobile"]
    },
    "Bounty Hunter": {
        "skills": [],
        "skillChoices": {"choose": 2, "options": ["Deception", "Insight", "Persuasion", "Stealth"]},
        "tools": {"choose": 2, "options": gaming_sets + musical_instruments + ["Thieves' Tools"]},
        "languages": [],
        "featOptions": ["Agile", "Alert", "Skulker"]
    },
    "Charlatan": {
        "skills": ["Deception", "Sleight of Hand"],
        "tools": ["Disguise Kit", "Forgery Kit"],
        "languages": [],
        "featOptions": ["Actor", "Persuasive", "Skill Expert"]
    },
    "City Watch": {
        "skills": ["Athletics", "Insight"],
        "tools": [],
        "languages": {"choose": 2, "options": languages},
        "featOptions": ["Alert", "Fighting Initiate", "Sentinel"]
    },
    "Cloistered Scholar": {
        "skills": ["History"],
        "skillChoices": {"choose": 1, "options": ["Arcana", "Nature", "Religion"]},
        "tools": [],
        "languages": {"choose": 2, "options": languages},
        "featOptions": ["Erudite", "Keen Mind", "Linguist"]
    },
    "Courtier": {
        "skills": ["Insight", "Persuasion"],
        "tools": [],
        "languages": {"choose": 2, "options": languages},
        "featOptions": ["Keen Mind", "Linguist", "Persuasive"]
    },
    "Criminal": {
        "skills": ["Deception", "Stealth"],
        "tools": ["Gaming Set", "Thieves' Tools"],
        "languages": [],
        "featOptions": ["Cruel", "Dungeon Delver", "Skulker"]
    },
    "Entertainer": {
        "skills": ["Acrobatics", "Performance"],
        "tools": ["Disguise Kit"],
        "toolChoices": {"choose": 1, "options": musical_instruments},
        "languages": [],
        "featOptions": ["Actor", "Agile", "Inspiring Leader"]
    },
    "Farmer": {
        "skills": ["Animal Handling", "Nature"],
        "tools": ["Cook's Utensils", "Brewer's Supplies", "Vehicles (Land)"],
        "languages": [],
        "featOptions": ["Beast Tamer", "Chef", "Tavern Brawler"]
    },
    "Fisherman": {
        "skills": ["Athletics", "Perception"],
        "tools": ["Fishing Tackle", "Vehicles (Water)"],
        "languages": [],
        "featOptions": ["Observant", "Shaft Specialist", "Skill Expert"]
    },
    "Folk Hero": {
        "skills": ["Animal Handling", "Survival"],
        "tools": ["Vehicles (Land)"],
        "toolChoices": {"choose": 1, "options": artisan_tools},
        "languages": [],
        "featOptions": ["Inspiring Leader", "Loyal Companion", "Skill Expert"]
    },
    "Gladiator": {
        "skills": ["Athletics", "Performance"],
        "tools": ["Gaming Set", "Vehicles (Land)"],
        "languages": [],
        "featOptions": ["Cruel", "Savage Attacker", "Tough"]
    },
    "Hermit": {
        "skills": ["Medicine"],
        "skillChoices": {"choose": 1, "options": ["Nature", "Religion"]},
        "tools": ["Herbalism Kit"],
        "languages": {"choose": 1, "options": languages},
        "featOptions": ["Alert", "Erudite", "Keen Mind"]
    },
    "Hunter": {
        "skills": ["Stealth", "Survival"],
        "tools": ["Carpenter's Tools", "Leatherworker's Tools"],
        "languages": [],
        "featOptions": ["Alert", "Crossbow Expert", "Sharpshooter"]
    },
    "Investigator": {
        "skills": [],
        "skillChoices": {"choose": 2, "options": ["Insight", "Investigation", "Perception"]},
        "tools": ["Disguise Kit", "Thieves' Tools"],
        "languages": [],
        "featOptions": ["Observant", "Keen Mind", "Skill Expert"]
    },
    "Knight": {
        "skills": ["History", "Persuasion"],
        "tools": ["Gaming Set"],
        "languages": {"choose": 1, "options": languages},
        "featOptions": ["Loyal Companion", "Mounted Combatant", "Squire of Solamnia"]
    },
    "Medic": {
        "skills": ["Medicine", "Sleight of Hand"],
        "tools": ["Alchemist's Supplies", "Herbalism Kit"],
        "languages": [],
        "featOptions": ["Apothecary", "Healer", "Slasher"]
    },
    "Merchant": {
        "skills": ["Insight", "Persuasion"],
        "tools": {"choose": 1, "options": artisan_tools},
        "languages": {"choose": 1, "options": languages},
        "featOptions": ["Linguist", "Persuasive", "Skill Expert"]
    },
    "Miner": {
        "skills": ["Athletics", "Survival"],
        "tools": ["Mason's Tools", "Vehicles (Land)"],
        "languages": [],
        "featOptions": ["Dungeon Delver", "Durable", "Tough"]
    },
    "Noble": {
        "skills": ["History", "Persuasion"],
        "tools": ["Gaming Set"],
        "languages": {"choose": 1, "options": languages},
        "featOptions": ["Defensive Duelist", "Inspiring Leader", "Persuasive"]
    },
    "Outlander": {
        "skills": ["Athletics", "Survival"],
        "tools": [],
        "toolChoices": {"choose": 1, "options": musical_instruments},
        "languages": {"choose": 1, "options": languages},
        "featOptions": ["Chef", "Keen Mind", "Tough"]
    },
    "Prostitute": {
        "skills": [],
        "skillChoices": {"choose": 2, "options": ["Deception", "Insight", "Performance", "Persuasion"]},
        "tools": {"choose": 1, "options": ["Disguise Kit"] + gaming_sets + musical_instruments},
        "languages": {"choose": 1, "options": languages},
        "featOptions": ["Observant", "Persuasive", "Skill Expert"]
    },
    "Sailor / Pirate": {
        "skills": ["Athletics", "Perception"],
        "tools": ["Navigator's Tools", "Vehicles (Water)"],
        "languages": [],
        "featOptions": ["Athlete", "Defensive Duelist", "Tavern Brawler"]
    },
    "Sage": {
        "skills": ["History"],
        "skillChoices": {"choose": 1, "options": ["Arcana", "Nature", "Medicine", "Religion"]},
        "tools": [],
        "languages": {"choose": 2, "options": languages},
        "featOptions": ["Apothecary", "Erudite", "Ritual Caster"]
    },
    "Scout": {
        "skills": ["Perception", "Survival"],
        "tools": ["Cartographer's Tools", "Navigator's Tools"],
        "languages": [],
        "featOptions": ["Alert", "Keen Mind", "Mobile"]
    },
    "Servant": {
        "skills": ["Insight", "Persuasion"],
        "tools": {"choose": 1, "options": ["Calligrapher's Tools", "Cook's Utensils", "Brewer's Supplies"] + musical_instruments + ["Vehicles (Land)"]},
        "languages": {"choose": 1, "options": languages},
        "featOptions": ["Keen Mind", "Observant", "Skill Expert"]
    },
    "Slave": {
        "skills": ["Animal Handling", "Athletics"],
        "tools": {"choose": 1, "options": ["Carpenter's Tools", "Mason's Tools", "Vehicles (Land)"]},
        "languages": {"choose": 1, "options": languages},
        "featOptions": ["Beast Tamer", "Die Hard", "Tough"]
    },
    "Soldier": {
        "skills": ["Athletics", "Intimidation"],
        "tools": ["Gaming Set", "Vehicles (Land)"],
        "languages": [],
        "featOptions": ["Fighting Initiate", "Martial Adept", "Weapon Master"]
    },
    "Spy": {
        "skills": ["Deception", "Stealth"],
        "tools": ["Disguise Kit", "Forgery Kit"],
        "languages": [],
        "featOptions": ["Actor", "Keen Mind", "Observant"]
    },
    "Tribe Member": {
        "skills": ["Athletics", "Survival"],
        "tools": {"choose": 1, "options": artisan_tools + musical_instruments},
        "languages": {"choose": 1, "options": languages},
        "featOptions": ["Charger", "Savage Attacker", "Tavern Brawler"]
    },
    "Urchin": {
        "skills": ["Sleight of Hand", "Stealth"],
        "tools": ["Disguise Kit", "Thieves' Tools"],
        "languages": [],
        "featOptions": ["Agile", "Die Hard", "Tavern Brawler"]
    }
}

# Create backgrounds directory if not exists
os.makedirs('data/backgrounds', exist_ok=True)

# Write individual background files
for name, data in backgrounds.items():
    filename = name.lower().replace(' ', '_').replace('/', '').replace("'", "")
    path = f"data/backgrounds/{filename}.json"
    data_with_name = {"name": name, **data}
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data_with_name, f, ensure_ascii=False, indent=2)

# Write backgrounds.json mapping
mapping = {name: f"data/backgrounds/{name.lower().replace(' ', '_').replace('/', '').replace("'", "")}.json" for name in backgrounds}
with open('data/backgrounds.json', 'w', encoding='utf-8') as f:
    json.dump({"items": mapping}, f, ensure_ascii=False, indent=2)
