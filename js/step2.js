// step2.js – Visualizzazione dei tratti della razza

document.addEventListener("DOMContentLoaded", () => {
  const step2Container = document.getElementById("step2");
  if (!step2Container) return;

  // Carica il dropdown delle razze utilizzando la funzione comune
  loadDropdownData("data/races.json", "raceSelect", "races");

  // Definisce la funzione per visualizzare i tratti della razza selezionata
  window.displayRaceTraits = function () {
    const raceSelect = document.getElementById("raceSelect");
    if (!raceSelect) return;
    const racePath = raceSelect.value;
    if (!racePath) {
      document.getElementById("raceTraits").innerHTML =
        "<p>Seleziona una razza per vedere i tratti.</p>";
      return;
    }

    // Recupera il file JSON della razza selezionata
    fetch(racePath)
      .then(response => response.json())
      .then(data => {
        // Converte i dati grezzi in un formato più utilizzabile
        const raceData = convertRaceData(data);
        let html = `<h3>Tratti di ${raceData.name}</h3>`;

        // Gestione della velocità
        if (raceData.speed) {
          if (typeof raceData.speed === "object") {
            const speeds = Object.entries(raceData.speed)
              .map(([type, value]) => `${type}: ${value} ft`)
              .join(", ");
            html += `<p><strong>Velocità:</strong> ${speeds}</p>`;
          } else {
            html += `<p><strong>Velocità:</strong> ${raceData.speed} ft</p>`;
          }
        }

        // Gestione della visione (es. darkvision)
        if (raceData.senses && raceData.senses.darkvision) {
          html += `<p><strong>Visione:</strong> ${raceData.senses.darkvision} ft</p>`;
        }

        // Visualizza i tratti (traits)
        if (raceData.traits && raceData.traits.length > 0) {
          html += "<ul>";
          raceData.traits.forEach(trait => {
            html += `<li><strong>${trait.name}:</strong> ${trait.description || ""}</li>`;
          });
          html += "</ul>";
        }

        // Inserisce il markup dei tratti nell'elemento dedicato
        document.getElementById("raceTraits").innerHTML = html;
      })
      .catch(err => {
        console.error("Errore nel caricamento dei dati della razza:", err);
        handleError("Errore caricando i tratti della razza: " + err);
      });
  };

  // Associa l'evento change al dropdown delle razze
  document.getElementById("raceSelect").addEventListener("change", displayRaceTraits);
});
