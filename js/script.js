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

    let raceFilePath = raceSelect.value; // Percorso del file JSON
    console.log(`Tentativo di caricamento: ${raceFilePath}`);

    if (!raceFilePath) {
        console.warn("Nessuna razza selezionata.");
        subraceSelect.style.display = "none";
        return;
    }

    fetch(raceFilePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`File ${raceFilePath} non trovato!`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Dati caricati per ${raceFilePath}:`, data);
            
            // Controlliamo se il JSON contiene il campo subraces
            let subraces = data.subraces || [];

            subraceSelect.innerHTML = '<option value="">Seleziona una sottorazza...</option>';

            if (subraces.length > 0) {
                subraces.forEach(subrace => {
                    let option = document.createElement("option");
                    option.value = subrace.name;
                    option.textContent = subrace.name;
                    subraceSelect.appendChild(option);
                });

                subraceSelect.style.display = "block";
            } else {
                console.warn(`Nessuna sottorazza trovata per ${raceFilePath}`);
                subraceSelect.style.display = "none";
            }
        })
        .catch(error => console.error(`Errore caricando ${raceFilePath}:`, error));
}
// Caricamento sottoclassi dinamico
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
        subraceSelect.innerHTML = '<option value="">Nessuna sottorazza disponibile</option>';
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

            if (subraces.length === 0) {
                console.warn(`Nessuna sottorazza trovata per ${selectedRace}`);
                subraceSelect.innerHTML = '<option value="">Nessuna sottorazza disponibile</option>';
                subraceSelect.style.display = "none";
                return;
            }

            // Puliamo il dropdown
            subraceSelect.innerHTML = '<option value="">Seleziona una sottorazza...</option>';
            
            // Aggiunge opzioni per ogni sottorazza
            subraces.forEach(subrace => {
                let option = document.createElement("option");
                option.value = subrace.name;
                option.textContent = `${subrace.name} (${subrace.traits.join(", ")})`; // Mostra i tratti accanto al nome
                option.dataset.traits = JSON.stringify(subrace.traits); // Salva i tratti nei dati dell'opzione
                subraceSelect.appendChild(option);
            });

            subraceSelect.style.display = "block";
            console.log(`Sottorazze caricate con successo: ${subraces.length}`);
        })
        .catch(error => console.error(`Errore caricando ${raceFilePath}:`, error));
}
