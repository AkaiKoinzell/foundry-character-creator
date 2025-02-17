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
  if (!data.skill_choices || data.skill_choices.options?.length === 0) return;

  const skillContainer = document.createElement("div");
  skillContainer.innerHTML = `<h4>Skill Extra</h4>`;

  const selectedSkills = new Set();

  function createSkillDropdown(index) {
    const select = document.createElement("select");
    select.classList.add("skillChoice");
    select.id = `skillChoice${index}`;
    
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Seleziona...";
    select.appendChild(defaultOption);
    
    data.skill_choices.options.forEach(skill => {
      const option = document.createElement("option");
      option.value = skill;
      option.textContent = skill;
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      selectedSkills.clear();
      document.querySelectorAll(".skillChoice").forEach(dropdown => {
        if (dropdown.value) selectedSkills.add(dropdown.value);
      });

      document.querySelectorAll(".skillChoice").forEach(dropdown => {
        dropdown.querySelectorAll("option").forEach(option => {
          if (selectedSkills.has(option.value) && dropdown.value !== option.value) {
            option.disabled = true;
          } else {
            option.disabled = false;
          }
        });
      });
    });

    return select;
  }

  for (let i = 0; i < data.skill_choices.number; i++) {
    skillContainer.appendChild(createSkillDropdown(i));
    skillContainer.appendChild(document.createElement("br"));
  }

  const container = document.getElementById(containerId);
  if (container) container.appendChild(skillContainer);
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
