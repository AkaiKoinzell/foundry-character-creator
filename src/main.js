import {
  DATA,
  CharacterState,
  loadClasses,
  fetchJsonWithRetry,
  logCharacterState,
  adjustResource,
  updateSpellSlots,
} from "./data.js";
import { loadStep2 } from "./step2.js";
import { exportFoundryActor } from "./export.js";
import { t, initI18n } from "./i18n.js";

let currentStep = 1;

// full list of skills for replacement handling
const ALL_SKILLS = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival",
];

// basic tool list used when replacing duplicates
const ALL_TOOLS = [
  "Alchemist's Supplies",
  "Brewer's Supplies",
  "Calligrapher's Supplies",
  "Carpenter's Tools",
  "Cartographer's Tools",
  "Cobbler's Tools",
  "Cook's Utensils",
  "Glassblower's Tools",
  "Jeweler's Tools",
  "Leatherworker's Tools",
  "Mason's Tools",
  "Painter's Supplies",
  "Potter's Tools",
  "Smith's Tools",
  "Tinker's Tools",
  "Weaver's Tools",
  "Woodcarver's Tools",
  "Disguise Kit",
  "Forgery Kit",
  "Herbalism Kit",
  "Navigator's Tools",
  "Poisoner's Kit",
  "Thieves' Tools",
];

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
    races: "data/races.json",
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

function populateRaceList() {
  populateSelect("raceSelect", "races");
}

function populateBackgroundList() {
  populateSelect("backgroundSelect", "backgrounds");
}

function getAllOptions(type) {
  if (type === "skills") return ALL_SKILLS;
  if (type === "tools") return ALL_TOOLS;
  if (type === "languages") return DATA.languages || [];
  return [];
}

function getProficiencyList(type) {
  if (type === "skills") return CharacterState.system.skills;
  if (type === "tools") return CharacterState.system.tools;
  if (type === "languages")
    return CharacterState.system.traits.languages.value;
  if (type === "cantrips") return CharacterState.system.spells.cantrips;
  return [];
}

function addUniqueProficiency(type, value, container) {
  if (!value) return;
  const list = getProficiencyList(type);
  if (!list.includes(value)) {
    list.push(value);
    logCharacterState();
    return;
  }
  // handle duplicate with replacement
  const msg = document.createElement("div");
  const label = document.createElement("label");
  label.textContent = t("duplicateProficiency", {
    value,
    type: t(type.slice(0, -1)),
  });
  const sel = document.createElement("select");
  sel.innerHTML = `<option value=''>${t("select")}</option>`;
  getAllOptions(type)
    .filter((opt) => !list.includes(opt))
    .forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    });
  sel.addEventListener("change", () => {
    if (sel.value && !list.includes(sel.value)) {
      list.push(sel.value);
      sel.disabled = true;
      logCharacterState();
    }
  });
  label.appendChild(sel);
  msg.appendChild(label);
  container.appendChild(msg);
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

// --- Step 3: Race selection handlers ---
let currentRaceData = null;
function handleRaceChange() {
  const sel = document.getElementById("raceSelect");
  const container = document.getElementById("raceTraits");
  if (!sel || !sel.value) return;
  fetch(sel.value)
    .then((r) => r.json())
    .then((data) => {
      currentRaceData = data;
      container.innerHTML = "";
      if (data.entries) {
        const ul = document.createElement("ul");
        data.entries.forEach((e) => {
          if (e.name) {
            const li = document.createElement("li");
            li.textContent = e.name;
            ul.appendChild(li);
          }
        });
        container.appendChild(ul);
      }
      if (data.skillProficiencies) {
        const raceSkills = [];
        data.skillProficiencies.forEach((obj) => {
          for (const k in obj) if (obj[k]) raceSkills.push(capitalize(k));
        });
        if (raceSkills.length) {
          const p = document.createElement("p");
          p.textContent = `${t("skills")}: ${raceSkills.join(", ")}`;
          container.appendChild(p);
        }
      }
      if (data.languageProficiencies) {
        const raceLang = [];
        data.languageProficiencies.forEach((obj) => {
          for (const k in obj) if (obj[k]) raceLang.push(capitalize(k));
        });
        if (raceLang.length) {
          const p = document.createElement("p");
          p.textContent = `${t("languages")}: ${raceLang.join(", ")}`;
          container.appendChild(p);
        }
      }
    });
}

function confirmRaceSelection() {
  if (!currentRaceData) return;
  const container = document.getElementById("raceTraits");
  CharacterState.system.details.race = currentRaceData.name;
  if (currentRaceData.skillProficiencies) {
    currentRaceData.skillProficiencies.forEach((obj) => {
      for (const k in obj)
        if (obj[k])
          addUniqueProficiency("skills", capitalize(k), container);
    });
  }
  if (currentRaceData.languageProficiencies) {
    currentRaceData.languageProficiencies.forEach((obj) => {
      for (const k in obj)
        if (obj[k])
          addUniqueProficiency("languages", capitalize(k), container);
    });
  }
  const btn4 = document.getElementById("btnStep4");
  if (btn4) btn4.disabled = false;
  showStep(4);
  logCharacterState();
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
        if (i === 2) loadStep2();
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
      populateRaceList();
      populateBackgroundList();
      // Ensure class list is rendered once data becomes available
      loadStep2();
      const raceSel = document.getElementById("raceSelect");
      raceSel?.addEventListener("change", handleRaceChange);
      const bgSel = document.getElementById("backgroundSelect");
      bgSel?.addEventListener("change", handleBackgroundChange);
    })
    .catch((err) => console.error(err));

  document
    .getElementById("confirmRaceSelection")
    ?.addEventListener("click", confirmRaceSelection);
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
