import {
  DATA,
  CharacterState,
  loadClasses,
  fetchJsonWithRetry,
  loadBackgrounds,
  loadFeats,
  loadRaces,
  loadSpells,
  loadEquipment,
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
import {
  loadStep5,
  isStepComplete as isStep5Complete,
  resetEquipmentDataCache,
} from "./step5.js";
import { loadStep6, commitAbilities } from "./step6.js";
import { exportFoundryActor, exportFoundryActorV13 } from "./export.js";
import { t, initI18n, applyTranslations } from "./i18n.js";
import { exportPdf } from "./export-pdf.js";
import { onCustomDataUpdated } from "./custom-data.js";
import { initCustomDataManager } from "./custom-data-ui.js";
import { showToast } from "./ui-helpers.js";

const TOTAL_STEPS = 7;
const LAST_STEP = TOTAL_STEPS;

let currentStep = 1;
let currentStepComplete = false;
const visitedSteps = new Set();
const completedSteps = new Set();
const invalidatedSteps = new Set();

let customDataReloadPromise = null;

async function refreshCustomDataCaches() {
  try {
    resetEquipmentDataCache();
    DATA.classes = [];
    DATA.backgrounds = {};
    DATA.races = {};
    DATA.spells = [];
    DATA.feats = [];
    DATA.equipment = undefined;
    DATA.featDetails = {};

    await Promise.all([
      loadClasses(true),
      loadBackgrounds(true),
      loadRaces(true),
      loadFeats(true),
      loadSpells(true),
      loadEquipment(true),
    ]);

    if (currentStep === 2) await loadStep2(false, true);
    if (currentStep === 3) await loadStep3(true);
    if (currentStep === 4) await loadStep4(true);
    if (currentStep === 5) await loadStep5(true);
    if (currentStep === TOTAL_STEPS - 1) loadStep6(true);

    showToast(t('customDataReloaded'));
    showErrorBanner('');
  } catch (err) {
    console.error('Failed to refresh custom data', err);
    showErrorBanner(t('customDataReloadFailed'));
  }
}

function scheduleCustomDataReload() {
  if (customDataReloadPromise) return customDataReloadPromise;
  customDataReloadPromise = refreshCustomDataCaches().finally(() => {
    customDataReloadPromise = null;
  });
  return customDataReloadPromise;
}

function invalidateStep(stepNumber) {
  invalidatedSteps.add(stepNumber);
  const containers = {
    3: ["raceList", "raceFeatures", "raceTraits"],
    4: [
      "backgroundList",
      "backgroundSkills",
      "backgroundTools",
      "backgroundLanguages",
      "backgroundFeat",
      "backgroundFeatures",
    ],
    5: ["equipmentSelections"],
  };
  const ids = containers[stepNumber] || [];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });
}

function invalidateStepsFrom(stepNumber) {
  for (let i = stepNumber; i <= TOTAL_STEPS; i++) {
    visitedSteps.delete(i);
    completedSteps.delete(i);
  }
  updateNavButtons();
}

function updateNavButtons() {
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const btn = document.getElementById(`btnStep${i}`);
    if (!btn) continue;
    if (i === 1) {
      btn.disabled = false;
      continue;
    }
    const prevInvalid = invalidatedSteps.has(i - 1);
    const isVisited = visitedSteps.has(i);
    const prevCompleted = completedSteps.has(i - 1);
    btn.disabled = prevInvalid || !(isVisited || prevCompleted);
  }
}

function setCurrentStepComplete(flag) {
  currentStepComplete = flag;
  const nextBtn = document.getElementById("nextStep");
  if (nextBtn) nextBtn.disabled = !flag || currentStep >= LAST_STEP;
  if (flag) {
    completedSteps.add(currentStep);
  } else {
    completedSteps.delete(currentStep);
  }
  updateNavButtons();
}

function showErrorBanner(message) {
  let banner = document.getElementById('errorBanner');
  if (!message) {
    if (banner) banner.remove();
    return;
  }
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'errorBanner';
    banner.className = 'error-banner';
    const stepNav = document.getElementById('stepNav');
    if (stepNav) stepNav.insertAdjacentElement('beforebegin', banner);
    else document.body.prepend(banner);
  }
  banner.textContent = message;
  banner.classList.remove('hidden');
}

onCustomDataUpdated(() => {
  scheduleCustomDataReload();
});

