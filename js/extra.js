// extra.js
// ========================================================
// EXTRA FUNCTIONS
// Questo file gestisce l'iniezione del markup per:
// - Lingue extra
// - Skill extra
// - Tool extra
// - Variant Ancestry (se presenti)
// Le funzioni utilizzano i dati della razza (output di convertRaceData)
// per costruire il markup e inserirlo nei container specificati.
// ========================================================

console.log("✅ extra.js loaded!");

/**
 * handleExtraLanguages
 * Inietta nel container (specificato da containerId) il markup per la selezione di lingue extra,
 * se la razza prevede la scelta di lingue extra (data.languages.choice > 0).
 *
 * @param {Object} data - I dati della razza.
 * @param {string} containerId - L'ID del container dove iniettare il markup.
 */
function handleExtraLanguages(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container with ID "${containerId}" not found for languages.`);
    return;
  }
  if (data.languages && data.languages.choice > 0) {
    loadLanguages(langs => {
      // Filtra le lingue già conosciute
      const availableLangs = langs.filter(lang => !data.languages.fixed.includes(lang));
      const options = availableLangs.map(lang => `<option value="${lang}">${lang}</option>`).join("");
      const html = `<h4>Lingue Extra</h4>
                    <select id="extraLanguageSelect">
                      <option value="">Seleziona...</option>
                      ${options}
                    </select>`;
      container.innerHTML = html;
      console.log("✅ Lingue extra iniettate:", html);
    });
  } else {
    container.innerHTML = "";
    console.log("ℹ️ Nessuna lingua extra richiesta.");
  }
}

/**
 * handleExtraSkills
 * Inietta nel container (specificato da containerId) il markup per la selezione di skill extra,
 * utilizzando i dati in data.skill_choices.
 *
 * @param {Object} data - I dati della razza.
 * @param {string} containerId - L'ID del container dove iniettare il markup.
 */
function handleExtraSkills(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container with ID "${containerId}" not found for skills.`);
    return;
  }
  if (data.skill_choices) {
    // Convertiamo le opzioni in stringa JSON per l'attributo data-options
    const skillOptions = JSON.stringify(data.skill_choices.options);
    let html = `<h4>Skill Extra</h4>`;
    for (let i = 0; i < data.skill_choices.number; i++) {
      html += `<select class="skillChoice" id="skillChoice${i}" data-options='${skillOptions}' onchange="updateSkillOptions()">
                  <option value="">Seleziona...</option>`;
      html += data.skill_choices.options.map(s => `<option value="${s}">${s}</option>`).join("");
      html += `</select>`;
    }
    container.innerHTML = html;
    console.log("✅ Skill extra iniettate:", html);
  } else {
    container.innerHTML = "";
    console.log("ℹ️ Nessuna skill extra richiesta.");
  }
}

/**
 * handleExtraTools
 * Inietta nel container (specificato da containerId) il markup per la selezione di tool extra,
 * se i dati della razza contengono tool_choices.
 *
 * @param {Object} data - I dati della razza.
 * @param {string} containerId - L'ID del container dove iniettare il markup.
 */
function handleExtraTools(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container with ID "${containerId}" not found for tools.`);
    return;
  }
  if (data.tool_choices) {
    const toolOptions = JSON.stringify(data.tool_choices.options);
    let html = `<h4>Tool Extra</h4>`;
    for (let i = 0; i < data.tool_choices.number; i++) {
      html += `<select class="toolChoice" id="toolChoice${i}" data-options='${toolOptions}'>
                  <option value="">Seleziona...</option>`;
      html += data.tool_choices.options.map(t => `<option value="${t}">${t}</option>`).join("");
      html += `</select>`;
    }
    container.innerHTML = html;
    console.log("✅ Tool extra iniettati:", html);
  } else {
    container.innerHTML = "";
    console.log("ℹ️ Nessun tool extra richiesto.");
  }
}

/**
 * handleExtraAncestry
 * Inietta nel container (specificato da containerId) il markup per la selezione di ancestry,
 * basato sui variant_feature_choices che contengono "ancestry" nel nome.
 *
 * @param {Object} data - I dati della razza.
 * @param {string} containerId - L'ID del container dove iniettare il markup.
 */
function handleExtraAncestry(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container with ID "${containerId}" not found for ancestry.`);
    return;
  }
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
      container.innerHTML = html;
      console.log("✅ Ancestry extra iniettati:", html);
    } else {
      container.innerHTML = "";
      console.log("ℹ️ Nessun ancestry extra trovato.");
    }
  } else {
    container.innerHTML = "";
    console.log("ℹ️ Nessun variant feature choices per ancestry.");
  }
}

// Esponi le funzioni per l'uso globale
window.handleExtraLanguages = handleExtraLanguages;
window.handleExtraSkills = handleExtraSkills;
window.handleExtraTools = handleExtraTools;
window.handleExtraAncestry = handleExtraAncestry;
