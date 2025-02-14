// spellcasting.js

/**
 * Carica gli incantesimi dal file JSON e passa i dati alla callback
 */
export function loadSpells(callback) {
  fetch("data/spells.json")
    .then(response => response.json())
    .then(data => {
      console.log("📖 Incantesimi caricati:", data);
      callback(data);
    })
    .catch(error => console.error("❌ Errore nel caricamento degli incantesimi:", error));
}

/**
 * Gestisce le opzioni di spellcasting, creando le interfacce necessarie per selezionare incantesimi e abilità di lancio.
 * @param {Object} data - Dati della razza
 * @param {string} containerId - ID del contenitore HTML dove iniettare i selettori
 */
export function handleSpellcasting(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ""; // Pulisce il contenuto precedente

    if (data.spellcasting) {
        console.log(`🔍 JSON Spellcasting per ${data.name}:`, data.spellcasting);

        // ✅ Caso 1: Incantesimi fissi (es. Drow Magic)
        if (data.spellcasting.fixed_spell) {
            container.innerHTML += `<p><strong>✨ Incantesimo assegnato:</strong> ${data.spellcasting.fixed_spell}</p>`;
        }

        // ✅ Caso 2: Scelta di incantesimi
        if (data.spellcasting.spell_choices) {
            if (data.spellcasting.spell_choices.type === "fixed_list") {
                const options = data.spellcasting.spell_choices.options
                    .map(spell => `<option value="${spell}">${spell}</option>`)
                    .join("");

                container.innerHTML += `
                    <p><strong>🔮 Scegli un incantesimo:</strong></p>
                    <select id="spellSelection">
                        <option value="">Seleziona...</option>${options}
                    </select>`;
            } 
            else if (data.spellcasting.spell_choices.type === "filter") {
                const filterParts = data.spellcasting.spell_choices.filter.split("|");
                const spellLevel = filterParts.find(part => part.startsWith("level="))?.split("=")[1];
                const spellClass = filterParts.find(part => part.startsWith("class="))?.split("=")[1];

                if (spellLevel && spellClass) {
                    loadSpells(spellList => {
                        const filteredSpells = spellList
                            .filter(spell => parseInt(spell.level) === parseInt(spellLevel) && spell.spell_list.includes(spellClass))
                            .map(spell => `<option value="${spell.name}">${spell.name}</option>`)
                            .join("");

                        if (filteredSpells) {
                            container.innerHTML += `
                                <p><strong>🔮 Scegli un Cantrip da ${spellClass}:</strong></p>
                                <select id="spellSelection">
                                    <option value="">Seleziona...</option>${filteredSpells}
                                </select>`;
                        } else {
                            container.innerHTML += `<p><strong>⚠️ Nessun Cantrip disponibile per ${spellClass}.</strong></p>`;
                        }
                    });
                } else {
                    container.innerHTML += `<p><strong>⚠️ Errore: Il filtro incantesimi non è valido per questa razza.</strong></p>`;
                }
            }
        }

        // ✅ Caso 3: **Scelta dell'abilità di lancio**
        if (data.spellcasting.ability_choices && Array.isArray(data.spellcasting.ability_choices)) {
          console.log(`🧙‍♂️ Verifica dell'abilità di lancio per ${data.name}:`, data.spellcasting.ability_choices);
      
          // 🔹 Se l'Alto Elfo ha solo una scelta (INT), evitiamo di creare il dropdown
          if (data.name.toLowerCase().includes("elf (high)") && 
              data.spellcasting.ability_choices.length === 1 && 
              typeof data.spellcasting.ability_choices[0] === "string") {
              
              console.log(`🧠 ${data.name} usa sempre ${data.spellcasting.ability_choices[0]} come abilità di lancio. Nessun dropdown mostrato.`);
              return;
          }
      
          // 🔹 Se ci sono più opzioni, mostra il dropdown
          if (data.spellcasting.ability_choices.length > 1) {
              const abilityOptions = data.spellcasting.ability_choices
                  .map(a => `<option value="${a.toUpperCase()}">${a.toUpperCase()}</option>`)
                  .join("");
      
              container.innerHTML += `
                  <p><strong>🧠 Seleziona l'abilità di lancio:</strong></p>
                  <select id="castingAbility">
                      <option value="">Seleziona...</option>${abilityOptions}
                  </select>`;
          }
      }
    }
}
