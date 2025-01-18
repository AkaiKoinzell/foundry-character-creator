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
    fetch(jsonPath)
        .then(response => response.json())
        .then(data => {
            console.log(`Dati ricevuti da ${jsonPath}:`, data);

            // Se il JSON ha una struttura con chiavi invece di una lista, trasformiamolo in array
            let options = [];

            if (data.list && Array.isArray(data.list)) {
                options = data.list; // Se è già un array, usalo così com'è
            } else if (data.races && typeof data.races === "object") {
                // Trasforma le chiavi dell'oggetto in un array di oggetti
                options = Object.keys(data.races).map(name => ({ name, path: data.races[name] }));
            } else if (data.classes && typeof data.classes === "object") {
                options = Object.keys(data.classes).map(name => ({ name, path: data.classes[name] }));
            }

            if (!options.length) {
                throw new Error(`Formato JSON errato in ${jsonPath}`);
            }

            populateDropdown(selectId, options);
        })
        .catch(error => console.error(`Errore caricando ${jsonPath}:`, error));
}

function populateDropdown(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`Elemento #${selectId} non trovato!`);
        return;
    }

    select.innerHTML = '<option value="">Seleziona...</option>'; // Resetta il dropdown

    options.forEach(option => {
        let opt = document.createElement("option");
        opt.value = option.path || option.name; // Usa path se esiste, altrimenti solo il nome
        opt.textContent = option.name;
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
    console.log(`Razza selezionata: ${selectedRace}`);

    if (!selectedRace) {
        console.warn("Nessuna razza selezionata.");
        subraceSelect.style.display = "none";
        return;
    }

    let raceFilePath = selectedRace;
    console.log(`Tentativo di caricamento: ${raceFilePath}`);

    fetch(raceFilePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`File ${raceFilePath} non trovato!`);
            }
            return response.json();
        })
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
        .catch(error => console.error(`Errore caricando ${raceFilePath}:`, error));
}

    // Carica il file JSON della razza scelta per ottenere le sottorazze
    fetch(`../data/races/${selectedRace}.json`)
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
    console.log("updateSubclasses chiamata!");

    let classSelect = document.getElementById("classSelect");
    let subclassSelect = document.getElementById("subclassSelect");

    if (!classSelect || !subclassSelect) {
        console.error("Elementi non trovati nel DOM.");
        return;
    }

    let selectedClass = classSelect.value;
    if (!selectedClass) {
        console.warn("Nessuna classe selezionata.");
        subclassSelect.style.display = "none";
        return;
    }

    // Carica il file JSON della classe scelta per ottenere le sottoclassi
    fetch(`../data/classes/${selectedClass}.json`)
        .then(response => response.json())
        .then(data => {
            console.log(`Dati caricati per ${selectedClass}:`, data);
            let subclasses = data.subclasses || [];

            subclassSelect.innerHTML = '<option value="">Seleziona una sottoclasse...</option>';

            subclasses.forEach(subclass => {
                let option = document.createElement("option");
                option.value = subclass.name;
                option.textContent = subclass.name;
                subclassSelect.appendChild(option);
            });

            subclassSelect.style.display = subclasses.length > 0 ? "block" : "none";
        })
        .catch(error => console.error("Errore caricando le sottoclassi:", error));
}
