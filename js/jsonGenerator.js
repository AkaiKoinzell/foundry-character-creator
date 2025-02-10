// jsonGenerator.js
// ========================================================
// MODULO: jsonGenerator.js
// Questo modulo gestisce la generazione del JSON finale che
// rappresenta il personaggio creato. Vengono raccolti i dati
// dai vari campi dell'interfaccia (nome, livello, razza, classe,
// punteggi, bonus, lingue, ecc.), viene costruito un oggetto
// character e viene fornita la funzionalità per scaricare il
// file JSON.
// ========================================================

console.log("✅ jsonGenerator.js loaded!");

/**
 * generateFinalJson
 * Questa funzione raccoglie i dati inseriti dall’utente, costruisce
 * l’oggetto "character" e invoca la funzione per il download del JSON.
 */
function generateFinalJson() {
  // Proviamo a recuperare il valore di "Chromatic Ancestry" se presente
  let chromaticAncestry = null;
  const ancestrySelect = document.getElementById("ancestrySelect");
  if (ancestrySelect && ancestrySelect.value) {
    try {
      chromaticAncestry = JSON.parse(ancestrySelect.value);
    } catch (e) {
      console.error("Errore nel parsing della Chromatic Ancestry scelta", e);
    }
  }

  // Recupera eventualmente il valore di tool proficiency (se presente)
  const toolProficiency = document.getElementById("toolChoice0")
    ? document.getElementById("toolChoice0").value
    : null;

  // Recupera i dati relativi alle variant features extra
  const variantFeature = document.getElementById("variantFeatureChoice")
    ? document.getElementById("variantFeatureChoice").value
    : null;
  const variantExtra = {};
  const variantSkillElems = document.querySelectorAll(".variantSkillChoice");
  if (variantSkillElems.length > 0) {
    variantExtra.skills = [];
    variantSkillElems.forEach(elem => {
      if (elem.value) variantExtra.skills.push(elem.value);
    });
  }
  const variantSpellElem = document.getElementById("variantSpellChoice");
  if (variantSpellElem && variantSpellElem.value) {
    variantExtra.spell = variantSpellElem.value;
  }

  // Costruisce l'oggetto character utilizzando i dati dei vari campi dell'interfaccia
  const character = {
    name: document.getElementById("characterName").value || "Senza Nome",
    level: document.getElementById("levelSelect").value || "1",
    race: document.getElementById("raceSelect").selectedOptions[0]?.text || "Nessuna",
    class: document.getElementById("classSelect").selectedOptions[0]?.text || "Nessuna",
    stats: {
      strength: document.getElementById("strFinalScore").textContent,
      dexterity: document.getElementById("dexFinalScore").textContent,
      constitution: document.getElementById("conFinalScore").textContent,
      intelligence: document.getElementById("intFinalScore").textContent,
      wisdom: document.getElementById("wisFinalScore").textContent,
      charisma: document.getElementById("chaFinalScore").textContent
    },
    racial_bonus: {
      strength: document.getElementById("strRaceModifier").textContent,
      dexterity: document.getElementById("dexRaceModifier").textContent,
      constitution: document.getElementById("conRaceModifier").textContent,
      intelligence: document.getElementById("intRaceModifier").textContent,
      wisdom: document.getElementById("wisRaceModifier").textContent,
      charisma: document.getElementById("chaRaceModifier").textContent
    },
    languages: {
      // Se il dropdown per le lingue extra esiste, ne preleva il valore
      selected: document.getElementById("extraLanguageSelect")
        ? document.getElementById("extraLanguageSelect").value
        : []
    },
    chromatic_ancestry: chromaticAncestry,
    tool_proficiency: toolProficiency,
    variant_feature: variantFeature,
    variant_extra: variantExtra
  };

  console.log("✅ JSON finale generato:");
  console.log(JSON.stringify(character, null, 2));

  // Genera il nome del file JSON in base al nome del personaggio
  const filename = character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + "_character.json";

  // Chiama la funzione per scaricare il file JSON
  downloadJsonFile(filename, character);

  // Avvisa l'utente che il file JSON è stato generato e scaricato
  alert("JSON generato e scaricato!");
}

/**
 * downloadJsonFile
 * Crea un Blob contenente il JSON dei dati del personaggio e avvia il download.
 *
 * @param {string} filename - Il nome del file da scaricare.
 * @param {Object} jsonData - L'oggetto contenente i dati del personaggio.
 */
function downloadJsonFile(filename, jsonData) {
  const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(jsonBlob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Espone globalmente la funzione per generare il JSON finale
window.generateFinalJson = generateFinalJson;
