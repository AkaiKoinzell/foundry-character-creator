// Assicurati che le funzioni convertRaceData() e loadLanguages() siano definite globalmente (ad es. in common.js)
// e che i dati della razza corrente siano salvati in window.currentRaceData (ad esempio, impostati nello Step 2).

document.addEventListener("DOMContentLoaded", () => {
  const step4Container = document.getElementById("step4");
  if (!step4Container) return;

  // Imposta il markup base per lo Step 4
  step4Container.innerHTML = `
    <h2>Step 4: Selezione dei Tratti Extra</h2>
    <div id="extraSpellcasting"></div>
    <div id="extraLanguages"></div>
    <!-- Eventuali altri container per skills e tools extra possono essere aggiunti qui -->
  `;

  // Funzione per renderizzare la sezione di Spellcasting extra (ad es. per High Elf)
  function renderExtraSpellcasting(raceData) {
    // Controlla se la proprietà "spellcasting" è presente e se è in modalità "filter"
    if (raceData.spellcasting &&
        raceData.spellcasting.spell_choices &&
        raceData.spellcasting.spell_choices.type === "filter" &&
        Array.isArray(raceData.spellcasting.allSpells)) {

      const currentLevel = parseInt(document.getElementById("levelSelect").value) || 1;
      // Filtra gli incantesimi in base al livello corrente
      const filteredSpells = raceData.spellcasting.allSpells.filter(spell => parseInt(spell.level) <= currentLevel);

      // Raggruppa gli incantesimi per livello
      const groupedSpells = {};
      filteredSpells.forEach(spell => {
        const lvl = parseInt(spell.level);
        if (!groupedSpells[lvl]) groupedSpells[lvl] = [];
        groupedSpells[lvl].push(spell);
      });

      const levels = Object.keys(groupedSpells).map(Number).sort((a, b) => a - b);
      let html = "<h4>Spellcasting</h4>";
      levels.forEach(lvl => {
        const spellsAtLvl = groupedSpells[lvl];
        if (spellsAtLvl.length === 1) {
          html += `<p>Incantesimo di livello ${lvl}: ${spellsAtLvl[0].name}</p>`;
        } else if (spellsAtLvl.length > 1) {
          const options = spellsAtLvl
            .map(spell => `<option value="${spell.name}">${spell.name} (lvl ${spell.level})</option>`)
            .join("");
          html += `<p>Incantesimo di livello ${lvl}: 
                    <select id="extraSpellSelection_level_${lvl}">
                      <option value="">Seleziona...</option>
                      ${options}
                    </select>
                   </p>`;
        }
      });
      // Gestione dell'abilità di lancio, se sono presenti più opzioni
      if (raceData.spellcasting.ability_choices && Array.isArray(raceData.spellcasting.ability_choices)) {
        if (raceData.spellcasting.ability_choices.length === 1) {
          html += `<p>Abilità di lancio: ${raceData.spellcasting.ability_choices[0]}</p>`;
        } else if (raceData.spellcasting.ability_choices.length > 1) {
          const abilityOptions = raceData.spellcasting.ability_choices
            .map(ability => `<option value="${ability}">${ability}</option>`)
            .join("");
          html += `<p>Abilità di lancio: 
                    <select id="extraCastingAbility">
                      <option value="">Seleziona...</option>
                      ${abilityOptions}
                    </select>
                   </p>`;
        }
      }
      document.getElementById("extraSpellcasting").innerHTML = html;
    } else {
      // Se non c'è spellcasting extra, pulisci il container
      document.getElementById("extraSpellcasting").innerHTML = "";
    }
  }

  // Funzione per renderizzare le lingue extra
  function renderExtraLanguages(raceData) {
    if (raceData.languages && raceData.languages.choice > 0) {
      loadLanguages(langs => {
        const availableLangs = langs.filter(lang => !raceData.languages.fixed.includes(lang));
        const options = availableLangs
          .map(lang => `<option value="${lang}">${lang}</option>`)
          .join("");
        const html = `<h4>Lingue Extra</h4>
                      <select id="extraLanguageSelect">
                        <option value="">Seleziona...</option>
                        ${options}
                      </select>`;
        document.getElementById("extraLanguages").innerHTML = html;
      });
    } else {
      document.getElementById("extraLanguages").innerHTML = "";
    }
  }

  // Se hai altre sezioni extra (per skills, tools, ecc.), puoi definire qui funzioni analoghe.

  // Verifica se la razza corrente è già stata caricata (ad esempio, nello Step 2 hai salvato i dati in window.currentRaceData)
  if (window.currentRaceData) {
    renderExtraSpellcasting(window.currentRaceData);
    renderExtraLanguages(window.currentRaceData);
    // Richiama qui eventuali altre funzioni per skills e tools extra.
  } else {
    // Se i dati della razza non sono disponibili, puoi visualizzare un messaggio o lasciare vuoto
    document.getElementById("extraSpellcasting").innerHTML = "";
    document.getElementById("extraLanguages").innerHTML = "";
  }
});
