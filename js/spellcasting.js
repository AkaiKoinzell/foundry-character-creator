// spellcasting.js
// ========================================================
// SPELLCASTING FUNCTIONS
// Questo file gestisce la visualizzazione degli incantesimi per le razze.
// Supporta la modalità "standard" (basata sul campo spellcasting) e
// una modalità "extra" per razze che usano additionalSpells (ad esempio, per la scelta del cantrip).
// ========================================================

console.log("✅ spellcasting.js loaded!");

/**
 * loadSpells
 * Carica il file JSON degli incantesimi (data/spells.json) e passa l’array di incantesimi alla callback.
 * @param {Function} callback - Funzione da eseguire con l'array degli incantesimi.
 */
function loadSpells(callback) {
  fetch("data/spells.json")
    .then(response => response.json())
    .then(data => {
      console.log("📖 Incantesimi caricati:", data);
      callback(data);
    })
    .catch(error => console.error("❌ Errore nel caricamento degli incantesimi:", error));
}

/**
 * handleSpellcastingOptions
 * Gestisce la visualizzazione della sezione "Spellcasting" standard.
 * Se i dati in data.spellcasting sono presenti e contengono il campo "spell_choices",
 * genera il markup corrispondente e lo inietta nel container il cui id è specificato.
 *
 * Supporta due modalità:
 *   - "fixed_list": il dropdown è basato su una lista fissa di incantesimi.
 *   - "filter": gli incantesimi vengono raggruppati per livello e si genera un dropdown per ciascun livello;
 *       viene inoltre visualizzata la scelta dell’abilità di lancio se presente.
 *
 * @param {Object} data - I dati della razza (output di convertRaceData).
 * @param {string} containerId - L’ID del container dove iniettare il markup.
 * @returns {string} - (Opzionale) il markup dei tratti non modificato.
 */
