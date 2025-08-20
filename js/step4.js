// Step 4: Background selection and feat handling
import { loadDropdownData, loadLanguages } from './common.js';
import {
  initFeatureSelectionHandlers,
  convertDetailsToAccordion,
  initializeAccordion,
  getTakenProficiencies,
  availableLanguages,
  ALL_TOOLS,
} from './script.js';
import { ALL_SKILLS } from './raceData.js';

let featPathIndex = {};
let currentFeatData = null;

function buildChoiceSelectors(container, count, options, className, changeHandler) {
  const selects = [];
  for (let i = 0; i < count; i++) {
    const sel = document.createElement('select');
    sel.className = className;
    sel.dataset.options = JSON.stringify(options);
    container.appendChild(sel);
    selects.push(sel);
  }

  const update = () => {
    const chosen = new Set(selects.map(s => s.value).filter(Boolean));
    selects.forEach(sel => {
      const opts = JSON.parse(sel.dataset.options);
      const current = sel.value;
      sel.innerHTML = `<option value="">Seleziona</option>` +
        opts.map(o => `<option value="${o}" ${chosen.has(o) && o !== current ? 'disabled' : ''}>${o}</option>`).join('');
      sel.value = current;
    });
    if (changeHandler) changeHandler();
  };

  selects.forEach(sel => sel.addEventListener('change', update));
  update();
}

function makeAccordion(div) {
  convertDetailsToAccordion(div);
  div.classList.add('accordion');
  initializeAccordion(div);
}

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

