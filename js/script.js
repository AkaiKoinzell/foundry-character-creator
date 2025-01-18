document.addEventListener("DOMContentLoaded", function () {
    console.log("Script.js caricato!");

    // Controlliamo se gli elementi esistono
    if (!document.getElementById("raceSelect") || !document.getElementById("classSelect")) {
        console.error("Elementi #raceSelect o #classSelect non trovati nel DOM!");
        return;
    }

    // Caricamento iniziale delle razze e classi
    loadDropdownData("data/races.json", "raceSelect", "races");
    loadDropdownData("data/classes.json", "classSelect", "classes");

    // Aggiungi listener per aggiornare le sottorazze e sottoclassi
    document.getElementById("raceSelect").addEventListener("change", updateSubraces);
    document.getElementById("classSelect").addEventListener("change", updateSubclasses);
});

function loadDropdownData(jsonPath, selectId, key) {
    fetch(jsonPath)
        .then(response => response.json())
        .then(data => {
            console.log(`Dati ricevuti da ${jsonPath}:`, data);

            if (!data[key]) {
                throw new Error(`Formato JSON errato in ${jsonPath}`);
            }

            let options = Object.keys(data[key]).map(name => ({
                name,
                path: data[key][name]
            }));

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
        opt.value = option.path; // Usa path per fetch successivi
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

    let raceFilePath = raceSelect.value;
    console.log(`Tentativo di caricamento: ${raceFilePath}`);

    fetch(raceFilePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`File ${raceFilePath} non trovato!`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Dati caricati per ${raceFilePath}:`, data);
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

// Caricamento sottoclassi dinamico
function updateSubclasses() {
    console.log("updateSubclasses chiamata!");

    let classSelect = document.getElementById("classSelect");
    let subclassSelect = document.getElementById("subclassSelect");

    if (!classSelect || !subclassSelect) {
        console.error("Elementi non trovati nel DOM.");
        return;
    }

    let classFilePath = classSelect.value;
    if (!classFilePath) {
        console.warn("Nessuna classe selezionata.");
        subclassSelect.style.display = "none";
        return;
    }

    fetch(classFilePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`File ${classFilePath} non trovato!`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Dati caricati per ${classFilePath}:`, data);
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
        .catch(error => console.error(`Errore caricando ${classFilePath}:`, error));
}
