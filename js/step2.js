// step2.js – Visualizzazione dei tratti della razza

document.addEventListener("DOMContentLoaded", () => {
  const step2Container = document.getElementById("step2");
  if (!step2Container) return;

  // Se il dropdown delle razze esiste già (ad es. creato da common.js) lo utilizziamo per visualizzare i tratti
  // In questo esempio si assume che l’elemento con id "raceSelect" e "raceTraits" siano presenti nello step2
  // (puoi posizionarli in step2.html o inserirli dinamicamente)
  
  // Definisci la funzione globale displayRaceTraits (così può essere richiamata da altri step se necessario)
  window.displayRaceTraits = function() {
    const racePath = document.getElementById("raceSelect").value;
    if (!racePath) {
      document.getElementById("raceTraits").innerHTML = "<p>Seleziona una razza per vedere i tratti.</p>";
      return;
    }
    fetch(racePath)
      .then(response => response.json())
      .then(data => {
        // Usa convertRaceData definita in common.js per formattare i dati della razza
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
        
        // Visione (darkvision)
        if (raceData.senses && raceData.senses.darkvision) {
          html += `<p><strong>Visione:</strong> ${raceData.senses.darkvision} ft</p>`;
        }
        
        // Tratti (entries)
        if (raceData.traits && raceData.traits.length > 0) {
          html += `<p><strong>Tratti:</strong></p><ul>`;
          raceData.traits.forEach(trait => {
            html += `<li><strong>${trait.name}:</strong> ${trait.description || ""}</li>`;
          });
          html += `</ul>`;
        }
        
        // Inserisci il risultato nell'elemento con id "raceTraits"
        document.getElementById("raceTraits").innerHTML = html;
      })
      .catch(err => {
        console.error(err);
        handleError("Errore durante il caricamento dei tratti della razza.");
      });
  };

  // Associa il listener al dropdown delle razze (se non già fatto globalmente)
  const raceSelect = document.getElementById("raceSelect");
  if (raceSelect) {
    raceSelect.addEventListener("change", displayRaceTraits);
  }
});
