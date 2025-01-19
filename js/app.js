document.addEventListener("DOMContentLoaded", function () {
    console.log("App.js caricato!");

    const raceSelect = document.getElementById("raceSelect");
    const subraceSelect = document.getElementById("subraceSelect");
    const classSelect = document.getElementById("classSelect");
    const subclassSelect = document.getElementById("subclassSelect");
    const pointsRemainingSpan = document.getElementById("points-remaining");

    let pointsRemaining = 27;
    let baseStats = {
        "strength": 10,
        "dexterity": 10,
        "constitution": 10,
        "intelligence": 10,
        "wisdom": 10,
        "charisma": 10
    };

    // Funzione per caricare una razza e aggiornare sottorazze e bonus
    async function loadRaceData(racePath) {
        try {
            let response = await fetch(racePath);
            let data = await response.json();

            console.log("Razza selezionata:", data);

            // Mostra/Nasconde il selettore delle sottorazze
            if (data.subraces && data.subraces.length > 0) {
                subraceSelect.innerHTML = '<option value="">Seleziona una sottorazza</option>';
                data.subraces.forEach(sub => {
                    let option = document.createElement("option");
                    option.value = sub.name;
                    option.textContent = sub.name;
                    subraceSelect.appendChild(option);
                });
                subraceSelect.style.display = "block";
            } else {
                subraceSelect.innerHTML = "";
                subraceSelect.style.display = "none";
            }

            // Applica i bonus di razza
            applyStatBonuses(data.bonus);
        } catch (error) {
            console.error("Errore nel caricamento della razza:", error);
        }
    }

    // Funzione per caricare una sottorazza e aggiornare i bonus
    async function loadSubraceData(subraceName) {
        try {
            let racePath = raceSelect.value;
            if (!racePath) return;

            let response = await fetch(racePath);
            let data = await response.json();

            let selectedSubrace = data.subraces.find(sub => sub.name === subraceName);
            if (selectedSubrace) {
                console.log("Sottorazza selezionata:", selectedSubrace);
                applyStatBonuses(selectedSubrace.traits);
            }
        } catch (error) {
            console.error("Errore nel caricamento della sottorazza:", error);
        }
    }

    // Funzione per caricare una classe e aggiornare sottoclassi
    async function loadClassData(classPath) {
        try {
            let response = await fetch(classPath);
            let data = await response.json();

            console.log("Classe selezionata:", data);

            if (data.subclasses && data.subclasses.length > 0) {
                subclassSelect.innerHTML = '<option value="">Seleziona una sottoclasse</option>';
                data.subclasses.forEach(sub => {
                    let option = document.createElement("option");
                    option.value = sub.name;
                    option.textContent = sub.name;
                    subclassSelect.appendChild(option);
                });
                subclassSelect.style.display = "block";
            } else {
                subclassSelect.innerHTML = "";
                subclassSelect.style.display = "none";
            }
        } catch (error) {
            console.error("Errore nel caricamento della classe:", error);
        }
    }

    // Funzione per applicare i bonus alle caratteristiche
    function applyStatBonuses(bonuses) {
        if (!bonuses) return;

        let currentStats = { ...baseStats };

        for (let stat in bonuses) {
            if (Array.isArray(bonuses[stat])) {
                bonuses[stat].forEach(bonus => {
                    currentStats[bonus] = (currentStats[bonus] || 10) + 1; // Aggiunge 1 per ogni caratteristica nella lista
                });
            } else {
                currentStats[stat] += bonuses[stat];
            }
        }

        let usedPoints = Object.values(currentStats).reduce((a, b) => a + (b - 10), 0);
        pointsRemaining = 27 - usedPoints;
        pointsRemainingSpan.textContent = pointsRemaining;
    }

    // Event Listeners
    raceSelect.addEventListener("change", function () {
        let selectedRace = raceSelect.value;
        if (selectedRace) loadRaceData(selectedRace);
    });

    subraceSelect.addEventListener("change", function () {
        let selectedSubrace = subraceSelect.value;
        if (selectedSubrace) loadSubraceData(selectedSubrace);
    });

    classSelect.addEventListener("change", function () {
        let selectedClass = classSelect.value;
        if (selectedClass) loadClassData(selectedClass);
    });
});
