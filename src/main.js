let currentStep = 1;

// Global character data storing all user selections
const characterData = {
  name: "",
  level: 1,
  class: null,
  race: null,
  background: null,
  skills: [],
  tools: [],
  languages: [],
  equipment: [],
  attributes: {
    str: 8,
    dex: 8,
    con: 8,
    int: 8,
    wis: 8,
    cha: 8,
  },
};

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
  "Musical Instrument",
];

function showStep(step) {
  for (let i = 1; i <= 7; i++) {
    const el = document.getElementById(`step${i}`);
    if (el) {
      el.style.display = i === step ? "block" : "none";
    }
  }
  const bar = document.getElementById("progressBar");
  if (bar) {
    bar.style.width = `${((step - 1) / 6) * 100}%`;
  }
  currentStep = step;
}

const DATA = {};

async function loadData() {
  const sources = {
    classes: "data/classes.json",
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

function populateClassList() {
  populateSelect("classSelect", "classes");
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

function addUniqueProficiency(type, value, container) {
  if (!value) return;
  const list = characterData[type];
  if (!list.includes(value)) {
    list.push(value);
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
    }
  });
  label.appendChild(sel);
  msg.appendChild(label);
  container.appendChild(msg);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Step 2: Class selection handlers ---
let currentClassData = null;
function handleClassChange() {
  const sel = document.getElementById("classSelect");
  const container = document.getElementById("classFeatures");
  if (!sel || !sel.value) return;
  fetch(sel.value)
    .then((r) => r.json())
    .then((data) => {
      currentClassData = data;
      container.innerHTML = "";
      if (data.skill_proficiencies) {
        const skillDiv = document.createElement("div");
        skillDiv.innerHTML = `<p>Scegli ${data.skill_proficiencies.choose} competenze:</p>`;
        data.skill_proficiencies.options.forEach((opt) => {
          const lbl = document.createElement("label");
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.value = opt;
          lbl.appendChild(cb);
          lbl.append(` ${opt}`);
          skillDiv.appendChild(lbl);
        });
        container.appendChild(skillDiv);
      }
      if (data.tool_proficiencies) {
        const tools = Array.isArray(data.tool_proficiencies)
          ? data.tool_proficiencies
          : [];
        if (tools.length) {
          const toolDiv = document.createElement("div");
          toolDiv.innerHTML = `<p>Strumenti: ${tools.join(", ")}</p>`;
          container.appendChild(toolDiv);
        }
      }
    });
}

function confirmClassSelection() {
  if (!currentClassData) return;
  const levelSel = document.getElementById("levelSelect");
  const container = document.getElementById("classFeatures");
  const checkboxes = container.querySelectorAll("input[type=checkbox]");
  const chosen = Array.from(checkboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
  if (
    currentClassData.skill_proficiencies &&
    chosen.length !== currentClassData.skill_proficiencies.choose
  ) {
    alert(
      `Seleziona ${currentClassData.skill_proficiencies.choose} competenze di classe`
    );
    return;
  }
  characterData.level = parseInt(levelSel.value, 10);
  characterData.class = currentClassData.name;
  chosen.forEach((skill) =>
    addUniqueProficiency("skills", skill, container)
  );
  if (Array.isArray(currentClassData.tool_proficiencies)) {
    currentClassData.tool_proficiencies.forEach((tool) =>
      addUniqueProficiency("tools", tool, container)
    );
  }
  const btn3 = document.getElementById("btnStep3");
  if (btn3) btn3.disabled = false;
  showStep(3);
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
  characterData.race = currentRaceData.name;
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
  characterData.background = currentBackgroundData.name;
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
}

document.addEventListener("DOMContentLoaded", () => {
  for (let i = 1; i <= 7; i++) {
    const btn = document.getElementById(`btnStep${i}`);
    if (btn) {
      btn.addEventListener("click", () => showStep(i));
    }
  }

  const resetBtn = document.getElementById("resetButton");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => location.reload());
  }

  showStep(currentStep);

  loadData()
    .then(() => {
      populateClassList();
      populateRaceList();
      populateBackgroundList();
      const classSel = document.getElementById("classSelect");
      classSel?.addEventListener("change", handleClassChange);
      const raceSel = document.getElementById("raceSelect");
      raceSel?.addEventListener("change", handleRaceChange);
      const bgSel = document.getElementById("backgroundSelect");
      bgSel?.addEventListener("change", handleBackgroundChange);
    })
    .catch((err) => console.error(err));

  document
    .getElementById("confirmClassSelection")
    ?.addEventListener("click", confirmClassSelection);
  document
    .getElementById("confirmRaceSelection")
    ?.addEventListener("click", confirmRaceSelection);
  document
    .getElementById("confirmBackgroundSelection")
    ?.addEventListener("click", confirmBackgroundSelection);
});

export { showStep, loadData };
