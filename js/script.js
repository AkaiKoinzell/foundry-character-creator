document.addEventListener("DOMContentLoaded", function () {
    const raceSelect = document.getElementById("race");
    const classSelect = document.getElementById("class");
    const subraceContainer = document.getElementById("subrace-container");
    const subraceSelect = document.getElementById("subrace");
    const subclassContainer = document.getElementById("subclass-container");
    const subclassSelect = document.getElementById("subclass");

    // Carica le razze dal file JSON
    function loadRaces() {
        fetch("..data/races.json")  // Assicurati che il file esista
            .then(response => response.json())
            .then(data => {
                raceSelect.innerHTML = '<option value="">Seleziona una razza</option>';
                Object.keys(data).forEach(race => {
                    let option = document.createElement("option");
                    option.value = race;
                    option.textContent = race;
                    raceSelect.appendChild(option);
                });
            })
            .catch(error => console.error("Errore nel caricamento delle razze:", error));
    }

    // Carica le classi dal file JSON
    function loadClasses() {
        fetch("..data/classes.json")  // Assicurati che il file esista
            .then(response => response.json())
            .then(data => {
                classSelect.innerHTML = '<option value="">Seleziona una classe</option>';
                Object.keys(data).forEach(className => {
                    let option = document.createElement("option");
                    option.value = className;
                    option.textContent = className;
                    classSelect.appendChild(option);
                });
            })
            .catch(error => console.error("Errore nel caricamento delle classi:", error));
    }

    // Carica le sottorazze della razza selezionata
    function updateSubraces() {
        let selectedRace = raceSelect.value;
        if (!selectedRace) {
            subraceContainer.style.display = "none";
            return;
        }

        let racePath = `..data/races/${selectedRace.toLowerCase()}.json`;
        fetch(racePath)
            .then(response => response.json())
            .then(data => {
                if (data.subraces && Object.keys(data.subraces).length > 0) {
                    subraceContainer.style.display = "block";
                    subraceSelect.innerHTML = "";

                    Object.keys(data.subraces).forEach(subrace => {
                        let option = document.createElement("option");
                        option.value = subrace;
                        option.textContent = subrace;
                        subraceSelect.appendChild(option);
                    });
                } else {
                    subraceContainer.style.display = "none";
                }
            })
            .catch(error => console.error("Errore nel caricamento delle sottorazze:", error));
    }

    // Carica le sottoclassi della classe selezionata
    function updateSubclasses() {
        let selectedClass = classSelect.value;
        if (!selectedClass) {
            subclassContainer.style.display = "none";
            return;
        }

        let classPath = `..data/classes/${selectedClass.toLowerCase()}.json`;
        fetch(classPath)
            .then(response => response.json())
            .then(data => {
                if (data.subclasses && Object.keys(data.subclasses).length > 0) {
                    subclassContainer.style.display = "block";
                    subclassSelect.innerHTML = "";

                    Object.keys(data.subclasses).forEach(subclass => {
                        let option = document.createElement("option");
                        option.value = subclass;
                        option.textContent = subclass;
                        subclassSelect.appendChild(option);
                    });
                } else {
                    subclassContainer.style.display = "none";
                }
            })
            .catch(error => console.error("Errore nel caricamento delle sottoclassi:", error));
    }

    // Event listeners per aggiornare sottorazze e sottoclassi al cambio di selezione
    raceSelect.addEventListener("change", updateSubraces);
    classSelect.addEventListener("change", updateSubclasses);

    // Caricamento iniziale delle razze e classi
    loadRaces();
    loadClasses();
});
