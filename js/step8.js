// rendering.js
// ========================================================
// MODULO: rendering.js
// Questo modulo contiene le funzioni di rendering, in particolare
// la funzione renderTables() che converte un array di "entries" in markup HTML.
// Queste funzioni possono essere utilizzate per visualizzare tabelle
// e strutture di dati simili in maniera standardizzata.
// ========================================================

console.log("✅ rendering.js loaded!");

/**
 * renderTables
 * Genera il markup HTML per le tabelle contenute nell’array di entries.
 *
 * Questa funzione itera su ogni entry e, se all’interno di essa esistono
 * sub-entry di tipo "table", genera il markup HTML per visualizzare la tabella.
 *
 * @param {Array} entries - Array di entry (es. raceData.rawEntries)
 * @returns {string} Il markup HTML generato per le tabelle
 */
function renderTables(entries) {
  let html = "";
  if (!entries || !Array.isArray(entries)) return html;
  
  entries.forEach(entry => {
    // Verifica se l'entry contiene un array di sub-entry
    if (entry.entries && Array.isArray(entry.entries)) {
      entry.entries.forEach(subEntry => {
        // Se la sub-entry è un oggetto di tipo "table", genera il markup
        if (typeof subEntry === "object" && subEntry.type === "table") {
          html += `<div class="table-container" style="margin-top:1em; margin-bottom:1em;">`;
          if (subEntry.caption) {
            html += `<p><strong>${subEntry.caption}</strong></p>`;
          }
          html += `<table border="1" style="width:100%; border-collapse: collapse;">`;
          
          // Colonne (se presenti)
          if (subEntry.colLabels && Array.isArray(subEntry.colLabels)) {
            html += `<thead><tr>`;
            subEntry.colLabels.forEach(label => {
              html += `<th style="padding: 0.5em; text-align: center;">${label}</th>`;
            });
            html += `</tr></thead>`;
          }
          
          // Righe della tabella
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
          
          // Se il nome dell'entry contiene "ancestry", aggiunge un dropdown per la selezione
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

// Esponi globalmente la funzione per l'uso negli altri moduli
window.renderTables = renderTables;
