document.addEventListener("DOMContentLoaded", function () {
    console.log("Script.js caricato!");

    // Carica la lista delle razze e classi
    loadDropdownData("data/races.json", "raceSelect", "races");
    loadDropdownData("data/classes.json", "classSelect", "classes");

    // Listener per aggiornare sottorazze e sottoclassi dinamicamente
    document.getElementById("raceSelect").addEventListener("change", updateSubraces);
    document.getElementById("classSelect").addEventListener("change", updateSubclasses);

    // Genera JSON finale
    document.getElementById("generateJson").addEventListener("click", generateFinalJson);

    // Inizializza il Point Buy System
    initializeValues();
});

// Funzione per caricare dati dai JSON
function loadDropdownData(jsonPath, selectId, key) {
    fetch(jsonPath)
        .then(response => response.json())
        .then(data => {
            console.log(`Dati ricevuti da ${jsonPath}:`, data);
            if (!data[key]) {
                console.error(`Chiave ${key} non trovata in ${jsonPath}`);
                return;
            }
            let options = Object.keys(data[key]).map(name => ({ name, path: data[key][name] }));
            populateDropdown(selectId, options);
        })
        .catch(error => console.error(`Errore caricando ${jsonPath}:`, error));
}

// Funzione per popolare i dropdown
function populateDropdown(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`Elemento #${selectId} non trovato!`);
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

// Aggiorna le sottorazze
function updateSubraces() {
    let racePath = document.getElementById("raceSelect").value;
    let subraceSelect = document.getElementById("subraceSelect");
    let racialBonusDiv = document.getElementById("racialBonusSelection");

    if (!racePath) {
        subraceSelect.innerHTML = '<option value="">Nessuna sottorazza disponibile</option>';
        subraceSelect.style.display = "none";
        racialBonusDiv.style.display = "none";  // Nascondi il blocco se non c'è razza
        resetRacialBonuses();  // 🔹 Resetta i bonus se la razza viene cambiata
        return;
    }

    fetch(racePath)
        .then(response => response.json())
        .then(data => {
            console.log("Dati sottorazze:", data);
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

            // Mostra il selettore dei bonus di razza
            racialBonusDiv.style.display = "block";

            // Reset dei bonus quando si cambia razza
            resetRacialBonuses();
        })
        .catch(error => console.error("Errore caricando le sottorazze:", error));
}

// Aggiorna le sottoclassi
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
            console.log("Dati sottoclassi:", data);
            subclassSelect.innerHTML = '<option value="">Seleziona una sottoclasse</option>';
            data.subclasses.forEach(subclass => {
                let option = document.createElement("option");
                option.value = subclass.name;
                option.textContent = subclass.name;
                subclassSelect.appendChild(option);
            });
            subclassSelect.style.display = data.subclasses.length > 0 ? "block" : "none";
        })
        .catch(error => console.error("Errore caricando le sottoclassi:", error));
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
    var abilities = ["str", "dex", "con", "int", "wis", "cha"];
    abilities.forEach(function(ability) {
        var basePoints = parseInt(document.getElementById(ability + "Points").textContent);
        var raceModifier = parseInt(document.getElementById(ability + "RaceModifier").value) || 0;
        var backgroundTalent = parseInt(document.getElementById(ability + "BackgroundTalent").value) || 0;
        var finalScore = basePoints + raceModifier + backgroundTalent;

        var finalScoreElement = document.getElementById(ability + "FinalScore");
        finalScoreElement.textContent = finalScore > 18 ? "Errore" : finalScore;
        finalScoreElement.style.color = finalScore > 18 ? "red" : "";
    });
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
    let bonus1 = document.getElementById("racialBonus1").value;
    let bonus2 = document.getElementById("racialBonus2").value;
    let bonus3 = document.getElementById("racialBonus3").value;

    if (!bonus1 || !bonus2 || !bonus3) {
        alert("Seleziona tutte e tre le caratteristiche per distribuire il bonus razziale.");
        return;
    }

    if (bonus1 === bonus2 && bonus1 === bonus3) {
        alert("Non puoi assegnare tutti i bonus alla stessa caratteristica!");
        return;
    }

    // Resetta tutti i bonus a zero prima di riassegnarli
    let racialBonuses = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };

    // Assegna i bonus correttamente
    if (bonus1 === bonus2 || bonus1 === bonus3 || bonus2 === bonus3) {
        racialBonuses[bonus1] += 2;
        racialBonuses[bonus2] += 1;
    } else {
        racialBonuses[bonus1] += 1;
        racialBonuses[bonus2] += 1;
        racialBonuses[bonus3] += 1;
    }

    // Applica i bonus di razza e aggiorna il DOM (i <span>)
    for (let stat in racialBonuses) {
        document.getElementById(stat + "RaceModifier").textContent = racialBonuses[stat];  // Aggiorna solo visualmente
    }

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
