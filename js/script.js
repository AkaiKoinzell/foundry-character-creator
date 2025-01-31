document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ Script.js caricato!");

    // Carica la lista delle razze e classi
    loadDropdownData("data/races.json", "raceSelect", "races");
    loadDropdownData("data/classes.json", "classSelect", "classes");

    // Listener per aggiornare sottorazze e sottoclassi dinamicamente
    document.getElementById("raceSelect").addEventListener("change", updateSubraces);
    document.getElementById("raceSelect").addEventListener("change", displayRaceTraits);
    document.getElementById("subraceSelect").addEventListener("change", displaySubraceTraits);
    document.getElementById("classSelect").addEventListener("change", updateSubclasses);
    document.getElementById("racialBonus1").addEventListener("change", applyRacialBonuses);
    document.getElementById("racialBonus2").addEventListener("change", applyRacialBonuses);
    document.getElementById("racialBonus3").addEventListener("change", applyRacialBonuses);

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

    if (!racePath) {
        raceTraitsDiv.innerHTML = "<p>Seleziona una razza per vedere i tratti.</p>";
        return;
    }

    fetch(racePath)
        .then(response => response.json())
        .then(data => {
            console.log("📜 Dati razza caricati:", data);

            let traitsHtml = `<h3>Tratti di ${data.name}</h3>`;
            traitsHtml += `<p><strong>Velocità:</strong> ${data.speed} ft</p>`;
            if (data.senses && data.senses.darkvision) {
                traitsHtml += `<p><strong>Scurovisione:</strong> ${data.senses.darkvision} ft</p>`;
            }

            if (data.traits && data.traits.length > 0) {
                traitsHtml += `<p><strong>Tratti:</strong></p><ul>`;
                data.traits.forEach(trait => {
                    traitsHtml += `<li><strong>${trait.name}:</strong> ${trait.description}</li>`;
                });
                traitsHtml += `</ul>`;
            }

            if (data.languages && data.languages.length > 0) {
                traitsHtml += `<p><strong>Lingue Concesse:</strong> ${data.languages.join(", ")}</p>`;
            }

            raceTraitsDiv.innerHTML = traitsHtml;
            racialBonusDiv.style.display = "block"; // Mostra il div quando una razza è selezionata
        })
        .catch(error => console.error("❌ Errore caricando i tratti della razza:", error));
}

// ** MOSTRA I TRATTI DELLA SOTTORAZZA **
function displaySubraceTraits() {
    let racePath = document.getElementById("raceSelect").value;
    let subraceName = document.getElementById("subraceSelect").value;
    let subraceTraitsDiv = document.getElementById("subraceTraits");

    if (!racePath || !subraceName) {
        subraceTraitsDiv.innerHTML = "";
        return;
    }

    fetch(racePath)
        .then(response => response.json())
        .then(data => {
            let subraceData = data.subraces.find(sub => sub.name === subraceName);
            if (!subraceData) return;

            console.log("📜 Dati sottorazza caricati:", subraceData);

            let traitsHtml = `<h3>Tratti di ${subraceData.name}</h3>`;
            if (subraceData.traits && subraceData.traits.length > 0) {
                traitsHtml += `<p><strong>Tratti:</strong></p><ul>`;
                subraceData.traits.forEach(trait => {
                    traitsHtml += `<li><strong>${trait.name}:</strong> ${trait.description}</li>`;
                });
                traitsHtml += `</ul>`;
            }

            subraceTraitsDiv.innerHTML = traitsHtml;
        })
        .catch(error => console.error("❌ Errore caricando i tratti della sottorazza:", error));
}

// ** AGGIORNA LE SOTTORAZZE **
function updateSubraces() {
    let racePath = document.getElementById("raceSelect").value;
    let subraceSelect = document.getElementById("subraceSelect");
    let racialBonusDiv = document.getElementById("racialBonusSelection"); // Selettore bonus razziali

    if (!racePath) {
        subraceSelect.innerHTML = '<option value="">Nessuna sottorazza disponibile</option>';
        subraceSelect.style.display = "none";
        racialBonusDiv.style.display = "none"; // Nasconde il blocco dei bonus razziali se non c'è razza
        resetRacialBonuses();
        return;
    }
    
    fetch(racePath)
        .then(response => response.json())
        .then(data => {
            subraceSelect.innerHTML = '<option value="">Seleziona una sottorazza</option>';
            if (data.subraces) {
                data.subraces.forEach(subrace => {
                    let option = document.createElement("option");
                    option.value = subrace.name;
                    option.textContent = subrace.name;
                    subraceSelect.appendChild(option);
                });
                subraceSelect.style.display = data.subraces.length > 0 ? "block" : "none";
            }
             // 🔥 Mostra il selettore dei bonus razziali!
            racialBonusDiv.style.display = "block";
            resetRacialBonuses(); // Resetta i bonus ogni volta che si cambia razza
        })
        .catch(error => console.error("❌ Errore caricando le sottorazze:", error));
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
        subrace: document.getElementById("subraceSelect").selectedOptions[0]?.text || "Nessuna",
        class: document.getElementById("classSelect").selectedOptions[0]?.text || "Nessuna",
        subclass: document.getElementById("subclassSelect").selectedOptions[0]?.text || "Nessuna",
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
        console.error("❌ Errore: uno o più elementi dei bonus razza non sono stati selezionati.");
        return;
    }

    // 🔴 Controllo: nessuna caratteristica deve essere selezionata più di due volte!
    let selections = [bonus1, bonus2, bonus3];
    let counts = {};
    selections.forEach(bonus => {
        counts[bonus] = (counts[bonus] || 0) + 1;
    });

    let invalidSelections = Object.values(counts).some(count => count > 2);
    if (invalidSelections) {
        console.error("❌ Errore: una caratteristica è stata selezionata più di due volte.");
        alert("⚠️ Puoi assegnare al massimo +2 a una caratteristica e +1 a un'altra, oppure +1 a tre diverse!");
        return;
    }

    console.log(`Bonus selezionati: ${bonus1}, ${bonus2}, ${bonus3}`);

    let abilityFields = ["str", "dex", "con", "int", "wis", "cha"];
    let bonusDistribution = {
        str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0
    };

    // 🔹 Assegna i bonus rispettando la logica delle distribuzioni
    if (bonus1 === bonus2) {
        bonusDistribution[bonus1] += 2;
        bonusDistribution[bonus3] += 1;
    } else {
        bonusDistribution[bonus1] += 1;
        bonusDistribution[bonus2] += 1;
        bonusDistribution[bonus3] += 1;
    }

    abilityFields.forEach(stat => {
        document.getElementById(stat + "RaceModifier").textContent = bonusDistribution[stat]; // Usa textContent!
    });

    console.log("✅ Bonus razziali applicati:", bonusDistribution);

    updateFinalScores();
}

function resetRacialBonuses() {
    document.getElementById("racialBonus1").value = "";
    document.getElementById("racialBonus2").value = "";
    document.getElementById("racialBonus3").value = "";

    let abilities = ["str", "dex", "con", "int", "wis", "cha"];
    abilities.forEach(ability => {
        document.getElementById(ability + "RaceModifier").textContent = "0"; // Aggiorna solo la visualizzazione
    });

    updateFinalScores();
}