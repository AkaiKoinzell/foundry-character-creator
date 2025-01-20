document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ Script.js caricato!");

    // Carica la lista delle razze e classi
    loadDropdownData("data/races.json", "raceSelect", "races");
    loadDropdownData("data/classes.json", "classSelect", "classes");

    // Listener per aggiornare sottorazze e sottoclassi dinamicamente
    document.getElementById("raceSelect").addEventListener("change", function() {
    displayRaceTraits();
});
    document.getElementById("racialBonus1").addEventListener("change", applyRacialBonuses);
    document.getElementById("racialBonus2").addEventListener("change", applyRacialBonuses);
    document.getElementById("racialBonus3").addEventListener("change", applyRacialBonuses);
    document.getElementById("levelSelect").addEventListener("change", function () {
    displayRaceTraits(); // Ricarica i tratti della razza in base al nuovo livello
});

    // Genera JSON finale
    document.getElementById("generateJson").addEventListener("click", generateFinalJson);

    // Inizializza il Point Buy System
    initializeValues();

    window.applyRacialBonuses = applyRacialBonuses;
});

// Funzione per caricare dati dai JSON
function loadDropdownData(jsonPath, selectId, key) {
    fetch(jsonPath)
        .then(response => response.json())
        .then(data => {
            console.log(`📜 Dati ricevuti da ${jsonPath}:`, data);
            if (!data[key]) {
                console.error(`❌ Chiave ${key} non trovata in ${jsonPath}`);
                return;
            }
            let options = Object.keys(data[key]).map(name => ({ name, path: data[key][name] }));
            populateDropdown(selectId, options);
        })
        .catch(error => console.error(`❌ Errore caricando ${jsonPath}:`, error));
}

// Funzione per popolare i dropdown
function populateDropdown(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`❌ Elemento #${selectId} non trovato!`);
        return;
    }
    select.innerHTML = '<option value="">Seleziona...</option>';
    options.forEach(option => {
        let opt = document.createElement("option");
        opt.value = option.path;
        opt.textContent = option.name;
        select.appendChild(opt);
    });
}

// ** MOSTRA I TRATTI DELLA RAZZA **
function displayRaceTraits() {
    let racePath = document.getElementById("raceSelect").value;
    let raceTraitsDiv = document.getElementById("raceTraits");
    let racialBonusDiv = document.getElementById("racialBonusSelection"); // Ensure bonus selection is shown

    if (!racePath) {
        raceTraitsDiv.innerHTML = "<p>Seleziona una razza per vedere i tratti.</p>";
        racialBonusDiv.style.display = "none"; // Hide racial bonus selection if no race is chosen
        resetRacialBonuses();
        return;
    }
fetch(racePath)
        .then(response => response.json())
        .then(data => {
            console.log("📜 Dati razza caricati:", data);

            let traitsHtml = <h3>Tratti di ${data.name}</h3>;

            // Display Speed
            traitsHtml += <p><strong>Velocità:</strong> ${data.speed} ft</p>;

            // Display Darkvision if present
            if (data.senses && data.senses.darkvision) {
                traitsHtml += <p><strong>Visione:</strong> ${data.senses.darkvision} ft</p>;
            }

            // Display Traits
            if (data.traits && data.traits.length > 0) {
                traitsHtml += <p><strong>Tratti:</strong></p><ul>;
                data.traits.forEach(trait => {
                    traitsHtml += <li><strong>${trait.name}:</strong> ${trait.description}</li>;
                });
                traitsHtml += </ul>;
            }

            // Handle Languages
            let languageHtml = <p><strong>Lingue Concesse:</strong> ${data.languages.fixed.join(", ")}</p>;
            if (data.languages.choice > 0) {
                languageHtml += <p>Scegli ${data.languages.choice} lingua/e extra:</p>;
                loadLanguages(languages => {
                    let options = languages.map(lang => <option value="${lang}">${lang}</option>).join("");
                    let select = <select>${options}</select>;
                    languageContainer.innerHTML = languageHtml + select;
                });
            } else {
                languageContainer.innerHTML = languageHtml;
            }

            // Handle Spellcasting Ability Selection (if available)
            if (data.spellcasting) {
                let spellSelect = data.spellcasting.ability_choices
                    .map(ability => <option value="${ability}">${ability}</option>)
                    .join("");
                
                traitsHtml += <p><strong>Abilità di lancio:</strong> 
                    <select id="castingAbility">
                        ${spellSelect}
                    </select>
                </p>;
            }

            raceTraitsDiv.innerHTML = traitsHtml;
            
            // 🛠 Show and reset racial bonuses
            racialBonusDiv.style.display = "block"; 
            resetRacialBonuses(); 
        })
        .catch(error => console.error("❌ Errore caricando i tratti della razza:", error));
}

