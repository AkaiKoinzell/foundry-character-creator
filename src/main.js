import {
  DATA,
  CharacterState,
  loadClasses,
  fetchJsonWithRetry,
  loadBackgrounds,
} from "./data.js";
import {
  loadStep2,
  rebuildFromClasses,
  refreshBaseState,
  isStepComplete as isStep2Complete,
  confirmStep as confirmStep2,
} from "./step2.js";
import {
  loadStep3,
  isStepComplete as isStep3Complete,
  confirmStep as confirmStep3,
} from "./step3.js";
import {
  loadStep4,
  isStepComplete as isStep4Complete,
  confirmStep as confirmStep4,
} from "./step4.js";
import { loadStep5, isStepComplete as isStep5Complete } from "./step5.js";
import { loadStep6, commitAbilities } from "./step6.js";
import { exportFoundryActor } from "./export.js";
import { t, initI18n, applyTranslations } from "./i18n.js";
import { exportPdf } from "./export-pdf.js";

let currentStep = 1;
let currentStepComplete = false;
const visitedSteps = new Set();
const completedSteps = new Set();

function updateNavButtons() {
  for (let i = 1; i <= 7; i++) {
    const btn = document.getElementById(`btnStep${i}`);
    if (!btn) continue;
    if (i === 1) {
      btn.disabled = false;
      continue;
    }
    const isVisited = visitedSteps.has(i);
    const prevCompleted = completedSteps.has(i - 1);
    btn.disabled = !(isVisited || prevCompleted);
  }
}

function setCurrentStepComplete(flag) {
  currentStepComplete = flag;
  const nextBtn = document.getElementById("nextStep");
  if (nextBtn) nextBtn.disabled = !flag || currentStep >= 7;
  if (flag) {
    completedSteps.add(currentStep);
  } else {
    completedSteps.delete(currentStep);
  }
  updateNavButtons();
}
globalThis.setCurrentStepComplete = setCurrentStepComplete;

function showStep(step) {
    visitedSteps.add(step);
    for (let i = 1; i <= 7; i++) {
      const el = document.getElementById(`step${i}`);
      if (!el) continue;
      if (i === step) {
        el.classList.remove('hidden');
        el.style.display = 'block';
      } else {
        el.classList.add('hidden');
        el.style.display = 'none';
      }
    }
    const bar = document.getElementById("progressBar");
    if (bar) {
      bar.style.width = `${((step - 1) / 6) * 100}%`;
    }
    currentStep = step;
    if (CharacterState.showHelp) {
      // Placeholder for contextual help integration
      console.log(`Help: display guidance for step ${step}`);
    }
    if (step === 4) loadStep4(true);
    if (step === 5) loadStep5(true);
    if (step === 6) loadStep6(true);
    if (step === 7) {
      commitAbilities();
      renderCharacterSheet();
    }

    const prevBtn = document.getElementById("prevStep");
    if (prevBtn) prevBtn.disabled = step <= 1;

    let stepComplete = true;
    if (step === 1) stepComplete = false;
    else if (step === 2) stepComplete = isStep2Complete();
    else if (step === 3) stepComplete = isStep3Complete();
    else if (step === 4) stepComplete = isStep4Complete();
    else if (step === 5) stepComplete = isStep5Complete();
    setCurrentStepComplete(stepComplete);
  }

async function loadData() {
  // Load class and background data
  await Promise.all([loadClasses(), loadBackgrounds()]);

  // Load languages separately
  const langJson = await fetchJsonWithRetry(
    "data/languages.json",
    "languages"
  );
  DATA.languages = langJson.languages;
}

