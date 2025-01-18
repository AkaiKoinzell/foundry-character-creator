// Funzione per caricare le regole da un file JSON
function loadRules() {
  return fetch('rules.json')  // Assicurati che il file 'rules.json' sia nel percorso corretto
    .then(response => response.json())
    .catch(error => {
      console.error("Errore nel caricamento delle regole:", error);
      return null;
    });
}

// Funzione per applicare i bonus e tratti della razza al personaggio
function applyRaceBonus(race, character, rules) {
  const raceData = rules.races[race];
  if (raceData) {
    // Aggiungi il bonus alle abilità
    for (let stat in raceData.bonus) {
      character.abilities[stat] = (character.abilities[stat] || 0) + raceData.bonus[stat];
    }
    
    // Aggiungi i tratti
    character.traits = raceData.traits || [];
    
    // Se la razza ha una sottorazza, applica anche i tratti della sottorazza
    const subraceElement = document.getElementById("subrace");
    const subrace = subraceElement ? subraceElement.value : null;  // Controlla se 'subrace' è presente
    if (subrace && raceData.subraces && raceData.subraces[subrace]) {
      const subraceData = raceData.subraces[subrace];
      if (subraceData) {
        for (let stat in subraceData.bonus) {
          character.abilities[stat] = (character.abilities[stat] || 0) + subraceData.bonus[stat];
        }
        character.traits = character.traits.concat(subraceData.traits || []);
      }
    }
  }
}

// Funzione per applicare le limitazioni della classe
function applyClassLimitations(className, character, rules) {
  const classData = rules.classes[className];
  if (classData) {
    character.tools = classData.tools;
    character.abilitiesList = character.abilitiesList.concat(classData.abilities);
  }
}

// Gestisci la creazione del personaggio e la generazione del file JSON
document.getElementById("character-form").addEventListener("submit", function(event) {
  event.preventDefault();  // Evita il refresh della pagina

  // Carica le regole da rules.json
  loadRules().then(rules => {
    if (!rules) {
      alert("Errore nel caricamento delle regole.");
      return;
    }

    // Cattura i dati dal modulo
    const character = {
      name: document.getElementById("name").value || "Nome Personaggio",
      class: document.getElementById("class").value,
      race: document.getElementById("race").value,
      abilities: {
        strength: parseInt(document.getElementById("strength").value) || 0,
        dexterity: parseInt(document.getElementById("dexterity").value) || 0,
        constitution: parseInt(document.getElementById("constitution").value) || 0,
        intelligence: parseInt(document.getElementById("intelligence").value) || 0,
        wisdom: parseInt(document.getElementById("wisdom").value) || 0,
        charisma: parseInt(document.getElementById("charisma").value) || 0
      },
      traits: [],  // Tratti di razza e sottorazza
      tools: 0,
      abilitiesList: []  // Inizialmente vuoto, aggiungeremo le abilità dalla classe
    };

    // Applica le limitazioni della razza e della classe
    applyRaceBonus(character.race, character, rules);
    applyClassLimitations(character.class, character, rules);

    // Crea il JSON del personaggio
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
});
