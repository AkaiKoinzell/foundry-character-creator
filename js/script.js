document.addEventListener("DOMContentLoaded", function () {
    console.log("Script.js caricato!");

    // Controlliamo se gli elementi esistono
    if (!document.getElementById("raceSelect") || !document.getElementById("classSelect")) {
        console.error("Elementi #raceSelect o #classSelect non trovati nel DOM!");
        return;
    }

    // Caricamento iniziale delle razze e classi
    loadDropdownData("data/races.json", "raceSelect");
    loadDropdownData("data/classes.json", "classSelect");

    // Aggiungi listener per aggiornare le sottorazze e sottoclassi
    document.getElementById("raceSelect").addEventListener("change", updateSubraces);
    document.getElementById("classSelect").addEventListener("change", updateSubclasses);
});

function loadDropdownData(jsonPath, selectId) {
    console.log(`Tentativo di caricamento: ${jsonPath}`);

    fetch(jsonPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Errore HTTP ${response.status} - File non trovato: ${jsonPath}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Dati ricevuti da ${jsonPath}:`, data);
            if (!data.list || !Array.isArray(data.list)) {
                throw new Error(`Formato JSON errato in ${jsonPath}`);
            }
            populateDropdown(selectId, data.list);
        })
        .catch(error => console.error(`Errore caricando ${jsonPath}:`, error));
}

function populateDropdown(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`Elemento #${selectId} non trovato`);
        return;
    }

    select.innerHTML = '<option value="">Seleziona...</option>';
    options.forEach(option => {
        let opt = document.createElement("option");
        opt.value = option.value || option;
        opt.textContent = option.name || option;
        select.appendChild(opt);
    });

    console.log(`Dropdown #${selectId} aggiornato con ${options.length} opzioni!`);
}
function updateSubraces() {
    console.log("updateSubraces chiamata!");

    let raceSelect = document.getElementById("raceSelect");
    let subraceSelect = document.getElementById("subraceSelect");

    if (!raceSelect || !subraceSelect) {
        console.error("Elementi non trovati nel DOM.");
        return;
    }

    let selectedRace = raceSelect.value;
    if (!selectedRace) {
        console.warn("Nessuna razza selezionata.");
        return;
    }

    // Carica il file JSON della razza scelta per ottenere le sottorazze
    fetch(`data/races/${selectedRace}.json`)
        .then(response => response.json())
        .then(data => {
            console.log(`Dati caricati per ${selectedRace}:`, data);
            let subraces = data.subraces || [];

            subraceSelect.innerHTML = '<option value="">Seleziona una sottorazza...</option>';

            subraces.forEach(subrace => {
                let option = document.createElement("option");
                option.value = subrace.name;
                option.textContent = subrace.name;
                subraceSelect.appendChild(option);
            });

            subraceSelect.style.display = subraces.length > 0 ? "block" : "none";
        })
        .catch(error => console.error("Errore caricando le sottorazze:", error));
}

// Caricamento sottoclassi dinamico
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
