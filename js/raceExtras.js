// ==================== POPUP FOR EXTRA SELECTIONS ====================
let selectedData = sessionStorage.getItem("selectedData")
  ? JSON.parse(sessionStorage.getItem("selectedData"))
  : {};
let extraSelections = [];
let currentSelectionIndex = 0;

/**
 * Opens the extra selections popup.
 * Hides the background extra traits container and shows the modal.
 */
export function openRaceExtrasModal(selections) {
  if (!selections || selections.length === 0) {
    console.warn("⚠️ Nessuna selezione extra disponibile, il pop-up non verrà mostrato.");
    return;
  }
  extraSelections = selections;
  currentSelectionIndex = 0;
  showExtraSelection();

  if (!sessionStorage.getItem("popupOpened")) {
    sessionStorage.setItem("popupOpened", "true");
  }

  // Inizializza le categorie in selectedData se non esistono già
  selections.forEach(selection => {
    if (!selectedData[selection.name]) {
      selectedData[selection.name] = [];
    }
  });

  sessionStorage.setItem("popupOpened", "true");

  document.getElementById("raceExtraTraitsContainer").style.display = "none";
  document.getElementById("raceExtrasModal").style.display = "flex";
}

/**
 * Updates the UI with extra selections stored in sessionStorage.
 */
export function updateExtraSelectionsView() {
  console.log("🔄 Recupero selezioni extra salvate...");

  selectedData = sessionStorage.getItem("selectedData")
    ? JSON.parse(sessionStorage.getItem("selectedData"))
    : selectedData;

  function updateContainer(id, title, dataKey) {
    const container = document.getElementById(id);
    if (container) {
      if (selectedData[dataKey] && selectedData[dataKey].length > 0) {
        container.innerHTML = `<p><strong>${title}:</strong> ${selectedData[dataKey].join(", ")}</p>`;
        container.style.display = "block";  
      } else {
        container.innerHTML = `<p><strong>${title}:</strong> Nessuna selezione.</p>`;
        container.style.display = "block";  
      }
    }
  }

  updateContainer("languageSelection", "Lingue Extra", "Languages");
  updateContainer("skillSelectionContainer", "Skill Proficiency", "Skill Proficiency");
  updateContainer("toolSelectionContainer", "Tool Proficiency", "Tool Proficiency");
  updateContainer("spellSelectionContainer", "Spellcasting", "Spellcasting");

  console.log("✅ Extra selections aggiornate:", selectedData);
}

/**
 * Displays the current extra selection in the popup.
 */
export function showExtraSelection() {
  const titleElem = document.getElementById("extraTraitTitle");
  const descElem = document.getElementById("extraTraitDescription");
  const selectionElem = document.getElementById("extraTraitSelection");

  if (!extraSelections || extraSelections.length === 0) {
    console.warn("⚠️ Nessuna selezione extra disponibile.");
    return;
  }

  console.log(`📢 Mostrando selezione extra ${currentSelectionIndex + 1} di ${extraSelections.length}`);
  
  const currentSelection = extraSelections[currentSelectionIndex];

  titleElem.innerText = currentSelection.name;
  descElem.innerText = currentSelection.description;
  selectionElem.innerHTML = ""; // Pulisce il contenuto precedente

  if (currentSelection.selection) {
    const selectedValues = new Set(selectedData[currentSelection.name] || []);
    let dropdownHTML = "";

    for (let i = 0; i < currentSelection.count; i++) {
      dropdownHTML += `<select class="extra-selection" data-category="${currentSelection.name}" data-index="${i}">
                          <option value="">Seleziona...</option>`;
      currentSelection.selection.forEach(option => {
        const disabled = selectedValues.has(option) && !selectedData[currentSelection.name]?.includes(option);
        dropdownHTML += `<option value="${option}" ${disabled ? "disabled" : ""}>${option}</option>`;
      });
      dropdownHTML += `</select><br>`;
    }

    selectionElem.innerHTML = dropdownHTML;

    document.querySelectorAll(".extra-selection").forEach(select => {
      select.addEventListener("change", (event) => {
        const category = event.target.getAttribute("data-category");
        const index = event.target.getAttribute("data-index");
    
        if (!selectedData[category]) {
          selectedData[category] = [];
        }
    
        selectedData[category][index] = event.target.value;
    
        // 🔥 Rimuove elementi vuoti
        selectedData[category] = selectedData[category].filter(value => value);
    
        console.log(`📝 Salvato: ${category} -> ${selectedData[category]}`);
    
        updateExtraSelectionsView();
      });
    });
  }

  // ✅ Aggiorna i pulsanti "Precedente" e "Successivo"
  document.getElementById("prevTrait").disabled = (currentSelectionIndex === 0);
  document.getElementById("nextTrait").disabled = (currentSelectionIndex === extraSelections.length - 1);
  document.getElementById("closeModal").style.display = (currentSelectionIndex === extraSelections.length - 1) ? "inline-block" : "none";

  console.log(`🔄 Pulsanti aggiornati - Indice corrente: ${currentSelectionIndex}`);
}

document.getElementById("prevTrait").addEventListener("click", () => {
  if (currentSelectionIndex > 0) {
    currentSelectionIndex--;
    showExtraSelection();
  }
});

document.getElementById("nextTrait").addEventListener("click", () => {
  if (currentSelectionIndex < extraSelections.length - 1) {
    currentSelectionIndex++;
    showExtraSelection();
  }
});
