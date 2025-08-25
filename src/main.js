import {
  DATA,
  CharacterState,
  loadClasses,
  fetchJsonWithRetry,
  logCharacterState,
  adjustResource,
  updateSpellSlots,
} from "./data.js";
import { loadStep2, rebuildFromClasses, refreshBaseState } from "./step2.js";
import { loadStep3 } from "./step3.js";
import { exportFoundryActor } from "./export.js";
import { t, initI18n } from "./i18n.js";
import { addUniqueProficiency } from "./proficiency.js";

let currentStep = 1;

function showStep(step) {
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
  if (step === 7) renderFinalRecap();
}

async function loadData() {
  // Load each class file referenced in data/classes.json
  await loadClasses();

  // Retain existing logic for other data types
  const sources = {
    backgrounds: "data/backgrounds.json",
    languages: "data/languages.json",
  };

  for (const [key, path] of Object.entries(sources)) {
    const json = await fetchJsonWithRetry(path, key);
    DATA[key] = json.items || json.languages;
  }
}

function populateSelect(id, dataKey) {
  const sel = document.getElementById(id);
  const entries = DATA[dataKey];
  if (!sel || !entries) return;
  for (const [name, value] of Object.entries(entries)) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = name;
    sel.appendChild(opt);
  }
}

function populateBackgroundList() {
  populateSelect("backgroundSelect", "backgrounds");
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

// --- Step 4: Background selection handlers ---
let currentBackgroundData = null;
function handleBackgroundChange() {
  const sel = document.getElementById("backgroundSelect");
  const skillsDiv = document.getElementById("backgroundSkills");
  const toolsDiv = document.getElementById("backgroundTools");
  const langDiv = document.getElementById("backgroundLanguages");
  if (!sel || !sel.value) return;
  fetch(sel.value)
    .then((r) => r.json())
    .then((data) => {
      currentBackgroundData = data;
      skillsDiv.innerHTML = "";
      toolsDiv.innerHTML = "";
      langDiv.innerHTML = "";
      if (data.skills && data.skills.length) {
        const p = document.createElement("p");
        p.textContent = `${t("skills")}: ${data.skills.join(", ")}`;
        skillsDiv.appendChild(p);
      }
      if (data.tools && data.tools.length) {
        const p = document.createElement("p");
        p.textContent = `${t("tools")}: ${data.tools.join(", ")}`;
        toolsDiv.appendChild(p);
      }
      if (data.languages) {
        if (Array.isArray(data.languages) && data.languages.length) {
          const p = document.createElement("p");
          p.textContent = `${t("languages")}: ${data.languages.join(", ")}`;
          langDiv.appendChild(p);
        } else if (data.languages.choose) {
          for (let i = 0; i < data.languages.choose; i++) {
            const selLang = document.createElement("select");
            selLang.innerHTML = `<option value=''>${t("selectLanguage")}</option>`;
            (DATA.languages || []).forEach((l) => {
              const o = document.createElement("option");
              o.value = l;
              o.textContent = l;
              selLang.appendChild(o);
            });
            langDiv.appendChild(selLang);
          }
        }
      }
    });
}

function confirmBackgroundSelection() {
  if (!currentBackgroundData) return;
  const skillsDiv = document.getElementById("backgroundSkills");
  const toolsDiv = document.getElementById("backgroundTools");
  const langDiv = document.getElementById("backgroundLanguages");
  CharacterState.system.details.background = currentBackgroundData.name;
  if (currentBackgroundData.skills) {
    currentBackgroundData.skills.forEach((s) =>
      addUniqueProficiency("skills", s, skillsDiv)
    );
  }
  if (currentBackgroundData.tools) {
    currentBackgroundData.tools.forEach((t) =>
      addUniqueProficiency("tools", t, toolsDiv)
    );
  }
  if (currentBackgroundData.languages) {
    if (Array.isArray(currentBackgroundData.languages)) {
      currentBackgroundData.languages.forEach((l) =>
        addUniqueProficiency("languages", l, langDiv)
      );
    } else if (currentBackgroundData.languages.choose) {
      const selects = langDiv.querySelectorAll("select");
      selects.forEach((s) =>
        addUniqueProficiency("languages", s.value, langDiv)
      );
    }
  }
  refreshBaseState();
  rebuildFromClasses();
  showStep(5);
  logCharacterState();
}

document.addEventListener("DOMContentLoaded", async () => {
  await initI18n();
  for (let i = 1; i <= 7; i++) {
    const btn = document.getElementById(`btnStep${i}`);
    if (btn) {
      btn.addEventListener("click", () => {
        showStep(i);
        if (i === 2) loadStep2(true);
        if (i === 3) loadStep3(true);
      });
    }
  }

  const resetBtn = document.getElementById("resetButton");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => location.reload());
  }

  showStep(currentStep);

  loadData()
    .then(() => {
      populateBackgroundList();
      // Ensure class list and races are rendered once data becomes available
      loadStep2();
      loadStep3();
      const bgSel = document.getElementById("backgroundSelect");
      bgSel?.addEventListener("change", handleBackgroundChange);
    })
    .catch((err) => console.error(err));

  document
    .getElementById("confirmBackgroundSelection")
    ?.addEventListener("click", confirmBackgroundSelection);

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
});

export { showStep, loadData };
