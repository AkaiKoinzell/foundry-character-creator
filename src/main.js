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
      renderFinalRecap();
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
function renderFinalRecap() {
  const container = document.getElementById("finalRecap");
  if (!container) return;
  container.innerHTML = "";

  const classes = CharacterState.classes.reduce((acc, c) => {
    if (c.name) acc[c.name] = c.level || 0;
    return acc;
  }, {});

  const abilities = Object.entries(CharacterState.system.abilities || {}).reduce(
    (acc, [ab, obj]) => {
      acc[ab] = obj.value;
      return acc;
    },
    {}
  );

  const summary = {
    race: CharacterState.system.details.race,
    background: CharacterState.system.details.background,
    classes,
    feats: (CharacterState.feats || []).map((f) => f.name),
    skills: CharacterState.system.skills || [],
    abilities,
  };

  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(summary, null, 2);
  container.appendChild(pre);
}

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
      ?.addEventListener("click", () => {
        console.log("Premade characters module not implemented yet.");
      });
    document
      .getElementById("randomCharacterBtn")
      ?.addEventListener("click", () => {
        console.log("Random character module not implemented yet.");
      });
    return;
  }

  CharacterState.showHelp = false;
  try {
    CharacterState.showHelp = localStorage.getItem("showHelp") === "1";
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
