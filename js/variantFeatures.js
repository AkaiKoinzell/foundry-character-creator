// variantFeatures.js
// ========================================================
// VARIANT FEATURES FUNCTIONS
// Questo file gestisce le funzionalità relative alle Variant Features.
// Include:
//   - variantExtraMapping: Un oggetto che mappa le variant features alle loro proprietà.
//   - updateVariantSkillOptions: Aggiorna i dropdown per le variant skills, evitando duplicazioni.
//   - handleVariantExtraSelections: Gestisce l'iniezione del markup per le selezioni extra
//       in base alla variant feature scelta.
//   - handleVariantFeatureChoices: Genera il dropdown per la scelta delle variant features
//       disponibili per la razza.
// ========================================================

console.log("✅ variantFeatures.js loaded!");

// Mapping per le extra variant features: qui definiamo le proprietà per ciascuna feature
const variantExtraMapping = {
  "Drow Magic": {
    type: "none" // Le spell fisse saranno gestite separatamente
  },
  "Skill Versatility": {
    type: "skills",
    count: 2,
    options: [
      "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History",
      "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception",
      "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"
    ]
  },
  "Swim": {
    type: "none"
  },
  "Cantrip (Wizard)": {
    type: "spells",
    filter: "level=0|class=Wizard"
  }
  // Aggiungi altri mapping se necessario
};

/**
 * updateVariantSkillOptions
 * Aggiorna i dropdown delle variant skills per evitare che vengano selezionate duplicazioni.
 */
function updateVariantSkillOptions() {
  const allVariantSkillSelects = document.querySelectorAll(".variantSkillChoice");
  if (!allVariantSkillSelects.length) return;
  const selected = new Set();
  // Raccoglie tutte le scelte attuali
  allVariantSkillSelects.forEach(select => {
    if (select.value) selected.add(select.value);
  });
  // Aggiorna ogni dropdown rimuovendo le opzioni già scelte (eccetto quella corrente)
  allVariantSkillSelects.forEach(select => {
    const current = select.value;
    select.innerHTML = `<option value="">Seleziona...</option>`;
    const options = JSON.parse(select.getAttribute("data-options"));
    options.forEach(skill => {
      if (!selected.has(skill) || skill === current) {
        const option = document.createElement("option");
        option.value = skill;
        option.textContent = skill;
        if (skill === current) option.selected = true;
        select.appendChild(option);
      }
    });
  });
  console.log("✅ updateVariantSkillOptions eseguito.");
}

/**
 * handleVariantExtraSelections
 * Gestisce l'iniezione del markup extra in base alla Variant Feature scelta.
 * In particolare:
 *   - Se la feature è di tipo "skills", genera i dropdown per la scelta delle skills.
 *   - Se è di tipo "spells", carica gli incantesimi filtrati e genera un dropdown.
 *   - Se il mapping è "none", non inietta nulla.
 */
function handleVariantExtraSelections() {
  const variantElem = document.getElementById("variantFeatureChoice");
  const container = document.getElementById("variantExtraContainer");
  if (!container) {
    console.warn("Container 'variantExtraContainer' non trovato.");
    return;
  }
  container.innerHTML = ""; // Pulisce il container
  if (!variantElem || !variantElem.value) return;
  
  const selectedVariant = variantElem.value;
  if (variantExtraMapping[selectedVariant]) {
    const mapData = variantExtraMapping[selectedVariant];
    if (mapData.type === "skills") {
      let html = `<p><strong>Seleziona ${mapData.count} skill per ${selectedVariant}:</strong></p>`;
      for (let i = 0; i < mapData.count; i++) {
        html += `<select class="variantSkillChoice" id="variantSkillChoice${i}" data-options='${JSON.stringify(mapData.options)}' onchange="updateVariantSkillOptions()">
                    <option value="">Seleziona...</option>`;
        mapData.options.forEach(s => {
          html += `<option value="${s}">${s}</option>`;
        });
        html += `</select> `;
      }
      container.innerHTML = html;
      console.log(`✅ Variant skills per "${selectedVariant}" generate.`);
    } else if (mapData.type === "spells") {
      // Per il caso di variant spell, carica gli incantesimi e filtra in base al filtro specificato
      loadSpells(spellList => {
        const filtered = filterSpells(spellList, mapData.filter);
        if (!filtered.length) {
          container.innerHTML = `<p>Nessun incantesimo trovato per il filtro: ${mapData.filter}</p>`;
        } else {
          let html = `<p><strong>Seleziona un incantesimo per ${selectedVariant}:</strong></p>`;
          html += `<select id="variantSpellChoice">
                    <option value="">Seleziona...</option>`;
          filtered.forEach(spell => {
            html += `<option value="${spell.name}">${spell.name}</option>`;
          });
          html += `</select>`;
          container.innerHTML = html;
          console.log(`✅ Variant spell per "${selectedVariant}" generato.`);
        }
      });
    } else if (mapData.type === "none") {
      container.innerHTML = "";
      console.log(`ℹ️ Nessuna selezione extra richiesta per "${selectedVariant}".`);
    }
  }
}

/**
 * handleVariantFeatureChoices
 * Genera il dropdown per la scelta delle Variant Features disponibili dalla razza.
 * Inietta il markup nel container con ID "variantFeatureSelectionContainer".
 *
 * @param {Object} data - I dati della razza, che potrebbero contenere variant_feature_choices.
 */
function handleVariantFeatureChoices(data) {
  const container = document.getElementById("variantFeatureSelectionContainer");
  if (!data.variant_feature_choices || !container) {
    if (container) container.innerHTML = "";
    return;
  }
  let html = `<p><strong>Scegli una Variant Feature:</strong></p><select id="variantFeatureChoice"><option value="">Seleziona...</option>`;
  data.variant_feature_choices.forEach(opt => {
    html += `<option value="${opt.name}">${opt.name}</option>`;
  });
  html += `</select>`;
  container.innerHTML = html;
  // Aggiunge il listener per aggiornare le selezioni extra quando viene cambiata la Variant Feature
  const variantSelect = document.getElementById("variantFeatureChoice");
  if (variantSelect) {
    variantSelect.addEventListener("change", handleVariantExtraSelections);
  }
  console.log("✅ Variant feature choices generate.");
}

// Esponi le funzioni per l'uso globale
window.variantExtraMapping = variantExtraMapping;
window.updateVariantSkillOptions = updateVariantSkillOptions;
window.handleVariantExtraSelections = handleVariantExtraSelections;
window.handleVariantFeatureChoices = handleVariantFeatureChoices;
