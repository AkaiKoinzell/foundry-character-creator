// updateSubclasses.js
// ========================================================
// MODULO: updateSubclasses.js
// Questo modulo gestisce l'aggiornamento del dropdown delle
// sottoclassi in base alla classe selezionata dall'utente.
// La funzione principale, updateSubclasses(), viene esposta
// globalmente per essere richiamata quando l'utente cambia
// la selezione della classe.
// ========================================================

console.log("✅ updateSubclasses.js loaded!");

/**
 * updateSubclasses
 * Recupera il percorso del file JSON della classe selezionata, carica
 * i dati e popola il dropdown delle sottoclassi (con id "subclassSelect").
 * Se non sono presenti sottoclassi, il dropdown viene nascosto.
 */
function updateSubclasses() {
  // Recupera il percorso (URL) del file JSON della classe dal dropdown "classSelect"
  const classPath = document.getElementById("classSelect").value;
  const subclassSelect = document.getElementById("subclassSelect");

  // Se non è stata selezionata alcuna classe, resetta il dropdown delle sottoclassi
  if (!classPath) {
    subclassSelect.innerHTML = `<option value="">Nessuna sottoclasse disponibile</option>`;
    subclassSelect.style.display = "none";
    return;
  }

  // Effettua la fetch dei dati JSON della classe
  fetch(classPath)
    .then(response => response.json())
    .then(data => {
      console.log("📜 Dati della classe caricati:", data);
      // Inizializza il dropdown delle sottoclassi con un'opzione predefinita
      subclassSelect.innerHTML = `<option value="">Seleziona una sottoclasse</option>`;
      // Popola il dropdown con le sottoclassi ottenute
      data.subclasses.forEach(subclass => {
        const option = document.createElement("option");
        option.value = subclass.name;
        option.textContent = subclass.name;
        subclassSelect.appendChild(option);
      });
      // Mostra il dropdown se sono presenti sottoclassi, altrimenti lo nasconde
      subclassSelect.style.display = data.subclasses.length > 0 ? "block" : "none";
    })
    .catch(error => {
      console.error(`❌ Errore caricando le sottoclasse: ${error}`);
      alert(`⚠️ Errore caricando le sottoclasse: ${error}`);
    });
}

// Espone la funzione globalmente, così può essere richiamata da altri moduli o dall'HTML
window.updateSubclasses = updateSubclasses;