function showStep(step) {
    const firstVisit = !visitedSteps.has(step);
    const force = invalidatedSteps.has(step);
    visitedSteps.add(step);
    invalidatedSteps.delete(step);
    for (let i = 1; i <= TOTAL_STEPS; i++) {
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
      bar.style.width = `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`;
    }
    currentStep = step;

    // Ensure the active step button is visible in the horizontal scroller on mobile
    const activeStepBtn = document.getElementById(`btnStep${step}`);
    try {
      activeStepBtn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } catch (_) { /* no-op */ }
    if (CharacterState.showHelp) {
      // Placeholder for contextual help integration
      console.log(`Help: display guidance for step ${step}`);
    }
    if (step === 2) loadStep2(firstVisit || force);
    if (step === 3) loadStep3(firstVisit || force);
    if (step === 4) loadStep4(firstVisit || force);
    if (step === 5) loadStep5(firstVisit || force);
    if (step === TOTAL_STEPS - 1) loadStep6(firstVisit || force);
    if (step === LAST_STEP) {
      commitAbilities();
      CharacterState.playerName =
        document.getElementById("userName")?.value || CharacterState.playerName;
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
  const languageSources = CharacterState.proficiencySources?.languages || {};
  const toolSources = CharacterState.proficiencySources?.tools || {};
  const spells = (() => {
    const map = new Map();
    Object.entries(CharacterState.knownSpells || {}).forEach(
      ([clsName, byLevel]) => {
        Object.values(byLevel).forEach((names) =>
          names.forEach((n) => map.set(n, `Class: ${clsName}`))
        );
      }
    );
    (CharacterState.system.spells?.cantrips || []).forEach((s) => {
      if (!map.has(s)) map.set(s, "Class");
    });
    (CharacterState.raceChoices?.spells || []).forEach((s) =>
      map.set(s, "Race")
    );
    (CharacterState.feats || []).forEach((f) => {
      const sp = f.spells || f.system?.spells;
      if (sp) {
        Object.values(sp).forEach((v) => {
          if (Array.isArray(v))
            v.forEach((n) => map.set(n, `Feat: ${f.name}`));
          else if (typeof v === "string") map.set(v, `Feat: ${f.name}`);
        });
      }
    });
    return Array.from(map.entries()).map(
      ([name, source]) => `${name} (${source})`
    );
  })();

  const skillList = Object.entries(SKILL_ABILITIES).map(([name, ability]) => {
    const sysSkills = CharacterState.system.skills || [];
    const expertise = CharacterState.system.expertise || [];
    let prof = false;
    if (Array.isArray(sysSkills)) {
      prof = sysSkills.includes(name);
    } else if (sysSkills && typeof sysSkills === "object") {
      const entry = sysSkills[name];
      prof = Boolean(entry?.prof ?? entry?.proficient ?? entry?.value);
    }
    const expert = Array.isArray(expertise) && expertise.includes(name);
    return { name, ability, prof, expert };
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
    languages: (CharacterState.system.traits.languages?.value || []).map(
      (l) => (languageSources[l] ? `${l} (${languageSources[l]})` : l)
    ),
    tools: (CharacterState.system.tools || []).map((t) =>
      toolSources[t] ? `${t} (${toolSources[t]})` : t
    ),
    equipment: (CharacterState.equipment || []).map((e) => e.name),
    infusions: (CharacterState.infusions || []).map((i) =>
      typeof i === 'string' ? { name: i, description: '' } : i
    ),
    features: (() => {
      const classFeatures = (CharacterState.classes || []).flatMap(
        (c) =>
          c.features?.map((f) => `${f.name} (Class: ${c.name})`) || []
      );
      const raceFeatures = (CharacterState.raceFeatures || []).map(
        (f) => `${f} (Race)`
      );
      const featNames = (CharacterState.feats || []).map(
        (f) => `${f.name} (Feat)`
      );
      return Array.from(
        new Set([...classFeatures, ...raceFeatures, ...featNames])
      );
    })(),
    skills: skillList,
    abilities: abilityScores,
    spells,
  };
  const classText = (CharacterState.classes || [])
    .map((c) => `${c.name || ""} ${c.level || ""}`.trim())
    .filter(Boolean)
    .join(" / ");

  const details = CharacterState.system?.details || {};
  const systemAbilities = CharacterState.system?.abilities || {};
  const abilityBoxes = ["str", "dex", "con", "int", "wis", "cha"].map(
    (ab) => {
      const score = systemAbilities[ab]?.value ?? "";
      const mod = score === "" ? "" : Math.floor((score - 10) / 2);
      const modText = mod === "" ? "" : mod >= 0 ? `+${mod}` : `${mod}`;
      const label = ab.toUpperCase();
      const box = document.createElement("div");
      box.className = "ability-box";
      box.dataset.ab = label;
      const lab = document.createElement("div");
      lab.className = "label";
      lab.textContent = label;
      const scoreDiv = document.createElement("div");
      scoreDiv.className = "score";
      scoreDiv.textContent = score;
      const modDiv = document.createElement("div");
      modDiv.className = "mod";
      modDiv.textContent = modText;
      box.append(lab, scoreDiv, modDiv);
      return box;
    }
  );

  container.textContent = "";

  const header = document.createElement("header");
  header.className = "char-header";
  const addHeaderRow = (label, value) => {
    const div = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = label;
    div.append(strong, ` ${value || ""}`);
    header.appendChild(div);
  };
  addHeaderRow("Character:", summary.characterName || "");
  addHeaderRow("Player:", summary.playerName || "");
  addHeaderRow("Class & Level:", classText);
  addHeaderRow("Race:", details.race || "");
  addHeaderRow("Background:", details.background || "");
  addHeaderRow("Provenienza:", details.origin || "");
  addHeaderRow("Age:", details.age || "");
  container.appendChild(header);

  const abilitiesSection = document.createElement("section");
  abilitiesSection.className = "abilities";
  abilitiesSection.appendChild(document.createElement("h3")).textContent =
    "Abilities";
  const abilityList = document.createElement("div");
  abilityList.className = "ability-list";
  abilityList.append(...abilityBoxes);
  abilitiesSection.appendChild(abilityList);
  container.appendChild(abilitiesSection);

  const skillsSection = document.createElement("section");
  skillsSection.className = "skills";
  if (summary.skills.length) {
    skillsSection.appendChild(document.createElement("h3")).textContent =
      "Skills";
    const ul = document.createElement("ul");
    summary.skills.forEach(({ name, ability, prof, expert }) => {
      const li = document.createElement("li");
      const profBox = document.createElement("input");
      profBox.type = "checkbox";
      profBox.disabled = true;
      profBox.checked = prof || expert;
      const expertBox = document.createElement("input");
      expertBox.type = "checkbox";
      expertBox.disabled = true;
      expertBox.checked = expert;
      li.append(
        profBox,
        expertBox,
        document.createTextNode(` ${name} (${ability})`)
      );
      ul.appendChild(li);
    });
    skillsSection.appendChild(ul);
  }
  container.appendChild(skillsSection);

  const featuresSection = document.createElement("section");
  featuresSection.className = "features";
  featuresSection.appendChild(document.createElement("h3")).textContent =
    "Features";
  const featuresList = document.createElement("ul");
  summary.features.forEach(
    (f) =>
      (featuresList.appendChild(document.createElement("li")).textContent = f)
  );
  featuresSection.appendChild(featuresList);
  container.appendChild(featuresSection);

  const infusionsSection = document.createElement("section");
  infusionsSection.className = "infusions";
  const hasInfusions = summary.infusions.length > 0;
  if (hasInfusions) {
    infusionsSection.appendChild(document.createElement("h3")).textContent =
      "Infusions";
    const infList = document.createElement("ul");
    summary.infusions.forEach((i) => {
      const li = document.createElement("li");
      const strong = document.createElement("strong");
      strong.textContent = i.name;
      li.appendChild(strong);
      if (i.description) li.append(`: ${i.description}`);
      infList.appendChild(li);
    });
    infusionsSection.appendChild(infList);
    container.appendChild(infusionsSection);
  }

  const equipmentSection = document.createElement("section");
  equipmentSection.className = "equipment";
  const hasEquipment = summary.equipment.length > 0;
  if (hasEquipment) {
    equipmentSection.appendChild(document.createElement("h3")).textContent =
      "Equipment";
    const equipmentList = document.createElement("ul");
    summary.equipment.forEach(
      (e) =>
        (equipmentList.appendChild(document.createElement("li")).textContent = e)
    );
    equipmentSection.appendChild(equipmentList);
    container.appendChild(equipmentSection);
  }

  const tlSection = document.createElement("section");
  tlSection.className = "tools-languages";
  const hasLanguages = summary.languages.length > 0;
  const hasTools = summary.tools.length > 0;
  if (hasLanguages) {
    tlSection.appendChild(document.createElement("h3")).textContent =
      "Languages";
    const langList = document.createElement("ul");
    summary.languages.forEach(
      (l) => (langList.appendChild(document.createElement("li")).textContent = l)
    );
    tlSection.appendChild(langList);
  }
  if (hasTools) {
    tlSection.appendChild(document.createElement("h3")).textContent = "Tools";
    const toolsList = document.createElement("ul");
    summary.tools.forEach(
      (t) => (toolsList.appendChild(document.createElement("li")).textContent = t)
    );
    tlSection.appendChild(toolsList);
  }
  if (hasLanguages || hasTools) {
    container.appendChild(tlSection);
  }

  const spellsSection = document.createElement("section");
  spellsSection.className = "spells";
  spellsSection.appendChild(document.createElement("h3")).textContent =
    "Spells";
  const spellsList = document.createElement("ul");
  summary.spells.forEach(
    (s) => (spellsList.appendChild(document.createElement("li")).textContent = s)
  );
  spellsSection.appendChild(spellsList);
  container.appendChild(spellsSection);

  const backstorySection = document.createElement("section");
  backstorySection.className = "backstory";
  backstorySection.appendChild(document.createElement("h3")).textContent =
    "Backstory";
  const backstoryInput = document.createElement("textarea");
  backstoryInput.id = "backstoryInput";
  backstoryInput.className = "form-control";
  backstoryInput.rows = 4;
  backstoryInput.value = details.backstory || "";
  backstoryInput.textContent = backstoryInput.value;
  backstorySection.appendChild(backstoryInput);
  container.appendChild(backstorySection);

  const backstoryEl = backstoryInput;
  // Auto-resize textarea so content is never visually clipped on screen
  const autoResize = () => {
    if (!backstoryEl) return;
    backstoryEl.style.height = 'auto';
    backstoryEl.style.height = `${backstoryEl.scrollHeight}px`;
  };
  autoResize();
  backstoryEl?.addEventListener("input", () => {
    CharacterState.system.details.backstory = backstoryEl.value;
    autoResize();
  });

  const midRow = hasEquipment
    ? '"abilities skills equipment"'
    : hasInfusions
    ? '"abilities skills infusions"'
    : '"abilities skills features"';
  const tlRow = hasLanguages || hasTools
    ? '"tools-languages spells spells"'
    : '"spells spells spells"';
  const gridRows = [
    '"header header header"',
    '"abilities skills features"',
    midRow,
    tlRow,
    '"backstory backstory backstory"',
  ];
  container.style.gridTemplateAreas = gridRows.join(" ");
  container.style.gridTemplateColumns = "0.9fr 1.1fr 1.6fr";
  container.style.gap = "16px";

  if (!hasEquipment && !hasInfusions) {
    featuresSection.style.gridRow = "2 / span 2";
  } else {
    featuresSection.style.gridRow = "auto";
  }
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
      currentStep = LAST_STEP;
      localStorage.removeItem('characterState');
    }
  } catch (e) {
    /* ignore */
  }

  await initI18n();
  applyTranslations();
  initCustomDataManager();
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const btn = document.getElementById(`btnStep${i}`);
    if (btn) {
      btn.addEventListener("click", () => {
        showStep(i);
        if (i === 2) loadStep2(true);
        if (i === 3) loadStep3(true);
        if (i === 4) loadStep4(true);
        if (i === 5) loadStep5(true);
        if (i === TOTAL_STEPS - 1) loadStep6(true);
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
      if (startAtStep7) showStep(LAST_STEP);
    })
    .catch((err) => console.error(err));

  document.getElementById("downloadJson")?.addEventListener("click", async () => {
    // Export a Foundry-ready actor using the modern dnd5e schema
    try {
      const actor = await exportFoundryActorV13(CharacterState);
      const blob = new Blob([JSON.stringify(actor, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${CharacterState.name || "character"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    }
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

export {
  showStep,
  loadData,
  setCurrentStepComplete,
  showErrorBanner,
  invalidateStep,
  invalidateStepsFrom,
  TOTAL_STEPS,
  LAST_STEP,
};
