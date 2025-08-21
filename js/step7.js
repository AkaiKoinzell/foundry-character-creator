document.addEventListener("DOMContentLoaded", () => {
  const step7Container = document.getElementById("step7");
  if (!step7Container) return;

  step7Container.innerHTML = `
    <h2>Step 7: Riepilogo ed Esportazione</h2>
    <div id="finalRecap"></div>
    <button id="generateJson">Genera JSON</button>
    <button id="generatePdf">Genera PDF</button>
  `;
});
