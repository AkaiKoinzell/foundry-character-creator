// pointBuy.js
// ========================================================
// MODULO: pointBuy.js
// Questo modulo gestisce il sistema Point Buy per la creazione
// del personaggio. Include funzioni per aggiustare i punteggi base,
// applicare bonus razziali, aggiornare i punteggi finali e
// inizializzare il sistema.
// ========================================================

console.log("✅ pointBuy.js loaded!");

// Variabile globale per i punti totali
var totalPoints = 27;

/**
 * adjustPoints(ability, action)
 * -------------------------------
 * Aggiusta i punti di una caratteristica in base all'azione ('add' o 'subtract').
 * Aggiorna anche il totale dei punti rimanenti e i punteggi finali.
 *
 * @param {string} ability - L’identificativo della caratteristica (es. 'str', 'dex').
 * @param {string} action - L’azione da eseguire: 'add' per aumentare, 'subtract' per diminuire.
 */
function adjustPoints(ability, action) {
  const pointsSpan = document.getElementById(ability + "Points");
  let points = parseInt(pointsSpan.textContent);
  
  if (action === 'add' && totalPoints > 0 && points < 15) {
    // Sottrae 2 punti se il punteggio è già alto, altrimenti 1
    totalPoints -= (points >= 13 ? 2 : 1);
    points++;
  } else if (action === 'subtract' && points > 8) {
    totalPoints += (points > 13 ? 2 : 1);
    points--;
  }
  
  pointsSpan.textContent = points;
  
  const pointsRemaining = document.getElementById("pointsRemaining");
  if (pointsRemaining) {
    pointsRemaining.textContent = totalPoints;
  }
  
  updateFinalScores();
}

/**
 * updateFinalScores()
 * ---------------------
 * Calcola e aggiorna i punteggi finali delle caratteristiche (base + modificatore razziale).
 * I punteggi maggiori di 18 vengono evidenziati in rosso.
 */
function updateFinalScores() {
  const abilities = ["str", "dex", "con", "int", "wis", "cha"];
  abilities.forEach(ability => {
    const basePoints = parseInt(document.getElementById(ability + "Points").textContent);
    const raceModifier = parseInt(document.getElementById(ability + "RaceModifier").textContent);
    const finalScore = basePoints + raceModifier;
    const finalScoreElement = document.getElementById(ability + "FinalScore");
    finalScoreElement.textContent = finalScore;
    finalScoreElement.style.color = finalScore > 18 ? "red" : "";
  });
  console.log("🔄 Punteggi Finali aggiornati!");
}

/**
 * initializeValues()
 * --------------------
 * Inizializza il sistema Point Buy, impostando tutti i modificatori razziali a 0
 * e aggiornando i punteggi finali.
 */
function initializeValues() {
  const abilities = ["str", "dex", "con", "int", "wis", "cha"];
  abilities.forEach(ability => {
    const raceModEl = document.getElementById(ability + "RaceModifier");
    if (raceModEl) raceModEl.textContent = "0";
  });
  updateFinalScores();
}

/**
 * applyRacialBonuses()
 * -----------------------
 * Applica i bonus razziali in base alle selezioni effettuate nei dropdown.
 * Verifica che siano stati selezionati tutti e tre i bonus e che la distribuzione
 * sia valida (o +2 e +1 oppure +1 a tre caratteristiche diverse).
 */
function applyRacialBonuses() {
  console.log("⚡ applyRacialBonuses() chiamata!");
  const bonus1 = document.getElementById("racialBonus1").value;
  const bonus2 = document.getElementById("racialBonus2").value;
  const bonus3 = document.getElementById("racialBonus3").value;
  
  if (!bonus1 || !bonus2 || !bonus3) {
    handleError("Devi selezionare tutti e tre i bonus razziali!");
    return;
  }
  
  const selections = [bonus1, bonus2, bonus3];
  const counts = {};
  selections.forEach(bonus => {
    counts[bonus] = (counts[bonus] || 0) + 1;
  });
  
  const values = Object.values(counts);
  const validDistribution =
    (values.includes(2) && values.includes(1) && Object.keys(counts).length === 2) ||
    (values.every(val => val === 1) && Object.keys(counts).length === 3);
  
  if (!validDistribution) {
    handleError("Puoi assegnare +2 a una caratteristica e +1 a un'altra, oppure +1 a tre diverse!");
    return;
  }
  
  const abilityIds = ["str", "dex", "con", "int", "wis", "cha"];
  abilityIds.forEach(stat => {
    const el = document.getElementById(stat + "RaceModifier");
    if (el) {
      el.textContent = counts[stat] ? counts[stat] : "0";
    }
  });
  
  console.log("✅ Bonus razziali applicati:", counts);
  updateFinalScores();
}

/**
 * resetRacialBonuses()
 * ------------------------
 * Resetta i dropdown dei bonus razziali e imposta tutti i modificatori razziali a 0.
 */
function resetRacialBonuses() {
  document.getElementById("racialBonus1").value = "";
  document.getElementById("racialBonus2").value = "";
  document.getElementById("racialBonus3").value = "";
  
  const abilityFields = ["str", "dex", "con", "int", "wis", "cha"];
  abilityFields.forEach(ability => {
    const el = document.getElementById(ability + "RaceModifier");
    if (el) el.textContent = "0";
  });
  
  updateFinalScores();
}

// Espone globalmente le funzioni del modulo Point Buy
window.adjustPoints = adjustPoints;
window.updateFinalScores = updateFinalScores;
window.initializeValues = initializeValues;
window.applyRacialBonuses = applyRacialBonuses;
window.resetRacialBonuses = resetRacialBonuses;

console.log("✅ pointBuy.js module ready!");
