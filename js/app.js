let remainingPoints = 27;
const attributes = {
    "strength": 8, "dexterity": 8, "constitution": 8,
    "intelligence": 8, "wisdom": 8, "charisma": 8
};

const pointCosts = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

function adjustAttribute(attribute, change) {
    let newValue = attributes[attribute] + change;
    if (newValue < 8 || newValue > 15) return;

    let newCost = pointCosts[newValue];
    let oldCost = pointCosts[attributes[attribute]];
    let costDifference = newCost - oldCost;

    if (remainingPoints - costDifference < 0) return;

    attributes[attribute] = newValue;
    remainingPoints -= costDifference;

    document.getElementById(`${attribute}-value`).textContent = newValue;
    document.getElementById("remaining-points").textContent = remainingPoints;
}

// 🔹 Caricamento dinamico delle sottorazze
function updateSubraces() {
    const selectedRace = document.getElementById("race").value;
    fetch(`/races/${selectedRace}.json`)
        .then(response => response.json())
        .then(raceData => {
            let subraceSelect = document.getElementById("subrace");
            let subraceContainer = document.getElementById("subrace-container");
            subraceSelect.innerHTML = "";
            if (raceData.subraces.length > 0) {
                subraceContainer.style.display = "block";
                raceData.subraces.forEach(subrace => {
                    let option = document.createElement("option");
                    option.value = subrace.toLowerCase().replace(/ /g, "_");
                    option.text = subrace;
                    subraceSelect.appendChild(option);
                });
            } else {
                subraceContainer.style.display = "none";
            }
        })
        .catch(error => console.error("Errore nel caricamento della razza:", error));
}

// 🔹 Caricamento dinamico delle sottoclassi
function updateSubclasses() {
    const selectedClass = document.getElementById("class").value;
    fetch(`/classes/${selectedClass}.json`)
        .then(response => response.json())
        .then(classData => {
            let subclassSelect = document.getElementById("subclass");
            let subclassContainer = document.getElementById("subclass-container");
            subclassSelect.innerHTML = "";
            if (classData.subclasses.length > 0) {
                subclassContainer.style.display = "block";
                classData.subclasses.forEach(subclass => {
                    let option = document.createElement("option");
                    option.value = subclass.toLowerCase().replace(/ /g, "_");
                    option.text = subclass;
                    subclassSelect.appendChild(option);
                });
            } else {
                subclassContainer.style.display = "none";
            }
        })
        .catch(error => console.error("Errore nel caricamento della classe:", error));
}

// 🔹 Caricamento dinamico degli incantesimi per classe
function updateSpells() {
    const selectedClass = document.getElementById("class").value;
    fetch(`/spells/${selectedClass}_spells.json`)
        .then(response => response.json())
        .then(spellData => {
            let spellListContainer = document.getElementById("spell-list");
            spellListContainer.innerHTML = "";
            Object.keys(spellData.spell_list).forEach(level => {
                let levelTitle = document.createElement("h4");
                levelTitle.textContent = `Livello ${level}:`;
                spellListContainer.appendChild(levelTitle);

                let spellUl = document.createElement("ul");
                spellData.spell_list[level].forEach(spell => {
                    let li = document.createElement("li");
                    li.textContent = spell;
                    spellUl.appendChild(li);
                });

                spellListContainer.appendChild(spellUl);
            });
        })
        .catch(error => console.error("Errore nel caricamento degli incantesimi:", error));
}

// 🔹 Caricamento dinamico delle feature della sottoclasse
function loadSubclassData() {
    const selectedSubclass = document.getElementById("subclass").value;
    fetch(`/subclasses/${selectedSubclass}.json`)
        .then(response => response.json())
        .then(subclassData => {
            let featuresList = document.getElementById("class-features");
            featuresList.innerHTML = "";
            Object.keys(subclassData.features_by_level).forEach(level => {
                let li = document.createElement("li");
                li.textContent = `Lv ${level}: ${subclassData.features_by_level[level].join(", ")}`;
                featuresList.appendChild(li);
            });
        })
        .catch(error => console.error("Errore nel caricamento della sottoclasse:", error));
}

// 🔹 Generazione del file JSON finale
function generateCharacterJSON() {
    const character = {
        name: document.getElementById("character-name").value || "Personaggio senza nome",
        race: document.getElementById("race").value,
        subrace: document.getElementById("subrace-container").style.display === "none" ? null : document.getElementById("subrace").value,
        class: document.getElementById("class").value,
        subclass: document.getElementById("subclass-container").style.display === "none" ? null : document.getElementById("subclass").value,
        level: parseInt(document.getElementById("level").value),
        attributes: attributes
    };

    fetch(`/classes/${character.class}.json`)
        .then(response => response.json())
        .then(classData => {
            character["features"] = getClassFeatures(classData, character.level);
            if (character.subclass) {
                return fetch(`/subclasses/${character.subclass}.json`);
            }
            return null;
        })
        .then(response => response ? response.json() : null)
        .then(subclassData => {
            if (subclassData) {
                character["subclass_features"] = getSubclassFeatures(subclassData, character.level);
            }
            finalizeCharacter(character);
        })
        .catch(error => console.error("Errore nella generazione del JSON:", error));
}

// 🔹 Funzione per filtrare i tratti della classe in base al livello
function getClassFeatures(classData, level) {
    let features = [];
    Object.keys(classData.features_by_level).forEach(lvl => {
        if (parseInt(lvl) <= level) {
            features.push(...classData.features_by_level[lvl]);
        }
    });
    return features;
}

// 🔹 Funzione per filtrare i tratti della sottoclasse in base al livello
function getSubclassFeatures(subclassData, level) {
    let features = [];
    Object.keys(subclassData.features_by_level).forEach(lvl => {
        if (parseInt(lvl) <= level) {
            features.push(...subclassData.features_by_level[lvl]);
        }
    });
    return features;
}

// 🔹 Creazione e download del file JSON
function finalizeCharacter(character) {
    const jsonBlob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(jsonBlob);
    link.download = "character.json";
    link.textContent = "Scarica il JSON del personaggio";
    document.getElementById("download-link").innerHTML = '';
    document.getElementById("download-link").appendChild(link);
}
