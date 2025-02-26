// spellcasting.js

/**
 * Carica gli incantesimi dal file JSON e passa i dati alla callback
 */
export function loadSpells(callback) {
    console.log("🟢 Chiamata loadSpells()");
    
    fetch("data/spells.json")
        .then(response => response.json())
        .then(data => {
            console.log("📜 Lista incantesimi caricata:", data);
            callback(data);
        })
        .catch(error => console.error("❌ Errore nel caricamento degli incantesimi:", error));
}

export function handleSpellcasting(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ""; // Pulisce il contenuto precedente
    console.log(`🔍 Controllo spellcasting per ${data.name}:`, data);

    // ✅ Log: spell_choices presenti?
    if (data.spellcasting?.spell_choices) {
        console.log(`✅ ${data.name} ha spell_choices:`, data.spellcasting.spell_choices);
    } else {
        console.warn(`⚠️ Nessuno spell_choices per ${data.name}`);
    }

    // 🔹 Se la razza o classe ha incantesimi fissi
    if (data.spellcasting?.fixed_spell) {
        console.log(`✅ ${data.name} ha un incantesimo fisso: ${data.spellcasting.fixed_spell}`);
        container.innerHTML += `<p><strong>✨ Incantesimo assegnato:</strong> ${data.spellcasting.fixed_spell}</p>`;
    }

    // 🔹 Se è presente una lista di incantesimi tra cui scegliere
    if (data.spellcasting?.spell_choices) {
        generateSpellSelectionDropdown(data.spellcasting.spell_choices, container);
    }

    // ✅ Log dettagliato su `additionalSpells`
     console.log(`🟢 Chiamo handleAdditionalSpells() per ${data.name}`);
    if (data.additionalSpells) {
        handleAdditionalSpells(data, container);
    } else {
        console.warn(`❌ Nessun additionalSpells trovato per ${data.name}`);
    }

    // 🔹 Se la razza/classe concede un incantesimo basato su `additionalSpells`
    if (data.additionalSpells) {
        handleAdditionalSpells(data, container);
    }
}

/**
 * Genera un dropdown per la selezione di incantesimi
 * @param {Object} spellChoices - Configurazione delle scelte incantesimi
 * @param {HTMLElement} container - Contenitore HTML
 */
function generateSpellSelectionDropdown(spellChoices, container) {
    if (spellChoices.type === "fixed_list") {
        const options = spellChoices.options
            .map(spell => `<option value="${spell}">${spell}</option>`)
            .join("");

        container.innerHTML += `
            <p><strong>🔮 Scegli un incantesimo:</strong></p>
            <select id="spellSelection">
                <option value="">Seleziona...</option>${options}
            </select>`;
    } else if (spellChoices.type === "filter") {
        loadFilteredSpells(spellChoices, container);
    }
}

/**
 * Carica la lista di incantesimi in base a un filtro (es. Cantrip da Wizard)
 * @param {Object} spellChoices - Configurazione della selezione incantesimi
 * @param {HTMLElement} container - Contenitore HTML
 */
function loadFilteredSpells(spellChoices, container) {
    console.log(`🟢 loadFilteredSpells() chiamata con filtro:`, spellChoices.filter);

    const filterParts = spellChoices.filter.split("|");
    const spellLevel = filterParts.find(part => part.startsWith("level="))?.split("=")[1];
    const spellClass = filterParts.find(part => part.startsWith("class="))?.split("=")[1];

    console.log(`🔍 Filtro estratto: Level=${spellLevel}, Class=${spellClass}`);

    if (spellLevel && spellClass) {
        loadSpells(spellList => {
            console.log(`📜 Lista incantesimi caricata:`, spellList);

            const filteredSpells = spellList
                .filter(spell => parseInt(spell.level) === parseInt(spellLevel) && spell.spell_list.includes(spellClass))
                .map(spell => `<option value="${spell.name}">${spell.name}</option>`)
                .join("");

            console.log(`🔍 Cantrip disponibili dopo il filtro:`, filteredSpells);

            if (filteredSpells) {
                container.innerHTML += `
                    <p><strong>🔮 Scegli un Cantrip da ${spellClass}:</strong></p>
                    <select id="spellSelection">
                        <option value="">Seleziona...</option>${filteredSpells}
                    </select>`;
            } else {
                console.warn("⚠️ Nessun Cantrip disponibile per Wizard.");
                container.innerHTML += `<p><strong>⚠️ Nessun Cantrip disponibile per Wizard.</strong></p>`;
            }
        });
    } else {
        container.innerHTML += `<p><strong>⚠️ Errore: Il filtro incantesimi non è valido.</strong></p>`;
    }
}

/**
 * Gestisce gli `additionalSpells` (es. Cantrip dell'Alto Elfo)
 * @param {Object} data - Dati della razza o classe
 * @param {HTMLElement} container - Contenitore HTML
 */
export function handleAdditionalSpells(data, container) {
    console.log(`🧙‍♂️ Verifica di additionalSpells per ${data.name}:`, data.additionalSpells);

    if (!data.additionalSpells) {
        console.warn("⚠️ Nessun additionalSpells trovato!");
        return;
    }

    const cantripData = data.additionalSpells.find(spell => 
        spell.known?.["1"]?.["_"]?.some(choice => choice.choose.includes("level=0|class=Wizard"))
    );

    if (!cantripData) {
        console.warn(`⚠️ Nessun Cantrip selezionabile trovato per ${data.name}.`);
        return;
    }

    console.log(`✅ ${data.name} può scegliere un Cantrip da Wizard!`);
    console.log(`🔄 Chiamata loadFilteredSpells() con filtro level=0|class=Wizard`);

    loadFilteredSpells({ type: "filter", filter: "level=0|class=Wizard" }, container);
}
