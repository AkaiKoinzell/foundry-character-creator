// variantFeatures.js

export const variantExtraMapping = {
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
 * Aggiorna le opzioni delle skill varianti in base alle selezioni fatte
 */
export function updateVariantSkillOptions() {
  const allVariantSkillSelects = document.querySelectorAll(".variantSkillChoice");
  if (!allVariantSkillSelects.length) return;

  const selected = new Set([...allVariantSkillSelects].map(select => select.value).filter(Boolean));

  allVariantSkillSelects.forEach(select => {
    const current = select.value;
    select.innerHTML = `<option value="">Seleziona...</option>`;
    JSON.parse(select.getAttribute("data-options")).forEach(skill => {
      const option = document.createElement("option");
      option.value = skill;
      option.textContent = skill;
      if (skill === current || !selected.has(skill)) {
        select.appendChild(option);
        if (skill === current) option.selected = true;
      }
    });
  });
}

/**
 * Gestisce le selezioni extra legate alle varianti di razza
 */
export function handleVariantExtraSelections() {
  const variantElem = document.getElementById("variantFeatureChoice");
  const container = document.getElementById("variantExtraContainer");
  if (!container || !variantElem || !variantElem.value) return;
  
  const selectedVariant = variantElem.value;
  const mapData = variantExtraMapping[selectedVariant];

  container.innerHTML = ""; // Pulisce il contenuto precedente

  if (!mapData) return;

  switch (mapData.type) {
    case "skills":
      container.innerHTML = `<p><strong>Seleziona ${mapData.count} skill per ${selectedVariant}:</strong></p>` +
        Array(mapData.count).fill(0).map((_, i) => 
          `<select class="variantSkillChoice" id="variantSkillChoice${i}" data-options='${JSON.stringify(mapData.options)}' onchange="updateVariantSkillOptions()">
            <option value="">Seleziona...</option>
            ${mapData.options.map(s => `<option value="${s}">${s}</option>`).join("")}
          </select>`
        ).join(" ");
      break;

    case "spells":
      loadSpells(spellList => {
        const filtered = filterSpells(spellList, mapData.filter);
    
        container.innerHTML = filtered.length
          ? `<p><strong>Seleziona un incantesimo per ${selectedVariant}:</strong></p>
              <select id="variantSpellChoice">
                <option value="">Seleziona...</option>
                ${filtered.map(spell => `<option value="${spell.name}">${spell.name}</option>`).join("")}
              </select>`
          : `<p>Nessun incantesimo trovato per il filtro: ${mapData.filter}</p>`;
      });
      break;
  }
}

/**
 * Gestisce la selezione delle varianti di razza
 * @param {Object} data - Dati della razza
 */
export function handleVariantFeatureChoices(data) {
  if (!data.variant_feature_choices) return;

  console.log(`📌 Trovata Variant Feature per ${data.name}:`, data.variant_feature_choices);

  const container = document.getElementById("variantFeatureSelectionContainer");
  if (!container) return;
  
  let html = `<p><strong>Scegli una Variant Feature:</strong></p><select id="variantFeatureChoice">
                <option value="">Seleziona...</option>`;
  data.variant_feature_choices.forEach(opt => {
    html += `<option value="${opt.name}">${opt.name}</option>`;
  });
  html += `</select>`;
  
  container.innerHTML = html;
  document.getElementById("variantFeatureChoice").addEventListener("change", handleVariantExtraSelections);
}
