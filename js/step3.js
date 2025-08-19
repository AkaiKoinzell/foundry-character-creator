// step3.js – Point Buy System

document.addEventListener("DOMContentLoaded", () => {
  // Inizializza il sistema di Point Buy al caricamento della pagina
  initializeValues();

  // Se hai pulsanti per aggiungere o sottrarre punti, questi dovranno avere (ad esempio)
  // onclick="adjustPoints('str', 'add')" o simili, definiti nell'HTML.
});

// Variabile globale per i punti totali
var totalPoints = 27;

// Funzione per modificare i punti di una caratteristica
function adjustPoints(ability, action) {
  const pointsSpan = document.getElementById(ability + "Points");
  let points = parseInt(pointsSpan.textContent);

  if (action === 'add' && totalPoints > 0 && points < 15) {
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

// Funzione per aggiornare i punteggi finali delle caratteristiche
function updateFinalScores() {
  const abilities = ["str", "dex", "con", "int", "wis", "cha"];
  const level = parseInt(document.getElementById("levelSelect")?.value) || 1;
  abilities.forEach(ability => {
    const basePoints = parseInt(document.getElementById(ability + "Points").textContent);
    const raceModifier = parseInt(document.getElementById(ability + "RaceModifier").textContent);
    const backgroundTalent = parseInt(document.getElementById(ability + "BackgroundTalent").value) || 0;
    const finalScore = basePoints + raceModifier + backgroundTalent;
    const finalScoreElement = document.getElementById(ability + "FinalScore");
    if (level === 1 && finalScore > 17) {
      finalScoreElement.textContent = "Errore";
      finalScoreElement.style.color = "red";
    } else {
      finalScoreElement.textContent = finalScore;
      finalScoreElement.style.color = "";
    }
  });
  console.log("🔄 Punteggi Finali aggiornati!");
}

// Funzione per inizializzare i valori all'avvio
function initializeValues() {
  const abilities = ["str", "dex", "con", "int", "wis", "cha"];
  abilities.forEach(ability => {
    const raceModEl = document.getElementById(ability + "RaceModifier");
    if (raceModEl) raceModEl.textContent = "0";
    const backgroundTalentEl = document.getElementById(ability + "BackgroundTalent");
    if (backgroundTalentEl) backgroundTalentEl.value = "0";
  });
  updateFinalScores();
}

// Funzione per applicare i bonus razziali (il punto buy potrebbe essere modificato in base alla razza)
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

// Funzione per resettare i bonus razziali
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

// Nota: La funzione handleError() deve essere definita anche nel file common.js o qui,
// oppure puoi includerla in common.js e rimuoverla da questo file se la vuoi avere in un file unico.
