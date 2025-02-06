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
    <div id="extraSkills"></div>
    <div id="extraTools"></div>
  `;

  // Funzione per visualizzare la sezione Spellcasting extra (se presente)
  function renderExtraSpellcasting(raceData) {
    if (raceData.spellcasting && raceData.spellcasting.spell_choices && raceData.spellcasting.spell_choices.type === "filter") {
      const currentLevel = parseInt(document.getElementById("levelSelect").value) || 1;
      const filteredSpells = raceData.spellcasting.allSpells.filter(spell => parseInt(spell.level) <= currentLevel);
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
          const options = spellsAtLvl.map(spell => `<option value="${spell.name}">${spell.name} (lvl ${spell.level})</option>`).join("");
          html += `<p>Incantesimo di livello ${lvl}: 
                    <select id="extraSpellSelection_level_${lvl}">
                      <option value="">Seleziona...</option>
                      ${options}
                    </select>
                   </p>`;
        }
      });
      if (raceData.spellcasting.ability_choices && Array.isArray(raceData.spellcasting.ability_choices)) {
        if (raceData.spellcasting.ability_choices.length === 1) {
          html += `<p>Abilità di lancio: ${raceData.spellcasting.ability_choices[0]}</p>`;
        } else if (raceData.spellcasting.ability_choices.length > 1) {
          const abilityOptions = raceData.spellcasting.ability_choices.map(ability => `<option value="${ability}">${ability}</option>`).join("");
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
      document.getElementById("extraSpellcasting").innerHTML = "";
    }
  }

  // Funzione per le lingue extra
  function renderExtraLanguages(raceData) {
    if (raceData.languages && raceData.languages.choice > 0) {
      loadLanguages(langs => {
        const availableLangs = langs.filter(lang => !raceData.languages.fixed.includes(lang));
        const options = availableLangs.map(lang => `<option value="${lang}">${lang}</option>`).join("");
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

  // Funzioni per skills e tools extra possono essere aggiunte qui se necessario

  // Supponiamo che i dati della razza selezionata siano salvati globalmente in window.currentRaceData (lo imposti nello step 2)
  if (window.currentRaceData) {
    renderExtraSpellcasting(window.currentRaceData);
    renderExtraLanguages(window.currentRaceData);
    // Aggiungi altre funzioni per skills o tools se necessario
  }
});
