// Funzione per caricare le razze
    async function loadRaceData(race) {
        try {
            let response = await fetch(`/races/${race.toLowerCase()}.json`);
            let data = await response.json();

            // Mostra/Nasconde il selettore delle sottorazze
            if (data.subraces && data.subraces.length > 0) {
                subraceSelect.innerHTML = `<option value="">Seleziona Sottorazza</option>`;
                data.subraces.forEach(sub => {
                    let option = document.createElement("option");
                    option.value = sub;
                    option.textContent = sub;
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

    // Funzione per caricare la sottorazza
    async function loadSubraceData(subrace) {
        try {
            let response = await fetch(`/subraces/${subrace.toLowerCase().replace(" ", "_")}.json`);
            let data = await response.json();

            // Applica i bonus di sottorazza
            applyStatBonuses(data.bonus);
        } catch (error) {
            console.error("Errore nel caricamento della sottorazza:", error);
        }
    }

    // Funzione per caricare la classe
    async function loadClassData(className) {
        try {
            let response = await fetch(`/classes/${className.toLowerCase()}.json`);
            let data = await response.json();

            // Mostra/Nasconde il selettore delle sottoclassi
            if (data.subclasses && data.subclasses.length > 0) {
                subclassSelect.innerHTML = `<option value="">Seleziona Sottoclasse</option>`;
                data.subclasses.forEach(sub => {
                    let option = document.createElement("option");
                    option.value = sub;
                    option.textContent = sub;
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

    // Funzione per applicare i bonus alle statistiche
    function applyStatBonuses(bonuses) {
        if (!bonuses) return;

        // Resetta le statistiche ai valori base prima di applicare nuovi bonus
        let currentStats = { ...baseStats };
        
        for (let stat in bonuses) {
            if (stat === "other") {
                // Se ci sono bonus personalizzabili, chiedi all'utente di assegnarli
                let remainingBonus = [...bonuses["other"]];
                while (remainingBonus.length > 0) {
                    let selectedStat = prompt(`Scegli una caratteristica per il bonus +${remainingBonus[0]}: (forza, destrezza, costituzione, intelligenza, saggezza, carisma)`);
                    if (selectedStat in currentStats) {
                        currentStats[selectedStat] += remainingBonus.shift();
                    } else {
                        alert("Caratteristica non valida, riprova.");
                    }
                }
            } else {
                currentStats[stat] += bonuses[stat];
            }
        }

        // Aggiorna i punti rimanenti
        let usedPoints = Object.values(currentStats).reduce((a, b) => a + (b - 8), 0);
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
  
    // Crea il JSON
    const jsonString = JSON.stringify(character, null, 2);
  
    // Crea un Blob (file) a partire dal JSON
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${character.name}_character.json`;  // Nome del file JSON
    link.textContent = `Clicca per scaricare il file JSON del personaggio: ${character.name}`;
  
    // Mostra il link per il download
    document.getElementById("download-link").innerHTML = '';
    document.getElementById("download-link").appendChild(link);
  });