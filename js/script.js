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
});

function loadDropdownData(jsonPath, selectId, key) {
    fetch(jsonPath)
        .then(response => response.json())
        .then(data => {
            console.log(`Dati ricevuti da ${jsonPath}:`, data);
            let options = Object.keys(data[key]).map(name => ({ name, path: data[key][name] }));
            populateDropdown(selectId, options);
        })
        .catch(error => console.error(`Errore caricando ${jsonPath}:`, error));
}

function populateDropdown(selectId, options) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Seleziona...</option>';
    
    options.forEach(option => {
        let opt = document.createElement("option");
        opt.value = option.path;
        opt.textContent = option.name;
        select.appendChild(opt);
    });
}

function updateSubraces() {
    let racePath = document.getElementById("raceSelect").value;
    let subraceSelect = document.getElementById("subraceSelect");

    if (!racePath) {
        subraceSelect.style.display = "none";
        return;
    }

    fetch(racePath)
        .then(response => response.json())
        .then(data => {
            subraceSelect.innerHTML = '<option value="">Seleziona una sottorazza</option>';
            data.subraces.forEach(subrace => {
                let option = document.createElement("option");
                option.value = subrace.name;
                option.textContent = subrace.name;
                subraceSelect.appendChild(option);
            });
            subraceSelect.style.display = data.subraces.length > 0 ? "block" : "none";
        })
        .catch(error => console.error("Errore caricando le sottorazze:", error));
}

function updateSubclasses() {
    let classPath = document.getElementById("classSelect").value;
    let subclassSelect = document.getElementById("subclassSelect");

    if (!classPath) {
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
        .catch(error => console.error("Errore caricando le sottoclassi:", error));
}

function generateFinalJson() {
    let character = {
        name: document.getElementById("characterName").value || "Senza Nome",
        race: document.getElementById("raceSelect").selectedOptions[0].text,
        subrace: document.getElementById("subraceSelect").selectedOptions[0]?.text || "Nessuna",
        class: document.getElementById("classSelect").selectedOptions[0].text,
        subclass: document.getElementById("subclassSelect").selectedOptions[0]?.text || "Nessuna"
    };

    console.log("JSON finale:", JSON.stringify(character, null, 2));
}
// ---- POINT BUY SYSTEM ----
var totalPoints = 27;

function adjustPoints(ability, action) {
    var pointsSpan = document.getElementById(ability + "Points");
    var points = parseInt(pointsSpan.textContent);

    if (action === 'add' && totalPoints > 0 && points < 15) {
        if (points >= 13 && points < 14) {
            if (totalPoints >= 2) {
                totalPoints -= 2;
                points++;
            }
        } else if (points >= 14 && points < 15) {
            if (totalPoints >= 2) {
                totalPoints -= 2;
                points++;
            }
        } else {
            totalPoints--;
            points++;
        }
    } else if (action === 'subtract' && points > 8) {
        if (points > 13 && points <= 15) {
            totalPoints += 2;
            points--;
        } else {
            totalPoints++;
            points--;
        }
    }

    pointsSpan.textContent = points;
    document.getElementById("pointsRemaining").textContent = totalPoints;

    // Aggiorna i valori finali delle caratteristiche
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

        if (finalScore > 18) {
            finalScoreElement.textContent = "Errore";
            finalScoreElement.style.color = "red";
        } else {
            finalScoreElement.textContent = finalScore;
            finalScoreElement.style.color = "";
        }
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

document.addEventListener("DOMContentLoaded", function () {
    initializeValues();
});

        updateFinalScores();
    }
    initializeValues(); // Inizializza i valori quando la pagina viene caricata
});
