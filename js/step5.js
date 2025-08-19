// Step 5: Background selection and feat handling

let featPathIndex = {};
let currentFeatData = null;

function resetBackgroundTalentFields() {
  ["str", "dex", "con", "int", "wis", "cha"].forEach(ab => {
    const el = document.getElementById(ab + "BackgroundTalent");
    if (el) el.value = 0;
  });
}

function applyFeatAbilityChoices() {
  resetBackgroundTalentFields();
  if (currentFeatData && currentFeatData.fixedAbilities) {
    currentFeatData.fixedAbilities.forEach(obj => {
      const ability = Object.keys(obj)[0];
      const val = obj[ability];
      const el = document.getElementById(ability + "BackgroundTalent");
      if (el) el.value = val;
    });
  }
  const selects = document.querySelectorAll(".featAbilityChoice");
  selects.forEach(sel => {
    if (sel.value) {
      const amt = parseInt(sel.dataset.amount || "1");
      const el = document.getElementById(sel.value + "BackgroundTalent");
      if (el) el.value = amt;
    }
  });
  updateFinalScores();
}

document.addEventListener("DOMContentLoaded", () => {
  const step = document.getElementById("step5");
  if (!step) return;

  window.backgroundData = { name: "", skills: [], tools: [], languages: [], feat: "" };

  loadDropdownData("data/backgrounds.json", "backgroundSelect", "backgrounds");
  fetch("data/feats.json").then(r => r.json()).then(d => { featPathIndex = d.feats || {}; });

  document.getElementById("backgroundSelect").addEventListener("change", async e => {
    const val = e.target.value;
    if (!val) return;
    const res = await fetch(val);
    const data = await res.json();
    backgroundData.name = data.name;

    const skillDiv = document.getElementById("backgroundSkills");
    skillDiv.innerHTML = "";
    backgroundData.skills = Array.isArray(data.skills) ? data.skills.slice() : [];
    if (backgroundData.skills.length > 0) {
      skillDiv.innerHTML = `<p><strong>Abilità:</strong> ${backgroundData.skills.join(", ")}</p>`;
    }
    if (data.skillChoices) {
      const num = data.skillChoices.choose || 0;
      const opts = data.skillChoices.options || [];
      skillDiv.innerHTML += `<p><strong>Scegli ${num} abilità:</strong></p>`;
      for (let i = 0; i < num; i++) {
        const sel = document.createElement("select");
        sel.className = "backgroundSkillChoice";
        sel.innerHTML = `<option value="">Seleziona</option>` + opts.map(o => `<option value="${o}">${o}</option>`).join("");
        sel.addEventListener("change", () => {
          const chosen = Array.from(document.querySelectorAll(".backgroundSkillChoice")).map(s => s.value).filter(Boolean);
          backgroundData.skills = (data.skills || []).concat(chosen);
        });
        skillDiv.appendChild(sel);
      }
    }

    const toolDiv = document.getElementById("backgroundTools");
    toolDiv.innerHTML = "";
    backgroundData.tools = Array.isArray(data.tools) ? data.tools.slice() : [];
    if (Array.isArray(data.tools) && data.tools.length > 0) {
      toolDiv.innerHTML = `<p><strong>Strumenti:</strong> ${data.tools.join(", ")}</p>`;
    }
    if (data.tools && data.tools.choose) {
      const num = data.tools.choose;
      const opts = data.tools.options || [];
      toolDiv.innerHTML += `<p><strong>Scegli ${num} strumento:</strong></p>`;
      for (let i = 0; i < num; i++) {
        const sel = document.createElement("select");
        sel.className = "backgroundToolChoice";
        sel.innerHTML = `<option value="">Seleziona</option>` + opts.map(o => `<option value="${o}">${o}</option>`).join("");
        sel.addEventListener("change", () => {
          const chosen = Array.from(document.querySelectorAll(".backgroundToolChoice")).map(s => s.value).filter(Boolean);
          backgroundData.tools = chosen;
        });
        toolDiv.appendChild(sel);
      }
    }
    if (data.toolChoices) {
      const num = data.toolChoices.choose || 0;
      const opts = data.toolChoices.options || [];
      toolDiv.innerHTML += `<p><strong>Scegli ${num} strumento:</strong></p>`;
      for (let i = 0; i < num; i++) {
        const sel = document.createElement("select");
        sel.className = "backgroundToolChoice";
        sel.innerHTML = `<option value="">Seleziona</option>` + opts.map(o => `<option value="${o}">${o}</option>`).join("");
        sel.addEventListener("change", () => {
          const chosen = Array.from(document.querySelectorAll(".backgroundToolChoice")).map(s => s.value).filter(Boolean);
          const base = Array.isArray(data.tools) ? data.tools.slice() : [];
          backgroundData.tools = base.concat(chosen);
        });
        toolDiv.appendChild(sel);
      }
    }

    const langDiv = document.getElementById("backgroundLanguages");
    langDiv.innerHTML = "";
    backgroundData.languages = Array.isArray(data.languages) ? data.languages.slice() : [];
    if (Array.isArray(data.languages) && data.languages.length > 0) {
      langDiv.innerHTML = `<p><strong>Linguaggi:</strong> ${data.languages.join(", ")}</p>`;
    } else if (data.languages && data.languages.choose) {
      const num = data.languages.choose;
      const opts = data.languages.options || [];
      langDiv.innerHTML = `<p><strong>Scegli ${num} linguaggi:</strong></p>`;
      for (let i = 0; i < num; i++) {
        const sel = document.createElement("select");
        sel.className = "backgroundLanguageChoice";
        sel.innerHTML = `<option value="">Seleziona</option>` + opts.map(o => `<option value="${o}">${o}</option>`).join("");
        sel.addEventListener("change", () => {
          const chosen = Array.from(document.querySelectorAll(".backgroundLanguageChoice")).map(s => s.value).filter(Boolean);
          backgroundData.languages = chosen;
        });
        langDiv.appendChild(sel);
      }
    }

    const featDiv = document.getElementById("backgroundFeat");
    featDiv.innerHTML = "";
    backgroundData.feat = "";
    currentFeatData = null;
    if (Array.isArray(data.featOptions) && data.featOptions.length > 0) {
      const label = document.createElement("label");
      label.htmlFor = "backgroundFeatSelect";
      label.textContent = "Feat:";
      const select = document.createElement("select");
      select.id = "backgroundFeatSelect";
      select.innerHTML = `<option value="">Seleziona un talento</option>` +
        data.featOptions
          .map(name => `<option value="${name}">${name}</option>`)
          .join("");
      const abilDiv = document.createElement("div");
      abilDiv.id = "featAbilityChoices";
      select.addEventListener("change", () => {
        currentFeatData = null;
        abilDiv.innerHTML = "";
        backgroundData.feat = select.value || "";
        resetBackgroundTalentFields();
        if (!select.value || !featPathIndex[select.value]) {
          updateFinalScores();
          return;
        }
        fetch(featPathIndex[select.value])
          .then(r => r.json())
          .then(feat => {
            const fixed = [];
            if (feat.ability) {
              feat.ability.forEach(ab => {
                if (ab.choose) {
                  const sel = document.createElement("select");
                  sel.className = "featAbilityChoice";
                  sel.dataset.amount = ab.choose.amount || 1;
                  sel.innerHTML = `<option value="">Seleziona caratteristica</option>` +
                    ab.choose.from.map(a => `<option value="${a}">${a.toUpperCase()}</option>`).join("");
                  sel.addEventListener("change", applyFeatAbilityChoices);
                  abilDiv.appendChild(sel);
                } else {
                  fixed.push(ab);
                }
              });
            }
            currentFeatData = { fixedAbilities: fixed };
            applyFeatAbilityChoices();
          });
      });
      featDiv.appendChild(label);
      featDiv.appendChild(select);
      featDiv.appendChild(abilDiv);
    }
  });
});

