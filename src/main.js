import {
  DATA,
  CharacterState,
  loadClasses,
  fetchJsonWithRetry,
  logCharacterState,
  adjustResource,
  updateSpellSlots,
  loadBackgrounds,
} from "./data.js";
import {
  loadStep2,
  rebuildFromClasses,
  refreshBaseState,
  isStepComplete as isStep2Complete,
} from "./step2.js";
import { loadStep3, isStepComplete as isStep3Complete } from "./step3.js";
import { loadStep4, isStepComplete as isStep4Complete } from "./step4.js";
import { loadStep5, isStepComplete as isStep5Complete } from "./step5.js";
import { loadStep6 } from "./step6.js";
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
  if (!flag) {
    document
      .querySelectorAll(".needs-selection")
      .forEach((el) => el.classList.add("incomplete"));
  } else {
    document
      .querySelectorAll(".needs-selection.incomplete")
      .forEach((el) => el.classList.remove("incomplete"));
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
    if (step === 5) loadStep5(true);
    if (step === 6) loadStep6(true);
    if (step === 7) renderFinalRecap();

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

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Render a summary of resources and spell slots on the final step. Users can
// tweak resource values directly from here using the helper functions in
// data.js.
function renderFinalRecap() {
  const container = document.getElementById("finalRecap");
  if (!container) return;
  updateSpellSlots();
  container.innerHTML = "";

  // Resources ---------------------------------------------------------------
  const resSection = document.createElement("div");
  const resTitle = document.createElement("h3");
  resTitle.textContent = t("resources");
  resSection.appendChild(resTitle);
  ["primary", "secondary", "tertiary"].forEach((key) => {
    const res = CharacterState.system.resources[key];
    const row = document.createElement("div");

    const labelInput = document.createElement("input");
    labelInput.placeholder = t("label");
    labelInput.value = res.label || "";
    labelInput.addEventListener("input", () => {
      res.label = labelInput.value;
    });
    row.appendChild(labelInput);

    const dec = document.createElement("button");
    dec.textContent = "-";
    dec.addEventListener("click", () => {
      adjustResource(key, -1);
      renderFinalRecap();
    });
    row.appendChild(dec);

    const span = document.createElement("span");
    span.textContent = `${res.value}/${res.max}`;
    span.style.margin = "0 4px";
    row.appendChild(span);

    const inc = document.createElement("button");
    inc.textContent = "+";
    inc.addEventListener("click", () => {
      adjustResource(key, 1);
      renderFinalRecap();
    });
    row.appendChild(inc);

    const maxInput = document.createElement("input");
    maxInput.type = "number";
    maxInput.value = res.max;
    maxInput.style.width = "4em";
    maxInput.addEventListener("change", () => {
      res.max = parseInt(maxInput.value, 10) || 0;
      if (res.value > res.max) res.value = res.max;
      renderFinalRecap();
    });
    row.appendChild(maxInput);

    const srLabel = document.createElement("label");
    const sr = document.createElement("input");
    sr.type = "checkbox";
    sr.checked = !!res.sr;
    sr.addEventListener("change", () => {
      res.sr = sr.checked;
    });
    srLabel.appendChild(sr);
    srLabel.appendChild(document.createTextNode(" SR"));
    row.appendChild(srLabel);

    const lrLabel = document.createElement("label");
    const lr = document.createElement("input");
    lr.type = "checkbox";
    lr.checked = !!res.lr;
    lr.addEventListener("change", () => {
      res.lr = lr.checked;
    });
    lrLabel.appendChild(lr);
    lrLabel.appendChild(document.createTextNode(" LR"));
    row.appendChild(lrLabel);

    resSection.appendChild(row);
  });
  container.appendChild(resSection);

  // Spell slots ------------------------------------------------------------
  const spellSection = document.createElement("div");
  const spellTitle = document.createElement("h3");
  spellTitle.textContent = t("spellSlots");
  spellSection.appendChild(spellTitle);
  for (let i = 1; i <= 9; i++) {
    const slot = CharacterState.system.spells[`spell${i}`];
    const row = document.createElement("div");
    const dec = document.createElement("button");
    dec.textContent = "-";
    dec.addEventListener("click", () => {
      if (slot.value > 0) slot.value--;
      renderFinalRecap();
    });
    row.appendChild(dec);
    const span = document.createElement("span");
    span.textContent = t("levelEntry", {
      level: i,
      value: slot.value,
      max: slot.max,
    });
    span.style.margin = "0 4px";
    row.appendChild(span);
    const inc = document.createElement("button");
    inc.textContent = "+";
    inc.addEventListener("click", () => {
      if (slot.value < slot.max) slot.value++;
      renderFinalRecap();
    });
    row.appendChild(inc);
    spellSection.appendChild(row);
  }
  const pact = CharacterState.system.spells.pact;
  const pactRow = document.createElement("div");
  const pactDec = document.createElement("button");
  pactDec.textContent = "-";
  pactDec.addEventListener("click", () => {
    if (pact.value > 0) pact.value--;
    renderFinalRecap();
  });
  pactRow.appendChild(pactDec);
  const pactSpan = document.createElement("span");
  pactSpan.textContent = t("pactEntry", {
    value: pact.value,
    max: pact.max,
    level: pact.level,
  });
  pactSpan.style.margin = "0 4px";
  pactRow.appendChild(pactSpan);
  const pactInc = document.createElement("button");
  pactInc.textContent = "+";
  pactInc.addEventListener("click", () => {
    if (pact.value < pact.max) pact.value++;
    renderFinalRecap();
  });
  pactRow.appendChild(pactInc);
  spellSection.appendChild(pactRow);

  container.appendChild(spellSection);
}

document.addEventListener("DOMContentLoaded", async () => {
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
    const nextArrow = document.getElementById("nextStep");
    if (nextArrow) {
      nextArrow.addEventListener("click", () => {
        if (!nextArrow.disabled) {
          showStep(currentStep + 1);
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
