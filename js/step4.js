// Step 4: Background selection and feat handling
import { loadDropdownData } from './common.js';
import {
  initFeatureSelectionHandlers,
  convertDetailsToAccordion,
  initializeAccordion,
  getTakenProficiencies,
} from './script.js';
import { ALL_TOOLS, ALL_LANGUAGES, ALL_SKILLS } from './data/proficiencies.js';
import { buildChoiceSelectors } from './selectionUtils.js';

let featPathIndex = {};
let currentFeatData = null;

function saveBackgroundData() {
  sessionStorage.setItem('backgroundData', JSON.stringify(window.backgroundData));
}

function renderSkillSummary(skills, container) {
  let summary = container.querySelector('.skill-summary');
  if (!skills || skills.length === 0) {
    if (summary) summary.remove();
    return;
  }
  if (!summary) {
    summary = document.createElement('p');
    summary.className = 'skill-summary';
    container.appendChild(summary);
  }
  summary.innerHTML = `<strong>Abilità:</strong> ${skills.join(', ')}`;
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

function renderDuplicateSelectors(type, detailsEl, baseList, allOptions) {
  const existing = detailsEl.querySelector(`.duplicate-${type}-choices`);
  if (existing) existing.remove();
  // Temporarily clear background proficiencies to evaluate conflicts
  window.backgroundData[type] = [];
  const { taken, conflicts } = getTakenProficiencies(type, baseList);
  // Restore original proficiencies for display
  window.backgroundData[type] = baseList.slice();
  saveBackgroundData();
  if (type === 'skills') renderSkillSummary(window.backgroundData[type], detailsEl);
  if (conflicts.length === 0) {
    detailsEl.classList.remove('needs-selection', 'incomplete');
    initFeatureSelectionHandlers(detailsEl.parentElement);
    return;
  }
  const base = baseList.filter(s => !conflicts.includes(s));
  let opts = allOptions.filter(o => !taken.has(o.toLowerCase()));
  if (opts.length === 0) {
    const baseLower = base.map(b => b.toLowerCase());
    opts = allOptions.filter(o => !baseLower.includes(o.toLowerCase()));
  }
  const dupDiv = document.createElement('div');
  dupDiv.className = `duplicate-${type}-choices`;
  const typeMap = {
    skills: { label: 'Abilità', choiceClass: 'duplicateSkillChoice' },
    tools: { label: 'Strumenti', choiceClass: 'duplicateToolChoice' },
    languages: { label: 'Linguaggi', choiceClass: 'duplicateLanguageChoice' },
  };
  const { label, choiceClass } = typeMap[type];
  const p = document.createElement('p');
  p.innerHTML = `<strong>${label} duplicate, scegli sostituti:</strong>`;
  dupDiv.appendChild(p);
  const update = () => {
    const chosen = Array.from(dupDiv.querySelectorAll(`.${choiceClass}`))
      .map(s => s.value)
      .filter(Boolean);
    window.backgroundData[type] = base.concat(chosen);
    saveBackgroundData();
    if (type === 'skills') renderSkillSummary(window.backgroundData.skills, detailsEl);
    if (chosen.length === conflicts.length) {
      renderDuplicateSelectors(type, detailsEl, window.backgroundData[type], allOptions);
      return;
    }
    detailsEl.classList.toggle('incomplete', chosen.length < conflicts.length);
  };
  buildChoiceSelectors(dupDiv, conflicts.length, opts, choiceClass, update);
  detailsEl.appendChild(dupDiv);
  detailsEl.classList.add('needs-selection', 'incomplete');
  initFeatureSelectionHandlers(detailsEl.parentElement);
}

document.addEventListener("DOMContentLoaded", async () => {
  const step = document.getElementById("step4");
  if (!step) return;

  const stored = sessionStorage.getItem('backgroundData');
  window.backgroundData = stored
    ? JSON.parse(stored)
    : { name: "", skills: [], tools: [], languages: [], feat: "" };
  const backgroundData = window.backgroundData;

  saveBackgroundData();

  loadDropdownData("data/backgrounds.json", "backgroundSelect");
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
      saveBackgroundData();

      const skillDiv = document.getElementById("backgroundSkills");
      skillDiv.innerHTML = "";
      const skillDetails = document.createElement("details");
      skillDetails.className = "feature-block";
      skillDetails.innerHTML = "<summary>Abilità</summary>";
      backgroundData.skills = Array.isArray(data.skills) ? data.skills.slice() : [];
      if (data.skillChoices) {
        const num = data.skillChoices.choose || 0;
        const taken = getTakenProficiencies('skills');
        let opts = (data.skillChoices.options || []).filter(o => !taken.has(o.toLowerCase()));
        let note = '';
        if (opts.length === 0) {
          opts = ALL_SKILLS.filter(o => !taken.has(o.toLowerCase()));
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
              renderDuplicateSelectors('skills', skillDetails, backgroundData.skills, ALL_SKILLS);
              renderSkillSummary(backgroundData.skills, skillDetails);
            }
          );
        }
        skillDiv.appendChild(skillDetails);
        renderDuplicateSelectors('skills', skillDetails, backgroundData.skills, ALL_SKILLS);
        renderSkillSummary(backgroundData.skills, skillDetails);
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
          renderDuplicateSelectors('tools', toolDetails, backgroundData.tools, ALL_TOOLS);
        };
      const takenTools = getTakenProficiencies('tools');
      if (data.tools && data.tools.choose) {
        const num = data.tools.choose;
        let opts = (data.tools.options || []).filter(o => !takenTools.has(o.toLowerCase()));
        let note = '';
        if (opts.length === 0) {
          opts = ALL_TOOLS.filter(o => !takenTools.has(o.toLowerCase()));
          note = ' (tutti gli strumenti disponibili)';
        }
        const p = document.createElement("p");
        p.innerHTML = `<strong>Scegli ${num} strumento${note}:</strong>`;
        toolDetails.appendChild(p);
        buildChoiceSelectors(toolDetails, num, opts, "backgroundToolChoice", toolChangeHandler);
      }
      if (data.toolChoices) {
        const num = data.toolChoices.choose || 0;
        let opts = (data.toolChoices.options || []).filter(o => !takenTools.has(o.toLowerCase()));
        let note = '';
        if (opts.length === 0) {
          opts = ALL_TOOLS.filter(o => !takenTools.has(o.toLowerCase()));
          note = ' (tutti gli strumenti disponibili)';
        }
        const p = document.createElement("p");
        p.innerHTML = `<strong>Scegli ${num} strumento${note}:</strong>`;
        toolDetails.appendChild(p);
        buildChoiceSelectors(toolDetails, num, opts, "backgroundToolChoice", toolChangeHandler);
      }
        toolDiv.appendChild(toolDetails);
        renderDuplicateSelectors('tools', toolDetails, backgroundData.tools, ALL_TOOLS);
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
          renderDuplicateSelectors('languages', langDetails, backgroundData.languages, ALL_LANGUAGES);
          makeAccordion(langDiv);
        } else if (data.languages && data.languages.choose) {
        const num = data.languages.choose;
        const buildSelectors = opts => {
          const takenLangs = getTakenProficiencies('languages');
          let filtered = (opts || []).filter(o => !takenLangs.has(o.toLowerCase()));
          let note = '';
          if (filtered.length === 0) {
            filtered = ALL_LANGUAGES.filter(o => !takenLangs.has(o.toLowerCase()));
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
                renderDuplicateSelectors('languages', langDetails, backgroundData.languages, ALL_LANGUAGES);
              }
            );
            langDiv.appendChild(langDetails);
            renderDuplicateSelectors('languages', langDetails, backgroundData.languages, ALL_LANGUAGES);
            makeAccordion(langDiv);
          };
        if (data.languages.any) {
          buildSelectors(ALL_LANGUAGES);
        } else {
          buildSelectors(data.languages.options || []);
        }
        } else {
          langDiv.appendChild(langDetails);
          renderDuplicateSelectors('languages', langDetails, backgroundData.languages, ALL_LANGUAGES);
          makeAccordion(langDiv);
        }

      const featDiv = document.getElementById("backgroundFeat");
      featDiv.innerHTML = "";
      backgroundData.feat = "";
      currentFeatData = null;
      saveBackgroundData();
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
          saveBackgroundData();
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
      saveBackgroundData();
    } catch (err) {
      handleError(`Errore caricando il background: ${err}`);
    }
  });
});