// Render a high-level summary on the final step.
function renderCharacterSheet() {
  const container = document.getElementById("characterSheet");
  if (!container) return;

  const classes = CharacterState.classes.reduce((acc, c) => {
    if (c.name) acc[c.name] = c.level || 0;
    return acc;
  }, {});

  const SKILL_ABILITIES = {
    Acrobatics: "Dex",
    "Animal Handling": "Wis",
    Arcana: "Int",
    Athletics: "Str",
    Deception: "Cha",
    History: "Int",
    Insight: "Wis",
    Intimidation: "Cha",
    Investigation: "Int",
    Medicine: "Wis",
    Nature: "Int",
    Perception: "Wis",
    Performance: "Cha",
    Persuasion: "Cha",
    Religion: "Int",
    "Sleight of Hand": "Dex",
    Stealth: "Dex",
    Survival: "Wis",
  };

  const abilityScores = Object.entries(CharacterState.system.abilities || {}).reduce(
    (acc, [ab, obj]) => {
      acc[ab] = obj.value;
      return acc;
    },
    {}
  );
  const spellSet = new Set();
  Object.values(CharacterState.knownSpells || {}).forEach((byLevel) => {
    Object.values(byLevel).forEach((names) => {
      names.forEach((n) => spellSet.add(n));
    });
  });

  const skillList = Object.entries(SKILL_ABILITIES).map(([name, ability]) => {
    const sysSkills = CharacterState.system.skills || [];
    let prof = false;
    if (Array.isArray(sysSkills)) {
      prof = sysSkills.includes(name);
    } else if (sysSkills && typeof sysSkills === "object") {
      const entry = sysSkills[name];
      prof = Boolean(entry?.prof ?? entry?.proficient ?? entry?.value);
    }
    return { name, ability, prof };
  });

  const summary = {
    playerName: CharacterState.playerName,
    characterName: CharacterState.name,
    origin: CharacterState.system.details.origin,
    age: CharacterState.system.details.age,
    race: CharacterState.system.details.race,
    background: CharacterState.system.details.background,
    classes,
    totalLevel: Object.values(classes).reduce((a, b) => a + b, 0),
    languages: CharacterState.system.traits.languages?.value || [],
    tools: CharacterState.system.tools || [],
    equipment: (CharacterState.equipment || []).map((e) => e.name),
    features: (CharacterState.feats || []).map((f) => f.name),
    skills: skillList,
    abilities: abilityScores,
    spells: Array.from(spellSet),
  };
  const classText = (CharacterState.classes || [])
    .map((c) => `${c.name || ""} ${c.level || ""}`.trim())
    .filter(Boolean)
    .join(" / ");

  const details = CharacterState.system?.details || {};
  const systemAbilities = CharacterState.system?.abilities || {};
  const abilityBoxes = ["str", "dex", "con", "int", "wis", "cha"]
    .map((ab) => {
      const score = systemAbilities[ab]?.value ?? "";
      const mod = score === "" ? "" : Math.floor((score - 10) / 2);
      const modText = mod === "" ? "" : mod >= 0 ? `+${mod}` : `${mod}`;
      return `<div class="ability-box" data-ab="${ab.toUpperCase()}"><div class="score">${score}</div><div class="mod">${modText}</div></div>`;
    })
    .join("");

  const languagesHtml = summary.languages
    .map((l) => `<li>${l}</li>`)
    .join("");
  const toolsHtml = summary.tools.map((t) => `<li>${t}</li>`).join("");
  const featuresHtml = summary.features.map((f) => `<li>${f}</li>`).join("");
  const skillsHtml = summary.skills
    .map(
      ({ name, ability, prof }) =>
        `<li><input type="checkbox" disabled ${prof ? "checked" : ""}/> ${name} (${ability})</li>`
    )
    .join("");
  const equipmentHtml = summary.equipment
    .map((e) => `<li>${e}</li>`)
    .join("");
  const spellsHtml = summary.spells.map((s) => `<li>${s}</li>`).join("");

  container.innerHTML = `
    <div class="sheet-header">
      <h2>${CharacterState.name || ""}</h2>
      <p><strong>Player:</strong> ${CharacterState.playerName || ""}</p>
      <p><strong>Race:</strong> ${details.race || ""}</p>
      <p><strong>Background:</strong> ${details.background || ""}</p>
      <p><strong>Class:</strong> ${classText}</p>
    </div>
    <section class="abilities">
      <h3>Abilities</h3>
      <div class="ability-list">${abilityBoxes}</div>
    </section>
    <section class="skills">
      ${summary.skills.length ? `<h3>Skills</h3><ul>${skillsHtml}</ul>` : ""}
    </section>
    <section class="features">
      ${summary.features.length ? `<h3>Features</h3><ul>${featuresHtml}</ul>` : ""}
    </section>
    <section class="equipment">
      ${summary.equipment.length ? `<h3>Equipment</h3><ul>${equipmentHtml}</ul>` : ""}
    </section>
    <section class="tools-languages">
      ${summary.languages.length ? `<h3>Languages</h3><ul>${languagesHtml}</ul>` : ""}
      ${summary.tools.length ? `<h3>Tools</h3><ul>${toolsHtml}</ul>` : ""}
    </section>
    <section class="spells">
      ${summary.spells.length ? `<h3>Spells</h3><ul>${spellsHtml}</ul>` : ""}
    </section>
    <section class="backstory">
      <h3>Backstory</h3>
      <p>${details.origin || ""}</p>
    </section>
  `;
}

globalThis.renderCharacterSheet = renderCharacterSheet;

