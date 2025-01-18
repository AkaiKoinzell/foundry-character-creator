document.getElementById("character-form").addEventListener("submit", function(event) {
    event.preventDefault();  // Evita il refresh della pagina
  
    // Cattura i dati dal modulo
    const character = {
      name: document.getElementById("name").value || "Nome Personaggio",
      class: document.getElementById("class").value,
      race: document.getElementById("race").value,
      abilities: {
        strength: document.getElementById("strength").value,
        dexterity: document.getElementById("dexterity").value
      },
      // Aggiungi altre proprietà come feats, spells, items, etc.
    };
  
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
  