document.addEventListener("DOMContentLoaded", async () => {
  const step = document.getElementById("step4");
  if (!step) return;

  window.backgroundData = { name: "", skills: [], tools: [], languages: [], feat: "" };

  loadDropdownData("data/backgrounds.json", "backgroundSelect", "backgrounds");
  try {
    const resp = await fetch("data/feats.json");
    if (!resp.ok) throw new Error('Failed to load feats');
    const d = await resp.json();
    featPathIndex = d.feats || {};
  } catch (err) {
    console.error("Errore caricando i talenti:", err);
  }

  document.getElementById("backgroundSelect").addEventListener("change", async e => {
    const val = e.target.value;
    if (!val) return;
    try {
      const res = await fetch(val);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      backgroundData.name = data.name;

      const skillDiv = document.getElementById("backgroundSkills");
      skillDiv.innerHTML = "";
      const skillDetails = document.createElement("details");
      skillDetails.className = "feature-block";
      skillDetails.innerHTML = "<summary>Abilità</summary>";
      backgroundData.skills = Array.isArray(data.skills) ? data.skills.slice() : [];

      const renderDuplicateSkillSelectors = () => {
        const existing = skillDetails.querySelector('.duplicate-skill-choices');
        if (existing) existing.remove();
        const taken = new Set(getTakenProficiencies('skills'));
        const duplicates = backgroundData.skills.filter(s => taken.has(s));
        if (duplicates.length === 0) {
          skillDetails.classList.remove('needs-selection', 'incomplete');
          initFeatureSelectionHandlers(skillDiv);
          return;
        }
        const base = backgroundData.skills.filter(s => !taken.has(s));
        const opts = ALL_SKILLS.filter(o => !taken.has(o) && !base.includes(o));
        const dupDiv = document.createElement('div');
        dupDiv.className = 'duplicate-skill-choices';
        const p = document.createElement('p');
        p.innerHTML = '<strong>Abilità duplicate, scegli sostituti:</strong>';
        dupDiv.appendChild(p);
        const update = () => {
          const chosen = Array.from(dupDiv.querySelectorAll('.duplicateSkillChoice'))
            .map(s => s.value)
            .filter(Boolean);
          backgroundData.skills = base.concat(chosen);
          skillDetails.classList.toggle('incomplete', chosen.length < duplicates.length);
        };
        buildChoiceSelectors(dupDiv, duplicates.length, opts, 'duplicateSkillChoice', update);
        skillDetails.appendChild(dupDiv);
        skillDetails.classList.add('needs-selection', 'incomplete');
        initFeatureSelectionHandlers(skillDiv);
      };

      if (backgroundData.skills.length > 0) {
        const p = document.createElement("p");
        p.innerHTML = `<strong>Abilità:</strong> ${backgroundData.skills.join(", ")}`;
        skillDetails.appendChild(p);
      }
      if (data.skillChoices) {
        const num = data.skillChoices.choose || 0;
        const taken = new Set(getTakenProficiencies('skills'));
        let opts = (data.skillChoices.options || []).filter(o => !taken.has(o));
        let note = '';
        if (opts.length === 0) {
          opts = ALL_SKILLS.filter(o => !taken.has(o));
          note = ' (tutte le abilità disponibili)';
        }
        const p = document.createElement("p");
        p.innerHTML = `<strong>Scegli ${num} abilità${note}:</strong>`;
        skillDetails.appendChild(p);
        buildChoiceSelectors(
          skillDetails,
          num,
          opts,
          "backgroundSkillChoice",
          () => {
            const chosen = Array.from(document.querySelectorAll(".backgroundSkillChoice"))
              .map(s => s.value)
              .filter(Boolean);
            backgroundData.skills = (data.skills || []).concat(chosen);
            renderDuplicateSkillSelectors();
          }
        );
      }
        skillDiv.appendChild(skillDetails);
        renderDuplicateSkillSelectors();
        makeAccordion(skillDiv);

      const toolDiv = document.getElementById("backgroundTools");
      toolDiv.innerHTML = "";
      const toolDetails = document.createElement("details");
      toolDetails.className = "feature-block";
      toolDetails.innerHTML = "<summary>Strumenti</summary>";
      backgroundData.tools = Array.isArray(data.tools) ? data.tools.slice() : [];
      if (Array.isArray(data.tools) && data.tools.length > 0) {
        const p = document.createElement("p");
        p.innerHTML = `<strong>Strumenti:</strong> ${data.tools.join(", ")}`;
        toolDetails.appendChild(p);
      }
      const toolChangeHandler = () => {
        const chosen = Array.from(document.querySelectorAll(".backgroundToolChoice"))
          .map(s => s.value)
          .filter(Boolean);
        const base = Array.isArray(data.tools) ? data.tools.slice() : [];
        backgroundData.tools = base.concat(chosen);
      };
      const takenTools = new Set(getTakenProficiencies('tools'));
      if (data.tools && data.tools.choose) {
        const num = data.tools.choose;
        let opts = (data.tools.options || []).filter(o => !takenTools.has(o));
        let note = '';
        if (opts.length === 0) {
          opts = ALL_TOOLS.filter(o => !takenTools.has(o));
          note = ' (tutti gli strumenti disponibili)';
        }
        const p = document.createElement("p");
        p.innerHTML = `<strong>Scegli ${num} strumento${note}:</strong>`;
        toolDetails.appendChild(p);
        buildChoiceSelectors(toolDetails, num, opts, "backgroundToolChoice", toolChangeHandler);
      }
      if (data.toolChoices) {
        const num = data.toolChoices.choose || 0;
        let opts = (data.toolChoices.options || []).filter(o => !takenTools.has(o));
        let note = '';
        if (opts.length === 0) {
          opts = ALL_TOOLS.filter(o => !takenTools.has(o));
          note = ' (tutti gli strumenti disponibili)';
        }
        const p = document.createElement("p");
        p.innerHTML = `<strong>Scegli ${num} strumento${note}:</strong>`;
        toolDetails.appendChild(p);
        buildChoiceSelectors(toolDetails, num, opts, "backgroundToolChoice", toolChangeHandler);
      }
      toolDiv.appendChild(toolDetails);
      initFeatureSelectionHandlers(toolDiv);
      makeAccordion(toolDiv);

      const langDiv = document.getElementById("backgroundLanguages");
      langDiv.innerHTML = "";
      const langDetails = document.createElement("details");
      langDetails.className = "feature-block";
      langDetails.innerHTML = "<summary>Linguaggi</summary>";
      backgroundData.languages = Array.isArray(data.languages) ? data.languages.slice() : [];
      if (Array.isArray(data.languages) && data.languages.length > 0) {
        const p = document.createElement("p");
        p.innerHTML = `<strong>Linguaggi:</strong> ${data.languages.join(", ")}`;
        langDetails.appendChild(p);
        langDiv.appendChild(langDetails);
        initFeatureSelectionHandlers(langDiv);
        makeAccordion(langDiv);
      } else if (data.languages && data.languages.choose) {
        const num = data.languages.choose;
        const buildSelectors = opts => {
          const takenLangs = new Set(getTakenProficiencies('languages'));
          let filtered = (opts || []).filter(o => !takenLangs.has(o));
          let note = '';
          if (filtered.length === 0) {
            filtered = availableLanguages.filter(o => !takenLangs.has(o));
            note = ' (tutte le lingue disponibili)';
          }
          const p = document.createElement("p");
          p.innerHTML = `<strong>Scegli ${num} linguaggi${note}:</strong>`;
          langDetails.appendChild(p);
          buildChoiceSelectors(
            langDetails,
            num,
            filtered,
            "backgroundLanguageChoice",
            () => {
              const chosen = Array.from(
                document.querySelectorAll(".backgroundLanguageChoice")
              )
                .map(s => s.value)
                .filter(Boolean);
              backgroundData.languages = chosen;
            }
          );
          langDiv.appendChild(langDetails);
          initFeatureSelectionHandlers(langDiv);
          makeAccordion(langDiv);
        };
        if (data.languages.any) {
          loadLanguages(buildSelectors);
        } else {
          buildSelectors(data.languages.options || []);
        }
      } else {
        langDiv.appendChild(langDetails);
        initFeatureSelectionHandlers(langDiv);
        makeAccordion(langDiv);
      }

      const featDiv = document.getElementById("backgroundFeat");
      featDiv.innerHTML = "";
      backgroundData.feat = "";
      currentFeatData = null;
      const featDetails = document.createElement("details");
      featDetails.className = "feature-block";
      featDetails.innerHTML = "<summary>Talento</summary>";
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
        select.addEventListener("change", async () => {
          currentFeatData = null;
          abilDiv.innerHTML = "";
          backgroundData.feat = select.value || "";
          resetBackgroundTalentFields();
          if (!select.value || !featPathIndex[select.value]) {
            updateFinalScores();
            return;
          }
          try {
            const resp = await fetch(featPathIndex[select.value]);
            if (!resp.ok) throw new Error('Failed to load feat');
            const feat = await resp.json();
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
          } catch (err) {
            console.error("Errore caricando il talento:", err);
          }
        });
        featDetails.appendChild(label);
        featDetails.appendChild(select);
        featDetails.appendChild(abilDiv);
      }
      featDiv.appendChild(featDetails);
      initFeatureSelectionHandlers(featDiv);
      makeAccordion(featDiv);
    } catch (err) {
      handleError(`Errore caricando il background: ${err}`);
    }
  });
});