// ** AGGIORNA LE SOTTOCLASSI **
function updateSubclasses() {
    let classPath = document.getElementById("classSelect").value;
    let subclassSelect = document.getElementById("subclassSelect");

    if (!classPath) {
        subclassSelect.innerHTML = '<option value="">Nessuna sottoclasse disponibile</option>';
        subclassSelect.style.display = "none";
        return;
    }

    fetch(classPath)
        .then(response => response.json())
        .then(data => {
            subclassSelect.innerHTML = '<option value="">Seleziona una sottoclasse</option>';
            data.subclasses.forEach(subclass => {
                let option = document.createElement("option");
                option.value = subclass.name;
                option.textContent = subclass.name;
                subclassSelect.appendChild(option);
            });
            subclassSelect.style.display = data.subclasses.length > 0 ? "block" : "none";
        })
        .catch(error => console.error("❌ Errore caricando le sottoclassi:", error));
}

// Genera il JSON finale
function generateFinalJson() {
    let character = {
        name: document.getElementById("characterName").value || "Senza Nome",
        level: document.getElementById("levelSelect").value || "1",
        race: document.getElementById("raceSelect").selectedOptions[0]?.text || "Nessuna",
        class: document.getElementById("classSelect").selectedOptions[0]?.text || "Nessuna",
        stats: {
            strength: document.getElementById("strFinalScore").textContent,
            dexterity: document.getElementById("dexFinalScore").textContent,
            constitution: document.getElementById("conFinalScore").textContent,
            intelligence: document.getElementById("intFinalScore").textContent,
            wisdom: document.getElementById("wisFinalScore").textContent,
            charisma: document.getElementById("chaFinalScore").textContent
        },
        racial_bonus: {
            strength: document.getElementById("strRaceModifier").value,
            dexterity: document.getElementById("dexRaceModifier").value,
            constitution: document.getElementById("conRaceModifier").value,
            intelligence: document.getElementById("intRaceModifier").value,
            wisdom: document.getElementById("wisRaceModifier").value,
            charisma: document.getElementById("chaRaceModifier").value
        },
        languages: {
            selected: document.getElementById("languageSelection").value || []
        }
    };

    console.log("✅ JSON finale generato:");
    console.log(JSON.stringify(character, null, 2));

    let filename = character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + "_character.json";
    downloadJsonFile(filename, character);

    alert("JSON generato e scaricato!");
}

