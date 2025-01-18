// Funzione per caricare le regole da un file JSON (razze, classi, bonus, abilità)
function loadRules() {
  return fetch('rules.json') // Assicurati che il file 'rules.json' sia presente
    .then(response => response.json())
    .then(data => {
      return data;
    });
}

// Funzione per applicare il bonus della razza al personaggio
function applyRaceBonus(race, character) {
  loadRules().then(rules => {
    const raceData = rules.races[race];
    if (raceData) {
      for (let stat in raceData.bonus) {
        character.abilities[stat] = (character.abilities[stat] || 0) + raceData.bonus[stat];
      }
    }
  });
}

// Funzione per applicare le limitazioni della classe al personaggio
function applyClassLimitations(className, character) {
  loadRules().then(rules => {
    const classData = rules.classes[className];
    if (classData) {
      character.tools = classData.tools;
      character.abilitiesList = character.abilitiesList.concat(classData.abilities);
    }
  });
}

// Gestisci la creazione del personaggio e la generazione del file JSON
document.getElementById("character-form").addEventListener("submit", function(event) {
  event.preventDefault();  // Evita il refresh della pagina

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
    tools: 0,
    abilitiesList: []  // Inizialmente vuoto, aggiungeremo le abilità dalla classe
  };

  // Applica le limitazioni e i bonus della razza e della classe
  applyRaceBonus(character.race, character);
  applyClassLimitations(character.class, character);

  // Crea il JSON del personaggio con le regole applicate
  setTimeout(() => {
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
  }, 500);  // Aspetta un po' prima di generare il file per garantire che i bonus siano applicati
});
