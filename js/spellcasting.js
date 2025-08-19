export function loadSpells(callback) {
  fetch('data/spells.json')
    .then(response => response.json())
    .then(data => {
      console.log('📖 Spells loaded:', data);
      callback(data);
    })
    .catch(error => console.error('❌ Error loading spells:', error));
}

export function filterSpells(spells, filterString) {
  const conditions = filterString.split('|');
  return spells.filter(spell => {
    let valid = true;
    conditions.forEach(cond => {
      const parts = cond.split('=');
      if (parts.length === 2) {
        const key = parts[0].trim().toLowerCase();
        const value = parts[1].trim().toLowerCase();
        if (key === 'level') {
          if (parseInt(spell.level) !== parseInt(value)) valid = false;
        } else if (key === 'class') {
          if (!spell.spell_list || !spell.spell_list.map(x => x.toLowerCase()).includes(value)) valid = false;
        }
      }
    });
    return valid;
  });
}

export function handleSpellcasting(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  if (data.spellcasting) {
    console.log(`🔍 JSON Spellcasting per ${data.name}:`, data.spellcasting);

    if (data.spellcasting.fixed_spell) {
      container.innerHTML += `<p><strong>✨ Assigned spell:</strong> ${data.spellcasting.fixed_spell}</p>`;
    }

    if (data.spellcasting.spell_choices) {
      if (data.spellcasting.spell_choices.type === 'fixed_list') {
        const options = data.spellcasting.spell_choices.options
          .map(spell => `<option value="${spell}">${spell}</option>`)
          .join('');
        container.innerHTML += `
          <p><strong>🔮 Choose a spell:</strong></p>
          <select id="spellSelection">
            <option value="">Select...</option>${options}
          </select>`;
      } else if (data.spellcasting.spell_choices.type === 'filter') {
        const filterParts = data.spellcasting.spell_choices.filter.split('|');
        const spellLevel = filterParts.find(part => part.startsWith('level='))?.split('=')[1];
        const spellClass = filterParts.find(part => part.startsWith('class='))?.split('=')[1];

        if (spellLevel && spellClass) {
          loadSpells(spellList => {
            const filteredSpells = spellList
              .filter(spell => parseInt(spell.level) === parseInt(spellLevel) && spell.spell_list.includes(spellClass))
              .map(spell => `<option value="${spell.name}">${spell.name}</option>`)
              .join('');

            if (filteredSpells) {
              container.innerHTML += `
                <p><strong>🔮 Choose a ${spellClass} Cantrip:</strong></p>
                <select id="spellSelection">
                  <option value="">Select...</option>${filteredSpells}
                </select>`;
            } else {
              container.innerHTML += `<p><strong>⚠️ No Cantrip available for ${spellClass}.</strong></p>`;
            }
          });
        } else {
          container.innerHTML += `<p><strong>⚠️ Error: Spell filter is not valid for this race.</strong></p>`;
        }
      }
    }

    if (data.spellcasting.ability_choices && Array.isArray(data.spellcasting.ability_choices)) {
      console.log(`🧙‍♂️ Checking casting ability for ${data.name}:`, data.spellcasting.ability_choices);
      if (data.spellcasting.ability_choices.length > 1) {
        const abilityOptions = data.spellcasting.ability_choices
          .map(a => `<option value="${a.toUpperCase()}">${a.toUpperCase()}</option>`)
          .join('');
        container.innerHTML += `
          <p><strong>🧠 Select the casting ability:</strong></p>
          <select id="castingAbility">
            <option value="">Select...</option>${abilityOptions}
          </select>`;
      }
    }
  }
}