function downloadJsonFile(filename, jsonData) {
    let jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(jsonBlob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
// ---- POINT BUY SYSTEM ----
var totalPoints = 27;

function adjustPoints(ability, action) {
    var pointsSpan = document.getElementById(ability + "Points");
    var points = parseInt(pointsSpan.textContent);

    if (action === 'add' && totalPoints > 0 && points < 15) {
        totalPoints -= (points >= 13 ? 2 : 1);
        points++;
    } else if (action === 'subtract' && points > 8) {
        totalPoints += (points > 13 ? 2 : 1);
        points--;
    }

    pointsSpan.textContent = points;
    document.getElementById("pointsRemaining").textContent = totalPoints;
    updateFinalScores();
}

function updateFinalScores() {
    let abilities = ["str", "dex", "con", "int", "wis", "cha"];

    abilities.forEach(function(ability) {
        let basePoints = parseInt(document.getElementById(ability + "Points").textContent);
        let raceModifier = parseInt(document.getElementById(ability + "RaceModifier").textContent); // 🔹 FIXATO textContent
        let backgroundTalent = parseInt(document.getElementById(ability + "BackgroundTalent").value) || 0;
        let finalScore = basePoints + raceModifier + backgroundTalent;

        let finalScoreElement = document.getElementById(ability + "FinalScore");
        finalScoreElement.textContent = finalScore;

        if (finalScore > 18) {
            finalScoreElement.style.color = "red";
        } else {
            finalScoreElement.style.color = "";
        }
    });

    console.log("🔄 Punteggi Finali aggiornati!");
}

// Inizializza i valori e aggiorna i punteggi
function initializeValues() {
    var abilities = ["str", "dex", "con", "int", "wis", "cha"];
    abilities.forEach(function(ability) {
        document.getElementById(ability + "RaceModifier").value = "0";
        document.getElementById(ability + "BackgroundTalent").value = "0";
    });
    updateFinalScores();
}

function applyRacialBonuses() {
    console.log("⚡ applyRacialBonuses() chiamata!");

    let bonus1 = document.getElementById("racialBonus1").value;
    let bonus2 = document.getElementById("racialBonus2").value;
    let bonus3 = document.getElementById("racialBonus3").value;

    if (!bonus1 || !bonus2 || !bonus3) {
        console.error("❌ Errore: tutti i bonus razza devono essere selezionati.");
        alert("⚠️ Devi selezionare tutti e tre i bonus razziali!");
        return;
    }

    let selections = [bonus1, bonus2, bonus3];
    let counts = {};
    selections.forEach(bonus => {
        counts[bonus] = (counts[bonus] || 0) + 1;
    });

    // 🔴 Validate distribution (+2/+1 or +1/+1/+1)
    let values = Object.values(counts);
    let validDistribution = 
        (values.includes(2) && values.includes(1) && values.length === 2) || // +2/+1
        (values.every(val => val === 1) && values.length === 3); // +1/+1/+1

    if (!validDistribution) {
        console.error("❌ Errore: distribuzione non valida.");
        alert("⚠️ Puoi assegnare +2 a una caratteristica e +1 a un'altra, oppure +1 a tre diverse!");
        return;
    }

    // 🛠 Apply bonuses
    let abilityFields = {
        str: document.getElementById("strRaceModifier"),
        dex: document.getElementById("dexRaceModifier"),
        con: document.getElementById("conRaceModifier"),
        int: document.getElementById("intRaceModifier"),
        wis: document.getElementById("wisRaceModifier"),
        cha: document.getElementById("chaRaceModifier"),
    };

    // Reset all racial modifiers
    Object.values(abilityFields).forEach(field => field.textContent = "0");

    // Apply the calculated bonuses
    Object.keys(counts).forEach(stat => {
        if (abilityFields[stat]) {
            abilityFields[stat].textContent = counts[stat]; // Update display
        }
    });

    console.log("✅ Bonus razziali applicati:", counts);
    updateFinalScores();
}


function resetRacialBonuses() {
    document.getElementById("racialBonus1").value = "";
    document.getElementById("racialBonus2").value = "";
    document.getElementById("racialBonus3").value = "";

    let abilityFields = ["str", "dex", "con", "int", "wis", "cha"];
    abilityFields.forEach(ability => {
        document.getElementById(ability + "RaceModifier").textContent = "0"; // Reset
    });

    updateFinalScores();
}

function loadLanguages(callback) {
    fetch("data/languages.json")
        .then(response => response.json())
        .then(data => {
            if (data.languages) {
                callback(data.languages);
            } else {
                console.error("❌ Errore: nessuna lingua trovata nel file JSON.");
            }
        })
        .catch(error => console.error("❌ Errore caricando le lingue:", error));
}