function handleSpellcastingOptions(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container con ID "${containerId}" non trovato.`);
    return "";
  }

  if (data.spellcasting && data.spellcasting.spell_choices) {
    let spellData = data.spellcasting;
    let markup = "<h4>📖 Incantesimi</h4>";

    if (spellData.spell_choices.type === "fixed_list") {
      // Dropdown basato su una lista fissa
      const options = spellData.spell_choices.options
        .map(spell => `<option value="${spell}">${spell}</option>`)
        .join("");
      markup += `<p><strong>Scegli un incantesimo:</strong>
                   <select id="spellSelection"><option value="">Seleziona...</option>${options}</select>
                 </p>`;
    } else if (spellData.spell_choices.type === "filter") {
      // Raggruppa gli incantesimi per livello
      const currentLevel = parseInt(document.getElementById("levelSelect").value) || 1;
      const filteredSpells = spellData.allSpells.filter(spell => parseInt(spell.level) <= currentLevel);
      const groupedSpells = {};
      filteredSpells.forEach(spell => {
        const lvl = parseInt(spell.level);
        if (!groupedSpells[lvl]) groupedSpells[lvl] = [];
        groupedSpells[lvl].push(spell);
      });
      const levels = Object.keys(groupedSpells).map(Number).sort((a, b) => a - b);
      levels.forEach(lvl => {
        const spellsAtLvl = groupedSpells[lvl];
        if (spellsAtLvl.length === 1) {
          markup += `<p><strong>Incantesimo di livello ${lvl}:</strong> ${spellsAtLvl[0].name}</p>`;
        } else if (spellsAtLvl.length > 1) {
          const opts = spellsAtLvl
            .map(spell => `<option value="${spell.name}">${spell.name} (lvl ${spell.level})</option>`)
            .join("");
          markup += `<p><strong>Incantesimo di livello ${lvl}:</strong>
                      <select id="spellSelection_level_${lvl}"><option value="">Seleziona...</option>${opts}</select>
                     </p>`;
        }
      });
      // Gestione dell'abilità di lancio
      if (spellData.ability_choices && Array.isArray(spellData.ability_choices)) {
        if (spellData.ability_choices.length === 1) {
          markup += `<p><strong>Abilità di lancio:</strong> ${spellData.ability_choices[0]}</p>`;
        } else if (spellData.ability_choices.length > 1) {
          const abilityOptions = spellData.ability_choices
            .map(a => `<option value="${a}">${a}</option>`)
            .join("");
          markup += `<p><strong>Abilità di lancio:</strong>
                      <select id="castingAbility"><option value="">Seleziona...</option>${abilityOptions}</select>
                     </p>`;
        }
      }
    }
    container.innerHTML = markup;
    return "";
  } else {
    console.log("⚠️ Nessun spellcasting standard trovato.");
    container.innerHTML = "";
    return "";
  }
}

/**
 * handleAdditionalSpells
 * Gestisce gli incantesimi extra per razze specifiche (es. High Elf, Aarakocra).
 * In particolare, esamina il gruppo additionalSpells per cercare un filtro "choose" all'interno di known["1"]["_"].
 * Se viene trovato, estrae il filtro (ad es. "level=0|class=Wizard") e genera un dropdown per la scelta del cantrip.
 * Il markup viene aggiunto al container con id "spellSelectionContainer" senza sovrascrivere eventuali altri contenuti.
 */
function handleAdditionalSpells(data) {
  if (!data.additionalSpells || data.additionalSpells.length === 0) return;
  console.log("🛠 Gestione specifica per additionalSpells (es. High Elf)");
  
  const spellGroup = data.additionalSpells[0];
  if (spellGroup.known && spellGroup.known["1"] && Array.isArray(spellGroup.known["1"]["_"])) {
    let choiceObj = spellGroup.known["1"]["_"].find(item => item.choose && item.choose.includes("class="));
    if (!choiceObj) {
      console.warn("⚠️ Nessun filtro 'choose' trovato in additionalSpells per il cantrip.");
      return;
    }
    console.log("📥 Trovato filtro per Cantrip:", choiceObj.choose);
    // Estrae il filtro: ad esempio "level=0|class=Wizard"
    let [levelFilter, classFilter] = choiceObj.choose.split("|").map(f => f.split("=")[1]);
    let spellLevel = parseInt(levelFilter.trim());
    let spellClass = classFilter.trim();
    console.log(`📥 Richiesta per incantesimi di livello ${spellLevel} della classe ${spellClass}`);
    
    loadSpells(spellList => {
      const availableSpells = spellList
        .filter(spell =>
          parseInt(spell.level) === spellLevel &&
          spell.spell_list &&
          spell.spell_list.map(x => x.toLowerCase()).includes(spellClass.toLowerCase())
        )
        .map(spell => `<option value="${spell.name}">${spell.name}</option>`)
        .join("");
      
      const container = document.getElementById("spellSelectionContainer");
      if (!container) {
        console.error("❌ ERRORE: Container 'spellSelectionContainer' non trovato nel DOM!");
        return;
      }
      
      if (availableSpells.length > 0) {
        // Aggiunge il dropdown per il cantrip in aggiunta al markup già presente
        container.innerHTML += `
          <p><strong>Scegli un Cantrip da ${spellClass}:</strong></p>
          <select id="additionalSpellSelection"><option value="">Seleziona...</option>${availableSpells}</select>
        `;
        console.log("✅ Dropdown Cantrip generato correttamente.");
      } else {
        container.innerHTML += `<p><strong>⚠️ Nessun Cantrip disponibile per la classe ${spellClass}!</strong></p>`;
      }
    });
  } else {
    console.warn("⚠️ Nessun filtro 'choose' trovato in additionalSpells per il cantrip.");
  }
}

/**
 * handleAllSpellcasting
 * Wrapper che richiama sia handleSpellcastingOptions che handleAdditionalSpells.
 * In questo modo, se la razza dispone di spellcasting standard, viene gestito;
 * inoltre, se sono presenti additionalSpells (come per l’High Elf), viene chiamata anche la funzione corrispondente.
 *
 * @param {Object} data - I dati della razza (output di convertRaceData).
 * @param {string} traitsHtml - Il markup dei tratti già generato (non modificato).
 * @returns {string} - Il markup dei tratti (non modificato).
 */
function handleAllSpellcasting(data, traitsHtml) {
  // Gestione dello spellcasting standard
  handleSpellcastingOptions(data, "spellSelectionContainer");
  // Gestione degli incantesimi extra (ad es. per la scelta del cantrip)
  handleAdditionalSpells(data);
  return traitsHtml;
}

// Esponi le funzioni per l’uso globale
window.loadSpells = loadSpells;
window.handleSpellcastingOptions = handleSpellcastingOptions;
window.handleAdditionalSpells = handleAdditionalSpells;
window.handleAllSpellcasting = handleAllSpellcasting;
