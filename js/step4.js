document.addEventListener("DOMContentLoaded", () => {
  const step4Container = document.getElementById("step4");
  if (!step4Container) return;

  // Imposta il markup iniziale dello step 4
  step4Container.innerHTML = `
    <h2>Step 4: Selezione dei Tratti Extra</h2>
    <div id="extraSpellcasting"></div>
    <div id="extraLanguages"></div>
    <div id="extraSkills"></div>
    <div id="extraTools"></div>
  `;

  // --------------------------
  // Render Extra Spellcasting
  // --------------------------
  function renderExtraSpellcasting(raceData) {
    // Controlla se esiste la proprietà spellcasting in modalità "filter"
    if (
      raceData.spellcasting &&
      raceData.spellcasting.spell_choices &&
      raceData.spellcasting.spell_choices.type === "filter" &&
      Array.isArray(raceData.spellcasting.allSpells)
    ) {
      const levelSelect = document.getElementById("levelSelect");
      const currentLevel = levelSelect ? parseInt(levelSelect.value) || 1 : 1;
      // Filtra gli incantesimi in base al livello
      const filteredSpells = raceData.spellcasting.allSpells.filter(
        spell => parseInt(spell.level) <= currentLevel
      );
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
          // Se c'è un solo incantesimo, lo mostriamo come testo fisso
          html += `<p>Incantesimo di livello ${lvl}: ${spellsAtLvl[0].name}</p>`;
        } else if (spellsAtLvl.length > 1) {
          // Se ci sono più incantesimi, creiamo un dropdown
          const options = spellsAtLvl
            .map(
              spell =>
                `<option value="${spell.name}">${spell.name} (lvl ${spell.level})</option>`
            )
            .join("");
          html += `<p>Incantesimo di livello ${lvl}: 
                    <select id="extraSpellSelection_level_${lvl}">
                      <option value="">Seleziona...</option>
                      ${options}
                    </select>
                   </p>`;
        }
      });
      // Gestione dell'abilità di lancio
      if (
        raceData.spellcasting.ability_choices &&
        Array.isArray(raceData.spellcasting.ability_choices)
      ) {
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
      document.getElementById("extraSpellcasting").innerHTML = "";
    }
  }

  // --------------------------
  // Render Extra Languages
  // --------------------------
  function renderExtraLanguages(raceData) {
    if (raceData.languages && raceData.languages.choice > 0) {
      loadLanguages(langs => {
        // Filtra le lingue già conosciute
        const availableLangs = langs.filter(
          lang => !raceData.languages.fixed.includes(lang)
        );
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

  // --------------------------
  // (Placeholder) Render Extra Skills
  // --------------------------
  function renderExtraSkills(raceData) {
    // Se nel JSON della razza esiste una proprietà per skills extra, gestiscila qui.
    // In questo esempio base non abbiamo una proprietà specifica, quindi puliamo il container.
    document.getElementById("extraSkills").innerHTML = "";
  }

  // --------------------------
  // (Placeholder) Render Extra Tools
  // --------------------------
  function renderExtraTools(raceData) {
    // Analogamente, se esiste una proprietà per tools extra, gestiscila qui.
    document.getElementById("extraTools").innerHTML = "";
  }

  // --------------------------
  // Render dei Tratti Extra se i dati della razza sono già disponibili
  // --------------------------
  if (window.currentRaceData) {
    renderExtraSpellcasting(window.currentRaceData);
    renderExtraLanguages(window.currentRaceData);
    renderExtraSkills(window.currentRaceData);
    renderExtraTools(window.currentRaceData);
  }

  // Se il livello cambia (presente nello step1 o in un header globale), aggiorna la sezione spellcasting
  const levelSelect = document.getElementById("levelSelect");
  if (levelSelect) {
    levelSelect.addEventListener("change", () => {
      if (window.currentRaceData) {
        renderExtraSpellcasting(window.currentRaceData);
      }
    });
  }
});
