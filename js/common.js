// ==================== COMMON FUNCTIONS (common.js) ====================

// -------------------------
// Caricamento dati e popolamento dropdown
// -------------------------
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
    .catch(error => handleError(`Errore caricando ${jsonPath}: ${error}`));
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

// -------------------------
// Funzione per caricare le lingue da un file JSON
// -------------------------
export function loadLanguages(callback) {
  fetch("data/languages.json")
    .then(response => response.json())
    .then(data => {
      if (data.languages) {
        callback(data.languages);
      } else {
        handleError("Nessuna lingua trovata nel file JSON.");
      }
    })
    .catch(error => handleError(`Errore caricando le lingue: ${error}`));
}

// -------------------------
// Funzione per mostrare un messaggio d'errore
// -------------------------
export function handleError(message) {
  console.error("❌ " + message);
  alert("⚠️ " + message);
}

// -------------------------
// Funzione per il rendering di tabelle (es. per alcune entry)
// -------------------------
export function renderTables(entries) {
  let html = "";
  if (!entries || !Array.isArray(entries)) return html;
  entries.forEach(entry => {
    if (entry.entries && Array.isArray(entry.entries)) {
      entry.entries.forEach(subEntry => {
        if (typeof subEntry === "object" && subEntry.type === "table") {
          html += `<div class="table-container" style="margin-top:1em; margin-bottom:1em;">`;
          if (subEntry.caption) {
            html += `<p><strong>${subEntry.caption}</strong></p>`;
          }
          html += `<table border="1" style="width:100%; border-collapse: collapse;">`;
          if (subEntry.colLabels && Array.isArray(subEntry.colLabels)) {
            html += `<thead><tr>`;
            subEntry.colLabels.forEach(label => {
              html += `<th style="padding: 0.5em; text-align: center;">${label}</th>`;
            });
            html += `</tr></thead>`;
          }
          if (subEntry.rows && Array.isArray(subEntry.rows)) {
            html += `<tbody>`;
            subEntry.rows.forEach(row => {
              html += `<tr>`;
              row.forEach(cell => {
                html += `<td style="padding: 0.5em; text-align: center;">${cell}</td>`;
              });
              html += `</tr>`;
            });
            html += `</tbody>`;
          }
          html += `</table>`;
          // Se l'entry riguarda "ancestry", aggiunge un dropdown
          if (entry.name && entry.name.toLowerCase().includes("ancestry")) {
            let optsHtml = `<option value="">Seleziona...</option>`;
            subEntry.rows.forEach(row => {
              const optVal = JSON.stringify(row);
              const optLabel = `${row[0]} (${row[1]})`;
              optsHtml += `<option value='${optVal}'>${optLabel}</option>`;
            });
            html += `<p><strong>Seleziona Ancestry:</strong>
                      <select id="ancestrySelect">${optsHtml}</select>
                     </p>`;
          }
          html += `</div>`;
        }
      });
    }
  });
  return html;
}
