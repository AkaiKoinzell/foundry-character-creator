import { DATA, CharacterState, loadClasses, logCharacterState } from "./data.js";
import { loadStep2 } from "./step2.js";

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
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(`Failed loading ${key}`);
    }
    const json = await res.json();
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
  label.textContent = `Hai già ${value}. Scegli un'altra ${type.slice(0, -1)}:`;
  const sel = document.createElement("select");
  sel.innerHTML = "<option value=''>Seleziona</option>";
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
          p.textContent = `Competenze: ${raceSkills.join(", ")}`;
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
          p.textContent = `Lingue: ${raceLang.join(", ")}`;
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
        p.textContent = `Competenze: ${data.skills.join(", ")}`;
        skillsDiv.appendChild(p);
      }
      if (data.tools && data.tools.length) {
        const p = document.createElement("p");
        p.textContent = `Strumenti: ${data.tools.join(", ")}`;
        toolsDiv.appendChild(p);
      }
      if (data.languages) {
        if (Array.isArray(data.languages) && data.languages.length) {
          const p = document.createElement("p");
          p.textContent = `Lingue: ${data.languages.join(", ")}`;
          langDiv.appendChild(p);
        } else if (data.languages.choose) {
          for (let i = 0; i < data.languages.choose; i++) {
            const selLang = document.createElement("select");
            selLang.innerHTML = "<option value=''>Seleziona lingua</option>";
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

document.addEventListener("DOMContentLoaded", () => {
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
});

export { showStep, loadData };
