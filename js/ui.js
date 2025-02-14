// ui.js

/**
 * Mostra il passo selezionato e nasconde gli altri.
 * @param {string} stepId - ID dello step da mostrare
 */
export function showStep(stepId) {
  const steps = document.querySelectorAll(".step");
  steps.forEach(step => {
    step.classList.toggle("active", step.id === stepId);
  });
}

/**
 * Inizializza la UI, impostando gli event listeners per i pulsanti di navigazione.
 */
export function initUI() {
  document.getElementById("btnStep1").addEventListener("click", () => showStep("step1"));
  document.getElementById("btnStep2").addEventListener("click", () => showStep("step2"));
  document.getElementById("btnStep3").addEventListener("click", () => showStep("step3"));
  document.getElementById("btnStep4").addEventListener("click", () => showStep("step4"));
  document.getElementById("btnStep5").addEventListener("click", () => showStep("step5"));
  document.getElementById("btnStep8").addEventListener("click", () => showStep("step8"));
}
