document.addEventListener("DOMContentLoaded", function () {
    // Caricamento iniziale delle razze e classi
    loadDropdownData("data/races.json", "raceSelect");
    loadDropdownData("data/classes.json", "classSelect");

    // Aggiungi listener per aggiornare le sottorazze e sottoclassi
    document.getElementById("raceSelect").addEventListener("change", updateSubraces);
    document.getElementById("classSelect").addEventListener("change", updateSubclasses);
});

function loadDropdownData(jsonPath, selectId) {
    fetch(jsonPath)
        .then(response => response.json())
        .then(data => {
            console.log(`Dati caricati da ${jsonPath}:`, data);
            populateDropdown(selectId, data.list); // Il JSON deve avere {"list": [...]}
        })
        .catch(error => console.error(`Errore nel caricamento di ${jsonPath}:`, error));
}

function populateDropdown(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`Elemento #${selectId} non trovato`);
        return;
    }

    // Svuota il dropdown e aggiungi l'opzione iniziale
    select.innerHTML = '<option value="">Seleziona...</option>';

    // Popola le opzioni
    options.forEach(option => {
        let opt = document.createElement("option");
        opt.value = option.value || option;
        opt.textContent = option.name || option;
        select.appendChild(opt);
    });

    console.log(`Dropdown #${selectId} aggiornato!`);
}

// Funzione per aggiornare le sottorazze quando cambia la razza
function updateSubraces() {
    const race = document.getElementById("raceSelect").value;
    const subraceSelect = document.getElementById("subraceSelect");

    if (!race) {
        subraceSelect.style.display = "none";
        return;
    }

    fetch(`data/races/${race}.json`)
        .then(response => response.json())
        .then(data => {
            if (data.subraces && data.subraces.length > 0) {
                populateDropdown("subraceSelect", data.subraces);
                subraceSelect.style.display = "block";
            } else {
                subraceSelect.style.display = "none";
            }
        })
        .catch(error => console.error(`Errore nel caricamento della sottorazza ${race}:`, error));
}

// Funzione per aggiornare le sottoclassi quando cambia la classe
function updateSubclasses() {
    const selectedClass = document.getElementById("classSelect").value;
    const subclassSelect = document.getElementById("subclassSelect");

    if (!selectedClass) {
        subclassSelect.style.display = "none";
        return;
    }

    fetch(`data/classes/${selectedClass}.json`)
        .then(response => response.json())
        .then(data => {
            if (data.subclasses && data.subclasses.length > 0) {
                populateDropdown("subclassSelect", data.subclasses);
                subclassSelect.style.display = "block";
            } else {
                subclassSelect.style.display = "none";
            }
        })
        .catch(error => console.error(`Errore nel caricamento della sottoclasse ${selectedClass}:`, error));
}
