// common.js
// ========================================================
// COMMON UTILITY FUNCTIONS
// Questo file contiene le funzioni di utilità utilizzate in tutta l'applicazione,
// come la gestione degli errori, il caricamento di file JSON, il popolamento dei dropdown,
// e funzioni helper per la gestione degli incantesimi.
// ========================================================

console.log("✅ common.js loaded!");

// -----------------------------
// Error Handling
// -----------------------------

/**
 * Mostra un messaggio d'errore in console e tramite alert.
 * @param {string} message - Il messaggio d'errore da mostrare.
 */
function handleError(message) {
  console.error("❌ " + message);
  alert("⚠️ " + message);
}

// -----------------------------
// Data Loading and Dropdown Population
// -----------------------------

/**
 * Carica un file JSON dal percorso specificato e popola un dropdown.
 * @param {string} jsonPath - Il percorso del file JSON.
 * @param {string} selectId - L'ID dell'elemento <select> da popolare.
 * @param {string} key - La chiave nell'oggetto JSON che contiene i dati.
 */
function loadDropdownData(jsonPath, selectId, key) {
  fetch(jsonPath)
    .then(response => response.json())
    .then(data => {
      console.log(`📜 Dati ricevuti da ${jsonPath}:`, data);
      if (!data[key]) {
        handleError(`Chiave "${key}" non trovata in ${jsonPath}`);
        return;
      }
      // Mappa le chiavi in un array di oggetti { name, path }
      const options = Object.keys(data[key]).map(name => ({
        name: name,
        path: data[key][name]
      }));
      populateDropdown(selectId, options);
    })
    .catch(error => handleError(`Errore caricando ${jsonPath}: ${error}`));
}

/**
 * Popola un elemento <select> con le opzioni fornite.
 * @param {string} selectId - L'ID dell'elemento <select>.
 * @param {Array} options - Un array di oggetti con le proprietà "name" e "path".
 */
function populateDropdown(selectId, options) {
  const select = document.getElementById(selectId);
  if (!select) {
    handleError(`Elemento con ID "${selectId}" non trovato!`);
    return;
  }
  // Pulisce il contenuto del dropdown e aggiunge l'opzione di default
  select.innerHTML = `<option value="">Seleziona...</option>`;
  options.forEach(option => {
    const opt = document.createElement("option");
    opt.value = option.path;
    opt.textContent = option.name;
    select.appendChild(opt);
  });
  console.log(`✅ Dropdown "${selectId}" popolato con ${options.length} opzioni.`);
}

/**
 * Carica le lingue dal file JSON e passa l'array di lingue alla funzione callback.
 * @param {function} callback - La funzione callback che riceve l'array di lingue.
 */
function loadLanguages(callback) {
  fetch("data/languages.json")
    .then(response => response.json())
    .then(data => {
      if (data.languages) {
        console.log("📜 Lingue caricate:", data.languages);
        callback(data.languages);
      } else {
        handleError("Nessuna lingua trovata nel file JSON.");
      }
    })
    .catch(error => handleError(`Errore caricando le lingue: ${error}`));
}

// -----------------------------
// Spell Utilities
// -----------------------------

/**
 * Estrae ricorsivamente il nome di un incantesimo dai dati forniti.
 * Assume che il nome dell'incantesimo sia una stringa e, se contiene il carattere "#",
 * restituisce la parte precedente a "#".
 * @param {any} data - I dati da cui estrarre il nome.
 * @returns {string|null} - Il nome dell'incantesimo o null se non trovato.
 */
function extractSpellName(data) {
  if (Array.isArray(data)) {
    if (typeof data[0] === "string") {
      return data[0].split("#")[0];
    }
  } else if (typeof data === "object") {
    for (let key in data) {
      const result = extractSpellName(data[key]);
      if (result) {
        return result;
      }
    }
  }
  return null;
}

/**
 * Filtra un array di incantesimi in base a una stringa di condizioni.
 * Il formato della stringa di filtro deve essere "chiave=valore|chiave=valore" (es. "level=0|class=Wizard").
 * @param {Array} spells - L'array di incantesimi.
 * @param {string} filterString - La stringa contenente le condizioni di filtro.
 * @returns {Array} - L'array filtrato di incantesimi.
 */
function filterSpells(spells, filterString) {
  const conditions = filterString.split("|");
  return spells.filter(spell => {
    let valid = true;
    conditions.forEach(cond => {
      const parts = cond.split("=");
      if (parts.length === 2) {
        const key = parts[0].trim().toLowerCase();
        const value = parts[1].trim().toLowerCase();
        if (key === "level") {
          if (parseInt(spell.level) !== parseInt(value)) {
            valid = false;
          }
        } else if (key === "class") {
          // Verifica che la proprietà spell_list esista e contenga il valore (case-insensitive)
          if (!spell.spell_list || !spell.spell_list.map(x => x.toLowerCase()).includes(value)) {
            valid = false;
          }
        }
      }
    });
    return valid;
  });
}

// -----------------------------
// Esposizione delle funzioni per l'uso globale
// -----------------------------
window.handleError = handleError;
window.loadDropdownData = loadDropdownData;
window.populateDropdown = populateDropdown;
window.loadLanguages = loadLanguages;
window.extractSpellName = extractSpellName;
window.filterSpells = filterSpells;
