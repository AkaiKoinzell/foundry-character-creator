// ==================== COMMON UTILITY FUNCTIONS ====================

export function extractSpellName(data) {
  if (Array.isArray(data)) {
    if (typeof data[0] === "string") {
      return data[0].split("#")[0];
    }
  } else if (typeof data === "object") {
    for (let key in data) {
      const result = extractSpellName(data[key]);
      if (result) return result;
    }
  }
  return null;
}

export function filterSpells(spells, filterString) {
  const conditions = filterString.split("|");
  return spells.filter(spell => {
    let valid = true;
    conditions.forEach(cond => {
      const parts = cond.split("=");
      if (parts.length === 2) {
        const key = parts[0].trim().toLowerCase();
        const value = parts[1].trim().toLowerCase();
        if (key === "level") {
          if (parseInt(spell.level) !== parseInt(value)) valid = false;
        } else if (key === "class") {
          if (!spell.spell_list || !spell.spell_list.map(x => x.toLowerCase()).includes(value)) valid = false;
        }
      }
    });
    return valid;
  });
}

export function handleError(message) {
  console.error("❌ " + message);
  alert("⚠️ " + message);
}

export function loadDropdownData(jsonPath, selectId, key) {
  fetch(jsonPath)
    .then(response => response.json())
    .then(data => {
      console.log(`📜 Dati ricevuti da ${jsonPath}:`, data);
      if (!data[key]) {
        handleError(`Chiave ${key} non trovata in ${jsonPath}`);
        return;
      }
      const options = Object.keys(data[key]).map(name => ({
        name: name,
        path: data[key][name]
      }));
      populateDropdown(selectId, options);
    })
    .catch(error => {
      console.error(`❌ Errore caricando ${jsonPath}:`, error);
      alert(`⚠️ Errore di connessione nel caricamento di ${jsonPath}. Riprova!`);
    });
}

export function populateDropdown(selectId, options) {
  const select = document.getElementById(selectId);
  if (!select) {
    handleError(`Elemento #${selectId} non trovato!`);
    return;
  }
  select.innerHTML = `<option value="">Seleziona...</option>`;
  options.forEach(option => {
    const opt = document.createElement("option");
    opt.value = option.path;
    opt.textContent = option.name;
    select.appendChild(opt);
  });
}
