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
                options = Object.keys(data.races).map(name => ({ name, path: data.races[name] }));
            } else if (data.classes && typeof data.classes === "object") {
                options = Object.keys(data.classes).map(name => ({ name, path: data.classes[name] }));
            } else {
                throw new Error(`Formato JSON errato in ${jsonPath}`);
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
        opt.value = option.path; // Usa path per fetch successivi
        opt.textContent = option.name;
        select.appendChild(opt);
    });

    console.log(`Dropdown #${selectId} aggiornato con ${options.length} opzioni!`);
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
function updateSubclasses() {
    console.log("updateSubclasses chiamata!");

    let classSelect = document.getElementById("classSelect");
    let subclassSelect = document.getElementById("subclassSelect");

    if (!classSelect || !subclassSelect) {
        console.error("Elementi non trovati nel DOM.");
        return;
    }

    let selectedClass = classSelect.value;
    console.log(`Classe selezionata: ${selectedClass}`);

    if (!selectedClass) {
        console.warn("Nessuna classe selezionata.");
        subclassSelect.innerHTML = '<option value="">Nessuna sottoclasse disponibile</option>';
        subclassSelect.style.display = "none";
        return;
    }

    let classFilePath = selectedClass;
    console.log(`Tentativo di caricamento: ${classFilePath}`);

    fetch(classFilePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`File ${classFilePath} non trovato!`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Dati caricati per ${selectedClass}:`, data);

            let subclasses = data.subclasses || [];

            if (subclasses.length === 0) {
                console.warn(`Nessuna sottoclasse trovata per ${selectedClass}`);
                subclassSelect.innerHTML = '<option value="">Nessuna sottoclasse disponibile</option>';
                subclassSelect.style.display = "none";
                return;
            }

            // Puliamo il dropdown
            subclassSelect.innerHTML = '<option value="">Seleziona una sottoclasse...</option>';

            // Aggiunge opzioni per ogni sottoclasse
            subclasses.forEach(subclass => {
                let option = document.createElement("option");
                option.value = subclass.name;
                option.textContent = `${subclass.name} (${subclass.features.join(", ")})`; // Mostra le abilità accanto al nome
                option.dataset.features = JSON.stringify(subclass.features); // Salva le abilità nei dati dell'opzione
                subclassSelect.appendChild(option);
            });

            subclassSelect.style.display = "block";
            console.log(`Sottoclassi caricate con successo: ${subclasses.length}`);
        })
        .catch(error => console.error(`Errore caricando ${classFilePath}:`, error));
}
