document.addEventListener("DOMContentLoaded", () => {
  const step8Container = document.getElementById("step8");
  if (!step8Container) return;

  step8Container.innerHTML = `
    <h2>Step 8: Riepilogo ed Esportazione</h2>
    <div id="finalRecap"></div>
    <button id="exportJson">Esporta JSON</button>
    <!-- Puoi aggiungere qui anche il pulsante per esportare in PDF -->
  `;

  document.getElementById("exportJson").addEventListener("click", () => {
    // Raccogli tutti i dati necessari (questo è un esempio, adatta la logica alle tue variabili)
    const character = {
      name: document.getElementById("characterName") ? document.getElementById("characterName").value : "",
      level: document.getElementById("levelSelect") ? document.getElementById("levelSelect").value : "",
      // Aggiungi qui gli altri campi raccolti dagli step precedenti
    };
    downloadJsonFile(character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + "_character.json", character);
    document.getElementById("finalRecap").innerHTML = `<pre>${JSON.stringify(character, null, 2)}</pre>`;
  });
});

// Funzione comune per scaricare il JSON
function downloadJsonFile(filename, jsonData) {
  const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(jsonBlob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
