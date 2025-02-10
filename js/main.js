// main.js
// ======================================================================
// MODULO: main.js
// Questo file è il punto di ingresso principale per l'applicazione.
// Qui vengono inizializzate le funzionalità globali, la navigazione tra gli
// step e vengono richiamati i moduli che gestiscono le varie funzionalità.
// Assicurati che tutti gli altri file (common.js, variantFeatures.js, spellcasting.js,
// extras.js, conversion.js, rendering.js, displayTraits.js, updateSubclasses.js,
// jsonGenerator.js, pointBuy.js) siano caricati PRIMA di questo file.
// ======================================================================

console.log("✅ main.js loaded!");

// Inizializza l'applicazione una volta che il DOM è completamente pronto
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Application initializing...");

    // Configura la navigazione tra gli step
    setupStepNavigation();

    // Imposta un listener per il cambio del livello, utile per aggiornare
    // (ad es.) il sistema Point Buy e le funzionalità di Spellcasting
    const levelSelect = document.getElementById("levelSelect");
    if (levelSelect) {
        levelSelect.addEventListener("change", () => {
            console.log("🔄 Livello modificato, aggiornamento della visualizzazione...");
            // Se è disponibile la funzione per mostrare i tratti (ad esempio, in displayTraits.js)
            if (typeof displayRaceTraits === "function") {
                displayRaceTraits();
            }
        });
    }

    // Inizializza il sistema Point Buy (funzione definita in pointBuy.js)
    if (typeof initializeValues === "function") {
        initializeValues();
    }

    console.log("✅ Application initialized.");
});

/**
 * setupStepNavigation()
 * -----------------------
 * Configura la navigazione tra gli step dell'applicazione.
 * Si basa sui pulsanti (ad es. btnStep1, btnStep2, …) e sui container
 * con classe "step" (ad es. step1, step2, …). Quando viene cliccato un pulsante,
 * viene mostrato lo step corrispondente e nascosti gli altri.
 */
function setupStepNavigation() {
    const steps = document.querySelectorAll(".step");
    const navButtons = document.querySelectorAll("nav button");

    /**
     * showStep(stepId)
     * Mostra lo step identificato da stepId e nasconde gli altri.
     *
     * @param {string} stepId - L'id del container dello step da mostrare (es. "step1").
     */
    function showStep(stepId) {
        steps.forEach(step => {
            if (step.id === stepId) {
                step.classList.add("active");
            } else {
                step.classList.remove("active");
            }
        });
        console.log(`🔄 Displaying step: ${stepId}`);
    }

    // Assegna i listener per ogni pulsante di navigazione
    navButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Supponiamo che il pulsante abbia un id come "btnStepX"
            // e lo step corrispondente abbia id "stepX".
            const stepId = button.id.replace("btn", "step");
            showStep(stepId);
        });
    });

    // Mostra il primo step all'avvio (ad esempio, "step1")
    showStep("step1");
}
