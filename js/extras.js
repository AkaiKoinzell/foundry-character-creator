// ==================== GESTIONE EXTRA: LINGUE, SKILL, TOOL, ANCESTRY ====================

export function loadLanguages(callback) {
  fetch("data/languages.json")
    .then(response => response.json())
    .then(data => {
      if (data.languages) {
        callback(data.languages);
      } else {
        handleError("Nessuna lingua trovata nel file JSON.");
      }
    })
    .catch(error => handleError(`Errore caricando le lingue: ${error}`));
}

export function handleExtraLanguages(data, containerId) {
  if (data.languages && data.languages.choice > 0) {
    loadLanguages(langs => {
      const availableLangs = langs.filter(lang => !data.languages.fixed.includes(lang));
      const options = availableLangs.map(lang => `<option value="${lang}">${lang}</option>`).join("");
      const html = `<h4>Lingue Extra</h4>
                    <select id="extraLanguageDropdown">
                      <option value="">Seleziona...</option>
                      ${options}
                    </select>`;
      const container = document.getElementById(containerId);
      if (container) container.innerHTML = html;
    });
  } else {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = "";
  }
}

export function handleExtraSkills(data, containerId) {
  if (!data.skill_choices || !data.skill_choices.options?.length) return;

  const skillContainer = document.createElement("div");
  skillContainer.innerHTML = `<h4>Skill Extra</h4>`;
  
  const selectedSkills = new Set(); // Per evitare duplicati
  const numChoices = data.skill_choices.number || 1; // Default a 1 se non specificato

  function updateDropdowns() {
    document.querySelectorAll(".skillChoice").forEach(select => {
      const currentSelection = select.value;
      select.innerHTML = `<option value="">Seleziona...</option>`;

      data.skill_choices.options.forEach(skill => {
        if (!selectedSkills.has(skill) || skill === currentSelection) {
          const option = document.createElement("option");
          option.value = skill;
          option.textContent = skill;
          if (skill === currentSelection) option.selected = true;
          select.appendChild(option);
        }
      });
    });
  }

  for (let i = 0; i < numChoices; i++) {
    const select = document.createElement("select");
    select.classList.add("skillChoice");
    select.dataset.index = i;

    select.innerHTML = `<option value="">Seleziona...</option>`;
    data.skill_choices.options.forEach(skill => {
      const option = document.createElement("option");
      option.value = skill;
      option.textContent = skill;
      select.appendChild(option);
    });

    select.addEventListener("change", (event) => {
      const index = event.target.dataset.index;
      selectedSkills.delete([...selectedSkills][index]); // Rimuove la selezione precedente
      selectedSkills.add(event.target.value);
      updateDropdowns(); // Aggiorna i dropdown per escludere le scelte già fatte
    });

    skillContainer.appendChild(select);
  }

  const container = document.getElementById(containerId);
  if (container) container.innerHTML = "";
  container.appendChild(skillContainer);
}

export function handleExtraTools(data, containerId) {
  if (data.tool_choices) {
    const toolOptions = JSON.stringify(data.tool_choices.options);
    let html = `<h4>Tool Extra</h4>`;
    for (let i = 0; i < data.tool_choices.number; i++) {
      html += `<select class="toolChoice" id="toolChoice${i}" data-options='${toolOptions}'>
                  <option value="">Seleziona...</option>`;
      html += data.tool_choices.options.map(t => `<option value="${t}">${t}</option>`).join("");
      html += `</select>`;
    }
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = html;
  } else {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = "";
  }
}

export function handleExtraAncestry(data, containerId) {
  if (data.variant_feature_choices && data.variant_feature_choices.length > 0) {
    const ancestryOptions = data.variant_feature_choices.filter(opt => opt.name.toLowerCase().includes("ancestry"));
    if (ancestryOptions.length > 0) {
      let html = `<h4>Seleziona Ancestry</h4>
                  <select id="ancestrySelection">
                    <option value="">Seleziona...</option>`;
      ancestryOptions.forEach(opt => {
        html += `<option value="${opt.name}">${opt.name}</option>`;
      });
      html += `</select>`;
      const container = document.getElementById(containerId);
      if (container) container.innerHTML = html;
    }
  } else {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = "";
  }
}
