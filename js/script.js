import { showStep, initUI } from "./ui.js";
import { variantExtraMapping, updateVariantSkillOptions, handleVariantExtraSelections, handleVariantFeatureChoices } from "./variantFeatures.js";
import { loadSpells, handleSpellcasting } from "./spellcasting.js";
import { loadLanguages, handleExtraLanguages, handleExtraSkills, handleExtraTools, handleExtraAncestry } from "./extras.js";
import { extractSpellName, filterSpells, handleError, loadDropdownData, populateDropdown } from "./commonUtils.js";
import { convertRaceData } from "./raceData.js";
import { renderTables } from "./tableRenderer.js";
import { openRaceExtrasModal, updateExtraSelectionsView, showExtraSelection } from "./raceExtras.js";
import { adjustPoints, updateFinalScores, initializeValues, applyRacialBonuses, resetRacialBonuses } from "./pointBuy.js";
import { updateSubclasses } from "./classData.js";
import { generateFinalJson } from "./characterExport.js";


// ✅ Inizializzazione UI e dati al caricamento della pagina
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Applicazione caricata!");
  
  initUI();
  loadDropdownData("data/races.json", "raceSelect", "races");
  loadDropdownData("data/classes.json", "classSelect", "classes");
  initializeValues();

  setupEventListeners();
  showStep("step1");
});

let selectedData = sessionStorage.getItem("selectedData")
  ? JSON.parse(sessionStorage.getItem("selectedData"))
  : {};

// ✅ Imposta tutti gli event listener in un'unica funzione
function setupEventListeners() {
  document.getElementById("raceSelect").addEventListener("change", handleRaceChange);
  document.getElementById("confirmRaceSelection").addEventListener("click", confirmRaceSelection);
  document.getElementById("generateJson").addEventListener("click", generateFinalJson);
  document.getElementById("levelSelect").addEventListener("change", displayRaceTraits);
}

// ✅ Funzione chiamata quando si cambia razza
function handleRaceChange() {
  console.log("🔄 Razza cambiata, reset delle selezioni extra...");
  resetExtraSelections();
  displayRaceTraits();
  document.getElementById("confirmRaceSelection").style.display = "inline-block";
}

// ✅ Funzione che conferma la selezione della razza e apre il pop-up per le scelte extra
function confirmRaceSelection() {
  const selectedRace = document.getElementById("raceSelect").value;
  if (!selectedRace) {
    alert("⚠️ Seleziona una razza prima di procedere!");
    return;
  }

  fetch(selectedRace)
  .then(response => response.json())
  .then(data => convertRaceData(data)) // Usa la Promise
  .then(raceData => {
    const selections = prepareExtraSelections(raceData);
    sessionStorage.setItem("popupOpened", "true");
    openRaceExtrasModal(selections);
    document.getElementById("confirmRaceSelection").style.display = "none";
  })
  .catch(error => handleError(`Errore caricando i dati della razza: ${error}`));
}

// ✅ Prepara le selezioni extra per il pop-up
function prepareExtraSelections(raceData) {
  let selections = [];

 if (raceData.languages?.choice > 0) {
  let availableLanguages = raceData.languages.options?.length > 0 
    ? raceData.languages.options 
    : ["Qualsiasi lingua (decisa con il DM)"];

  selections.push({ 
    name: "Languages", 
    description: "Choose an additional language.", 
    selection: availableLanguages, 
    count: raceData.languages.choice 
  });
}
  if (raceData.skill_choices) {
    selections.push({ name: "Skill Proficiency", description: "Choose skill proficiencies.", selection: raceData.skill_choices.options, count: raceData.skill_choices.number });
  }
  if (raceData.tool_choices) {
    selections.push({ name: "Tool Proficiency", description: "Choose a tool proficiency.", selection: raceData.tool_choices.options, count: 1 });
  }
  if (raceData.spellcasting?.ability_choices?.length > 0) {
    selections.push({ name: "Spellcasting Ability", description: "Choose a spellcasting ability.", selection: raceData.spellcasting.ability_choices, count: 1 });
  }
  if (raceData.spellcasting?.spell_choices?.type === "fixed_list") {
    selections.push({ name: "Spellcasting", description: "Choose a spell.", selection: raceData.spellcasting.spell_choices.options, count: 1 });
  }

  return selections;
}

// ✅ Funzione per visualizzare i tratti della razza selezionata
function displayRaceTraits() {
  console.log("🛠 Esecuzione displayRaceTraits()...");
  const racePath = document.getElementById("raceSelect").value;
  const raceTraitsDiv = document.getElementById("raceTraits");

  if (!racePath) {
    console.warn("⚠️ Nessuna razza selezionata.");
    raceTraitsDiv.innerHTML = "<p>Seleziona una razza per vedere i tratti.</p>";
    resetRacialBonuses();
    return;
  }

  fetch(racePath)
    .then(response => response.json())
    .then(data => convertRaceData(data)) // Gestione asincrona
    .then(raceData => {
      console.log("📜 Dati razza convertiti:", raceData);
      updateRaceTraitsUI(raceData);
    })
    .catch(error => handleError(`❌ Errore caricando i tratti della razza: ${error}`));
}

// ✅ Aggiorna l'interfaccia con i tratti della razza
function updateRaceTraitsUI(raceData) {
  const raceTraitsDiv = document.getElementById("raceTraits");
  raceTraitsDiv.innerHTML = `<h3>Tratti di ${raceData.name}</h3>`;

  if (raceData.speed) {
  let speedText = Object.entries(raceData.speed)
    .map(([type, value]) => `${type === "walk" ? "Camminare" : type.charAt(0).toUpperCase() + type.slice(1)}: ${value} ft`)
    .join(", ");
  raceTraitsDiv.innerHTML += `<p><strong>Velocità:</strong> ${speedText}</p>`;
}
  raceTraitsDiv.innerHTML += raceData.senses?.darkvision ? `<p><strong>Visione:</strong> ${raceData.senses.darkvision} ft</p>` : "";
  raceTraitsDiv.innerHTML += raceData.traits.length > 0 ? `<p><strong>Tratti:</strong></p><ul>${raceData.traits.map(t => `<li><strong>${t.name}:</strong> ${t.description || ""}</li>`).join("")}</ul>` : "";

  raceTraitsDiv.innerHTML += renderTables(raceData.rawEntries);

  handleSpellcasting(raceData, raceTraitsDiv.innerHTML);
  handleExtraSkills(raceData, "skillSelectionContainer");
  handleExtraTools(raceData, "toolSelectionContainer");
  handleVariantFeatureChoices(raceData);
  handleExtraAncestry(raceData, "ancestrySelection");

  updateExtraSelectionsView();
  resetRacialBonuses();
  window.currentRaceData = raceData;
}

// ✅ Resetta le selezioni extra
function resetExtraSelections() {
  selectedData = {}; // Ora è definito
  sessionStorage.setItem("selectedData", JSON.stringify(selectedData)); // ✅ Salva lo stato

  ["languageSelection", "skillSelectionContainer", "toolSelectionContainer", "spellSelectionContainer"].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.innerHTML = "";
  });

  console.log("✅ Extra selections resettate:", selectedData);
}