document.addEventListener("DOMContentLoaded", async () => {
  const createBtn = document.getElementById("createCharacterBtn");
  if (createBtn) {
    const beginnerCheck = document.getElementById("beginnerMode");
    createBtn.addEventListener("click", () => {
      const beginner = beginnerCheck?.checked ?? false;
      CharacterState.showHelp = beginner;
      try {
        localStorage.setItem("showHelp", beginner ? "1" : "0");
      } catch (e) {
        /* ignore */
      }
      window.location.href = "index.html";
    });
    document
      .getElementById("premadeCharactersBtn")
      ?.addEventListener("click", async () => {
        const mod = await import('./premade.js');
        mod.showPremadeSelector();
      });
    document
      .getElementById("randomCharacterBtn")
      ?.addEventListener("click", async () => {
        const mod = await import('./random.js');
        mod.generateRandomCharacter();
      });
    return;
  }

  CharacterState.showHelp = false;
  try {
    CharacterState.showHelp = localStorage.getItem("showHelp") === "1";
  } catch (e) {
    /* ignore */
  }

  let startAtStep7 = false;
  try {
    const stored = localStorage.getItem('characterState');
    if (stored) {
      const obj = JSON.parse(stored);
      Object.assign(CharacterState, obj);
      startAtStep7 = true;
      currentStep = 7;
      localStorage.removeItem('characterState');
    }
  } catch (e) {
    /* ignore */
  }

  await initI18n();
  applyTranslations();
  for (let i = 1; i <= 7; i++) {
    const btn = document.getElementById(`btnStep${i}`);
    if (btn) {
      btn.addEventListener("click", () => {
        showStep(i);
        if (i === 2) loadStep2(true);
        if (i === 3) loadStep3(true);
        if (i === 4) loadStep4(true);
        if (i === 5) loadStep5(true);
        if (i === 6) loadStep6(true);
      });
    }
  }

    const resetBtn = document.getElementById("resetButton");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => location.reload());
    }
    const confirmMap = { 2: confirmStep2, 3: confirmStep3, 4: confirmStep4 };
    const nextArrow = document.getElementById("nextStep");
    if (nextArrow) {
      nextArrow.addEventListener("click", async () => {
        if (nextArrow.disabled) return;
        try {
          const fn = confirmMap[currentStep];
          if (fn) {
            const ok = await fn();
            if (!ok) return;
          }
          showStep(currentStep + 1);
        } catch (err) {
          console.error(err);
        }
      });
    }

    const prevArrow = document.getElementById("prevStep");
    if (prevArrow) {
      prevArrow.addEventListener("click", () => {
        if (currentStep > 1) {
          showStep(currentStep - 1);
        }
      });
    }

    showStep(currentStep);

  loadData()
    .then(() => {
      // Ensure class list, races and backgrounds are rendered once data becomes available
      loadStep2();
      loadStep3();
      loadStep4();
      loadStep5();
      loadStep6();
      if (startAtStep7) showStep(7);
    })
    .catch((err) => console.error(err));

  document.getElementById("downloadJson")?.addEventListener("click", () => {
    const actor = exportFoundryActor(CharacterState);
    const blob = new Blob([JSON.stringify(actor, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${CharacterState.name || "character"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("generatePdf")?.addEventListener("click", () => {
    // Re-render to ensure all sections are present before exporting to PDF
    renderCharacterSheet();
    exportPdf(CharacterState).catch((err) => console.error(err));
  });

    // Step 1 inputs ----------------------------------------------------------
    const userNameEl = document.getElementById("userName");
    const characterNameEl = document.getElementById("characterName");
    const originEl = document.getElementById("origin");
    const ageEl = document.getElementById("age");

    function validateStep1() {
      const userNameValid = !!userNameEl?.value?.trim();
      const characterNameValid = !!characterNameEl?.value?.trim();
      const originValid = !!originEl?.value?.trim();
      const ageVal = ageEl?.value?.trim() ?? "";
      const ageValid = ageVal !== "" && !Number.isNaN(parseInt(ageVal, 10));
      const allValid =
        userNameValid && characterNameValid && originValid && ageValid;

      const step2Btn = document.getElementById("btnStep2");
      if (step2Btn) step2Btn.disabled = !allValid;
      setCurrentStepComplete(allValid);
    }

    if (userNameEl) {
      userNameEl.addEventListener("input", () => {
        CharacterState.playerName = userNameEl.value;
        validateStep1();
      });
    }

    if (characterNameEl) {
      characterNameEl.addEventListener("input", () => {
        CharacterState.name = characterNameEl.value;
        CharacterState.prototypeToken.name = characterNameEl.value;
        validateStep1();
      });
    }

    if (originEl) {
      originEl.addEventListener("input", () => {
        CharacterState.system.details.origin = originEl.value;
        validateStep1();
      });
    }

    if (ageEl) {
      const handler = () => {
        const v = parseInt(ageEl.value, 10);
        CharacterState.system.details.age = Number.isNaN(v) ? 0 : v;
        validateStep1();
      };
      ageEl.addEventListener("input", handler);
      ageEl.addEventListener("change", handler);
    }

    validateStep1();
});

export { showStep, loadData, setCurrentStepComplete };
