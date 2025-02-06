// step2.js – Visualizzazione dei tratti della razza

document.addEventListener("DOMContentLoaded", () => {
  const step2Container = document.getElementById("step2");
  if (!step2Container) return;

  // Quando viene cambiata la selezione della razza, richiama displayRaceTraits
  const raceSelect = document.getElementById("raceSelect");
  if (raceSelect) {
    raceSelect.addEventListener("change", displayRaceTraits);
  }
  
  // La funzione displayRaceTraits utilizza le funzioni definite in common.js
  window.displayRaceTraits = function() {
    const racePath = document.getElementById("raceSelect").value;
    const raceTraitsDiv = document.getElementById("raceTraits");
    if (!racePath) {
      raceTraitsDiv.innerHTML = "<p>Seleziona una razza per vedere i tratti.</p>";
      return;
    }
    fetch(racePath)
      .then(response => response.json())
      .then(data => {
        // Converte i dati della razza
        const raceData = convertRaceData(data);
        let html = `<h3>Tratti di ${raceData.name}</h3>`;
        // Velocità
        if (raceData.speed) {
          if (typeof raceData.speed === "object") {
            const speedDetails = Object.keys(raceData.speed)
              .map(key => `${key}: ${raceData.speed[key]} ft`)
              .join(", ");
            html += `<p><strong>Velocità:</strong> ${speedDetails}</p>`;
          } else {
            html += `<p><strong>Velocità:</strong> ${raceData.speed} ft</p>`;
          }
        }
        // Visione
        if (raceData.senses && raceData.senses.darkvision) {
          html += `<p><strong>Visione:</strong> ${raceData.senses.darkvision} ft</p>`;
        }
        // Tratti
        if (raceData.traits && raceData.traits.length > 0) {
          html += `<p><strong>Tratti:</strong></p><ul>`;
          raceData.traits.forEach(trait => {
            html += `<li><strong>${trait.name}:</strong> ${trait.description || ""}</li>`;
          });
          html += `</ul>`;
        }
        // Tabelle (se presenti)
        const tablesHtml = renderTables(raceData.rawEntries);
        html += tablesHtml;
        raceTraitsDiv.innerHTML = html;
        // Salva globalmente i dati della razza (per usarli negli step successivi)
        window.currentRaceData = raceData;
      })
      .catch(err => {
        console.error(err);
        handleError("Errore durante il caricamento dei tratti della razza.");
      });
  };
});
