// displayTraits.js
// ========================================================
// MODULO: displayTraits.js
// Questo modulo gestisce il caricamento e la visualizzazione
// dei tratti di una razza selezionata dall'utente.
// Utilizza le funzioni di conversione (convertRaceData),
// di rendering (renderTables) e di gestione degli extra 
// (handleAllSpellcasting, handleExtraLanguages, handleExtraSkills,
//  handleExtraTools, handleVariantFeatureChoices, handleExtraAncestry).
// ========================================================

console.log("✅ displayTraits.js loaded!");

/**
 * displayRaceTraits
 * Recupera il percorso della razza selezionata, carica i dati JSON corrispondenti,
 * li converte e genera il markup HTML per visualizzare le informazioni relative alla razza.
 * Include la visualizzazione di: velocità, visione, tratti, tabelle (rawEntries),
 * spellcasting (standard ed extra), lingue e altri extra (skills, tools, variant features, ancestry).
 */
function displayRaceTraits() {
  // Recupera il percorso (URL) del file JSON della razza selezionata
  const racePath = document.getElementById("raceSelect").value;
  const raceTraitsDiv = document.getElementById("raceTraits");
  const racialBonusDiv = document.getElementById("racialBonusSelection");

  // Pulisce i container extra (gli elementi dove verranno inseriti gli extra)
  [
    "skillSelectionContainer",
    "toolSelectionContainer",
    "spellSelectionContainer",
    "variantFeatureSelectionContainer",
    "variantExtraContainer",
    "languageSelection",
    "ancestrySelection"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });

  // Se non è stata selezionata alcuna razza, mostra un messaggio e termina
  if (!racePath) {
    if (raceTraitsDiv) {
      raceTraitsDiv.innerHTML = "<p>Seleziona una razza per vedere i tratti.</p>";
    }
    if (racialBonusDiv) {
      racialBonusDiv.style.display = "none";
    }
    resetRacialBonuses();
    return;
  }

  // Carica i dati JSON della razza
  fetch(racePath)
    .then(response => response.json())
    .then(data => {
      console.log("📜 Dati razza caricati:", data);
      if (raceTraitsDiv) raceTraitsDiv.innerHTML = "";
      
      // Converte i dati grezzi della razza in un formato standardizzato
      const raceData = convertRaceData(data);
      let traitsHtml = `<h3>Tratti di ${raceData.name}</h3>`;

      // Gestione della velocità
      if (raceData.speed) {
        if (typeof raceData.speed === "object") {
          const speedDetails = [];
          for (let type in raceData.speed) {
            speedDetails.push(`${type}: ${raceData.speed[type]} ft`);
          }
          traitsHtml += `<p><strong>Velocità:</strong> ${speedDetails.join(", ")}</p>`;
        } else {
          traitsHtml += `<p><strong>Velocità:</strong> ${raceData.speed} ft</p>`;
        }
      } else {
        traitsHtml += `<p><strong>Velocità:</strong> Non disponibile</p>`;
      }

      // Gestione della visione (es. darkvision)
      if (raceData.senses && raceData.senses.darkvision) {
        traitsHtml += `<p><strong>Visione:</strong> ${raceData.senses.darkvision} ft</p>`;
      }

      // Visualizzazione dei tratti (lista)
      if (raceData.traits && raceData.traits.length > 0) {
        traitsHtml += `<p><strong>Tratti:</strong></p><ul>`;
        raceData.traits.forEach(trait => {
          traitsHtml += `<li><strong>${trait.name}:</strong> ${trait.description || ""}</li>`;
        });
        traitsHtml += `</ul>`;
      }

      // Render delle tabelle (rawEntries) utilizzando la funzione renderTables
      const tablesHtml = renderTables(raceData.rawEntries);
      traitsHtml += tablesHtml;

      // Gestione dello Spellcasting (standard ed extra)
      // La funzione handleAllSpellcasting inietta il markup nel container "spellSelectionContainer"
      handleAllSpellcasting(raceData, traitsHtml);

      // Gestione delle lingue
      let languageHtml = "";
      if (raceData.languages && Array.isArray(raceData.languages.fixed) && raceData.languages.fixed.length > 0) {
        languageHtml = `<p><strong>Lingue Concesse:</strong> ${raceData.languages.fixed.join(", ")}</p>`;
      } else {
        languageHtml = `<p><strong>Lingue Concesse:</strong> Nessuna</p>`;
      }
      if (raceData.languages.choice > 0) {
        languageHtml += `<p>Scegli ${raceData.languages.choice} lingua/e extra:</p>`;
        loadLanguages(langs => {
          const availableLangs = langs.filter(lang => !raceData.languages.fixed.includes(lang));
          let opts = availableLangs.map(lang => `<option value="${lang}">${lang}</option>`).join("");
          opts = `<option value="">Seleziona...</option>` + opts;
          const select = `<select id="extraLanguageSelect">${opts}</select>`;
          const langContainer = document.getElementById("languageSelection");
          if (langContainer) {
            langContainer.innerHTML = languageHtml + select;
          }
        });
      } else {
        const langContainer = document.getElementById("languageSelection");
        if (langContainer) langContainer.innerHTML = languageHtml;
      }

      // Inietta il markup dei tratti nel container principale
      if (raceTraitsDiv) {
        raceTraitsDiv.innerHTML = traitsHtml;
      }
      if (racialBonusDiv) {
        racialBonusDiv.style.display = "block";
      }

      // Gestione degli extra: Skill, Tools, Variant Features, e Ancestry
      handleExtraSkills(raceData, "skillSelectionContainer");
      handleExtraTools(raceData, "toolSelectionContainer");
      handleVariantFeatureChoices(raceData);
      handleExtraAncestry(raceData, "ancestrySelection");

      // Resetta i bonus razziali (se applicabili)
      resetRacialBonuses();

      // Salva globalmente i dati della razza per eventuali step successivi (es. Step 4)
      window.currentRaceData = raceData;
    })
    .catch(error => handleError(`Errore caricando i tratti della razza: ${error}`));
}

// Esponi la funzione globalmente per poterla richiamare da altri moduli o eventi
window.displayRaceTraits = displayRaceTraits;
