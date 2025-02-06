document.addEventListener("DOMContentLoaded", () => {
  const step2Container = document.getElementById("step2");
  if (!step2Container) return;

  // Carica le razze (dropdown)
  loadDropdownData("data/races.json", "raceSelect", "races");

  // Quando viene selezionata una razza, mostra i tratti (solo visualizzazione)
  window.displayRaceTraits = function() {
    const racePath = document.getElementById("raceSelect").value;
    if (!racePath) {
      document.getElementById("raceTraits").innerHTML = "<p>Seleziona una razza per vedere i tratti.</p>";
      return;
    }
    fetch(racePath)
      .then(response => response.json())
      .then(data => {
        // Usa la funzione convertRaceData per formattare i dati
        const raceData = convertRaceData(data);
        let html = `<h3>Tratti di ${raceData.name}</h3>`;
        if (raceData.speed) {
          html += `<p><strong>Velocità:</strong> ${typeof raceData.speed === "object" 
            ? Object.keys(raceData.speed).map(key => `${key}: ${raceData.speed[key]} ft`).join(", ")
            : raceData.speed + " ft"}</p>`;
        }
        if (raceData.senses && raceData.senses.darkvision) {
          html += `<p><strong>Visione:</strong> ${raceData.senses.darkvision} ft</p>`;
        }
        if (raceData.traits) {
          html += `<ul>`;
          raceData.traits.forEach(trait => {
            html += `<li><strong>${trait.name}:</strong> ${trait.description || ""}</li>`;
          });
          html += `</ul>`;
        }
        document.getElementById("raceTraits").innerHTML = html;
      })
      .catch(err => console.error(err));
  };

  // Associa il listener al dropdown (se non già fatto globalmente)
  document.getElementById("raceSelect").addEventListener("change", displayRaceTraits);
});
