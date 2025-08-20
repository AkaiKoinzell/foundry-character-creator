import { loadSpells, filterSpells } from './spellcasting.js';
import { getSelectedData, saveSelectedData } from './state.js';
import { checkTraitCompletion } from './script.js';
import { buildChoiceSelectors } from './selectionUtils.js';

const variantExtraMapping = {
  "Drow Magic": {
    type: "none",
  },
  "Skill Versatility": {
    type: "skills",
    count: 2,
    options: [
      "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History",
      "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception",
      "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival",
    ],
  },
  "Swim": { type: "none" },
  "Cantrip (Wizard)": {
    type: "spells",
    filter: "level=0|class=Wizard",
  },
};


export function handleVariantExtraSelections() {
  const variantElem = document.getElementById('variantFeatureChoice');
  const container = document.getElementById('variantExtraContainer');
  if (!container || !variantElem || !variantElem.value) return;

  const selectedVariant = variantElem.value;
  const mapData = variantExtraMapping[selectedVariant];

  container.innerHTML = '';
  if (!mapData) return;

  if (mapData.type === 'skills') {
    container.innerHTML = `<p><strong>Seleziona ${mapData.count} skill per ${selectedVariant}:</strong></p>`;
    const onChange = () => {
      const data = getSelectedData();
      data['Variant Feature Skills'] = [...container.querySelectorAll('.variantSkillChoice')]
        .map(s => s.value)
        .filter(Boolean);
      saveSelectedData();
      checkTraitCompletion('variantFeatureTrait');
    };
    buildChoiceSelectors(container, mapData.count, mapData.options, 'variantSkillChoice', onChange);
  } else if (mapData.type === 'spells') {
    loadSpells(spellList => {
      const filtered = filterSpells(spellList, mapData.filter);
      container.innerHTML = filtered.length
        ? `<p><strong>Seleziona un incantesimo per ${selectedVariant}:</strong></p>
            <select id="variantSpellChoice">
              <option value="">Seleziona...</option>
              ${filtered.map(spell => `<option value="${spell.name}">${spell.name}</option>`).join('')}
            </select>`
        : `<p>Nessun incantesimo trovato per il filtro: ${mapData.filter}</p>`;

      const spellSel = document.getElementById('variantSpellChoice');
      if (spellSel) {
        spellSel.addEventListener('change', () => {
          const data = getSelectedData();
          data['Variant Feature Spell'] = [spellSel.value];
          saveSelectedData();
          checkTraitCompletion('variantFeatureTrait');
        });
        checkTraitCompletion('variantFeatureTrait');
      }
    });
  }
}

export function handleVariantFeatureChoices(data) {
  if (!data.variant_feature_choices) return;
  const container = document.getElementById('variantFeatureSelectionContainer');
  if (!container) return;

  let html = `<p><strong>Scegli una Variant Feature:</strong></p><select id="variantFeatureChoice">
                <option value="">Seleziona...</option>`;
  data.variant_feature_choices.forEach(opt => {
    html += `<option value="${opt.name}">${opt.name}</option>`;
  });
  html += `</select>`;

  container.innerHTML = html;
  document.getElementById('variantFeatureChoice').addEventListener('change', handleVariantExtraSelections);
}
