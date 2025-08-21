import { handleError, renderTables } from './common.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { loadSpells, filterSpells, handleSpellcasting } from './spellcasting.js';
import { convertRaceData } from './raceData.js';
import { ARTISAN_TOOLS, MUSICAL_INSTRUMENTS, ALL_TOOLS, ALL_LANGUAGES, ALL_SKILLS, filterAvailableProficiencies } from './data/proficiencies.js';
import { getSelectedData, setSelectedData, saveSelectedData } from './state.js';
import { createHeader, createParagraph, createList } from './domHelpers.js';
import { handleVariantExtraSelections, handleVariantFeatureChoices } from './variantFeatures.js';
import { handleExtraLanguages, handleExtraSkills, handleExtraTools, handleExtraAncestry, gatherRaceTraitSelections } from './extrasSelections.js';
import { openExtrasModal, updateExtraSelectionsView, showExtraSelection, extraCategoryAliases, extraCategoryDescriptions } from './extrasModal.js';
import { setExtraSelections } from './extrasState.js';
import { displayRaceTraits } from './raceTraits.js';
import { updateSubclasses, renderClassFeatures } from './classFeatures.js';
import { convertDetailsToAccordion, initializeAccordion } from './ui/accordion.js';
import { getState, addProficiency, removeProficiency } from './characterState.js';


let selectedData = getSelectedData();

export function refreshSelectedData() {
  selectedData = getSelectedData();
  return selectedData;
}

export function checkTraitCompletion(detailId) {
  const detail = document.getElementById(detailId);
  if (!detail) return;
  const selects = detail.querySelectorAll("select");
  const incomplete = [...selects].some(sel => !sel.value);
  detail.classList.toggle("incomplete", incomplete);
}

/** Normalize spell names by stripping tags such as "#c" and lowering the case. */
function normalizeSpellName(name) {
  if (!name) return '';
  return name.replace(/#.*$/, '').toLowerCase();
}

/**
 * Returns a merged list of selections already taken via previous choices or
 * fixed grants (background, class, or race).
 * @param {string} type - One of 'skills', 'tools', 'languages', or 'cantrips'.
 * @returns {Set<string>} Set of taken selections of the given type (lowercase).
 */
function getTakenSelections(type, opts = {}) {
  const {
    excludeRace = false,
    excludeClass = false,
    excludeBackground = false,
  } = opts;
  const selectedMap = {
    skills: 'Skill Proficiency',
    tools: 'Tool Proficiency',
    languages: 'Languages',
    cantrips: 'Cantrips',
  };

  const taken = new Set();

  (selectedData[selectedMap[type]] || [])
    .filter(v => v)
    .forEach(v => taken.add(v.toLowerCase()));

  if (!excludeBackground && window.backgroundData) {
    const bgMap = {
      skills: 'skills',
      tools: 'tools',
      languages: 'languages',
      cantrips: 'cantrips',
    };
    const bgVals = window.backgroundData[bgMap[type]];
    if (Array.isArray(bgVals)) bgVals.forEach(v => taken.add(v.toLowerCase()));
    else if (typeof bgVals === 'string') taken.add(bgVals.toLowerCase());
    if (type === 'cantrips' && window.backgroundData.spellcasting && window.backgroundData.spellcasting.fixed_spell) {
      taken.add(normalizeSpellName(window.backgroundData.spellcasting.fixed_spell));
    }
  }

  // Include fixed selections granted by the currently selected class
  if (!excludeClass && window.currentClassData) {
    if (type === 'tools') {
      const tp = window.currentClassData.tool_proficiencies;
      if (Array.isArray(tp)) {
        tp.forEach(t => {
          const lower = t.toLowerCase();
          if (!lower.includes('of your choice') && !lower.includes(' or ')) {
            taken.add(lower);
          }
        });
      } else if (tp && Array.isArray(tp.fixed)) {
        tp.fixed.forEach(t => taken.add(t.toLowerCase()));
      }
    } else if (type === 'skills') {
      const sp = window.currentClassData.skill_proficiencies;
      if (sp && Array.isArray(sp.fixed)) {
        sp.fixed.forEach(s => taken.add(s.toLowerCase()));
      }
    } else if (type === 'languages') {
      const lp = window.currentClassData.language_proficiencies;
      if (lp && Array.isArray(lp.fixed)) {
        lp.fixed.forEach(l => taken.add(l.toLowerCase()));
      }
    } else if (type === 'cantrips') {
      const sc = window.currentClassData.spellcasting;
      if (sc) {
        if (Array.isArray(sc.fixed_cantrips)) {
          sc.fixed_cantrips.forEach(c => taken.add(normalizeSpellName(c)));
        }
        if (sc.fixed_spell) {
          taken.add(normalizeSpellName(sc.fixed_spell));
        }
      }
    }
  }

  // Include fixed selections granted by the currently selected race
  if (!excludeRace && window.currentRaceData) {
    if (type === 'languages') {
      const langs = window.currentRaceData.languages;
      if (langs && Array.isArray(langs.fixed)) {
        langs.fixed.forEach(l => taken.add(l.toLowerCase()));
      }
    } else if (type === 'skills') {
      const sc = window.currentRaceData.skill_choices;
      if (sc && Array.isArray(sc.fixed)) {
        sc.fixed.forEach(s => taken.add(s.toLowerCase()));
      }
    } else if (type === 'tools') {
      const tc = window.currentRaceData.tool_choices;
      if (tc && Array.isArray(tc.fixed)) {
        tc.fixed.forEach(t => taken.add(t.toLowerCase()));
      }
    } else if (type === 'cantrips') {
      const sc = window.currentRaceData.spellcasting;
      if (sc) {
        if (Array.isArray(sc.fixed_cantrips)) {
          sc.fixed_cantrips.forEach(c => taken.add(normalizeSpellName(c)));
        }
        if (sc.fixed_spell) {
          taken.add(normalizeSpellName(sc.fixed_spell));
        }
      }
    }
  }

  return taken;
}

// Utility reading CharacterState.proficiencies and reporting conflicts
function getTakenProficiencies(type, incoming, opts = {}) {
  const { excludeRace = false, excludeClass = false, excludeBackground = false } = opts;
  const state = getState();
  let entries = state.proficiencies.filter(p => p.type === type);
  if (excludeRace) entries = entries.filter(p => !p.sources.includes('race'));
  if (excludeClass) entries = entries.filter(p => !p.sources.includes('class'));
  if (excludeBackground) entries = entries.filter(p => !p.sources.includes('background'));

  const ownedExisting = new Set(entries.map(p => p.key.toLowerCase()));
  if (!incoming) return ownedExisting;

  const lowerIncoming = incoming.map(i => i.toLowerCase());
  const ownedAll = new Set([...ownedExisting, ...lowerIncoming]);

  const defaults = {
    languages: ALL_LANGUAGES,
    skills: ALL_SKILLS,
    tools: ALL_TOOLS,
  };
  const replacementPool = (defaults[type] || []).filter(
    o => !ownedAll.has(o.toLowerCase())
  );

  const conflicts = incoming
    .filter(item => ownedExisting.has(item.toLowerCase()))
    .map(item => {
      const entry = entries.find(e => e.key.toLowerCase() === item.toLowerCase());
      return {
        key: item,
        ownedFrom: entry ? [...entry.sources] : [],
        replacementPool,
      };
    });

  return { owned: ownedAll, conflicts };
}

// Registry tracking current conflicts by a unique grant identifier
const conflictRegistry = {};

/**
 * Register a conflict so that it can later be resolved.
 * @param {string} grantId - Unique identifier for the grant.
 * @param {Object} conflict - Conflict details including type, key, source and replacementPool.
 */
export function registerConflict(grantId, conflict) {
  if (!grantId || !conflict) return;
  conflictRegistry[grantId] = { ...conflict };
}

/**
 * Resolve a previously registered conflict by swapping the duplicate proficiency.
 * @param {string} grantId - Identifier returned when the conflict was registered.
 * @param {string} replacement - Proficiency selected by the user.
 * @returns {boolean} True if resolution succeeded.
 */
export function resolveConflict(grantId, replacement) {
  const conflict = conflictRegistry[grantId];
  if (!conflict) return false;
  if (!conflict.replacementPool.includes(replacement)) return false;

  const { type, key, source } = conflict;
  // Remove the conflicting grant from state for this source
  removeProficiency(type, key, source);
  // Add the replacement proficiency for the same source
  addProficiency(type, replacement, source);

  console.log(`🔄 Swapped ${key} → ${replacement} for ${source}`);
  conflict.resolved = true;
  return true;
}

/**
 * Builds a unified list of extra selections for races or classes.
 * @param {Object} data - Source data containing choice information.
 * @param {string} context - "race" or "class" to determine parsing logic.
 * @param {number} [level=1] - Character level for filtering class choices.
 * @returns {Array} List of selection objects.
 */
function gatherExtraSelections(data, context, level = 1) {
  const selections = [];

  const takenLangs = getTakenProficiencies('languages');
  const takenSkills = getTakenProficiencies('skills');
  const takenTools = getTakenProficiencies('tools');

  if (context === "race") {
    if (data.languages && (data.languages.fixed.length > 0 || data.languages.choice > 0)) {
      const fixedLangs = new Set(data.languages.fixed.map(l => l.toLowerCase()));
      const baseLangs = ALL_LANGUAGES.filter(lang => !fixedLangs.has(lang.toLowerCase()));
      const { options: availableLangs, note } = filterAvailableProficiencies('languages', baseLangs, takenLangs);
      const fixedDesc = data.languages.fixed.length
        ? `<strong>Lingue Concesse:</strong> ${data.languages.fixed.join(', ')}`
        : '';
      selections.push({
        name: "Languages",
        description: fixedDesc + note,
        selection: availableLangs,
        count: data.languages.choice
      });
    }
    if (data.skill_choices) {
      const { options: filteredSkills, note } = filterAvailableProficiencies('skills', data.skill_choices.options, takenSkills);
      if (filteredSkills.length > 0) {
        selections.push({
          name: "Skill Proficiency",
          description: "Choose skill proficiencies." + note,
          selection: filteredSkills,
          count: data.skill_choices.number
        });
      }
    }
    if (data.tool_choices) {
      const { options: filteredTools, note } = filterAvailableProficiencies('tools', data.tool_choices.options, takenTools);
      if (filteredTools.length > 0) {
        selections.push({
          name: "Tool Proficiency",
          description: "Choose a tool proficiency." + note,
          selection: filteredTools,
          count: 1
        });
      }
    }
  } else if (context === "class") {
    const allChoices = data.choices || [];
    allChoices.forEach(choice => {
      if (!choice.level || parseInt(choice.level) <= level) {
        const key = extraCategoryAliases[choice.name] || choice.name;
        if (key === 'Tool Proficiency') return; // tool choices handled in equipment
        const selected = (selectedData[key] || []).filter(v => v);
        let opts = choice.selection || choice.options || [];
        let note = '';
        const map = {
          Languages: { type: 'languages', taken: takenLangs },
          'Skill Proficiency': { type: 'skills', taken: takenSkills }
        };
        const info = map[key];
        if (info) {
          const res = filterAvailableProficiencies(info.type, opts, info.taken, selected);
          opts = res.options;
          note = res.note;
        }
        const desc = note ? ((choice.description || '') + note) : choice.description;
        selections.push({ ...choice, selection: opts, description: desc, selected });
      }
    });
  }
  return selections;
}

/**
 * Generic handler to track selections inside feature <select> elements
 * and visually highlight incomplete features.
 * @param {HTMLElement} container - Parent element containing feature details.
 * @param {Function} [saveCallback] - Optional callback to persist selections.
 */
function initFeatureSelectionHandlers(container, saveCallback) {
  if (!container) return;
  const blocks = container.querySelectorAll('.feature-block');
  blocks.forEach(block => {
    const selects = block.querySelectorAll('select');
    if (selects.length === 0) return;
    block.classList.add('user-choice');
    const mark = () => {
      const unfilled = Array.from(selects).some(s => !s.value);
      block.classList.toggle('needs-selection', unfilled);
    };
    mark();
    selects.forEach(sel => {
      sel.addEventListener('change', () => {
        if (saveCallback) saveCallback(sel);
        mark();
      });
    });
  });
}

export function saveFeatureSelection(select) {
  const feature = select.dataset.feature;
  const index = select.dataset.index || 0;
  if (!feature) return;
  if (!selectedData[feature]) selectedData[feature] = [];
  selectedData[feature][index] = select.value || undefined;
  saveSelectedData();
}

/**
 * Render extra selections inside an accordion rather than a modal.
 */

updateExtraSelectionsView();


function renderFinalRecap() {
  const recapDiv = document.getElementById("finalRecap");
  if (!recapDiv) return;

  selectedData = getSelectedData();
  const userName = document.getElementById("userName")?.value || "";
  const characterName = document.getElementById("characterName")?.value || "";
  const className = document.getElementById("classSelect").selectedOptions[0]?.text || "";
  const subclassName = document.getElementById("subclassSelect").selectedOptions[0]?.text || "";
  const raceName = document.getElementById("raceSelect").selectedOptions[0]?.text || "";
  const level = document.getElementById("levelSelect")?.value || "";
  const origin = document.getElementById("origin")?.value || "";
  const age = document.getElementById("age")?.value || "";
  const backgroundLanguages = window.backgroundData ? window.backgroundData.languages || [] : [];
  const backgroundTools = window.backgroundData ? window.backgroundData.tools || [] : [];
  const extraLangs = selectedData["Languages"] || [];
  const extraTools = selectedData["Tool Proficiency"] || [];
  const languages = [...new Set([...backgroundLanguages, ...extraLangs])];
  const tools = [...new Set([...backgroundTools, ...extraTools])];
  const equipment = selectedData.equipment || {};
  const equipList = [
    ...(equipment.standard || []),
    ...(equipment.class || []),
    ...(equipment.upgrades || [])
  ];

  let html = "";
  html += `<p><strong>Nome Utente:</strong> ${userName}</p>`;
  html += `<p><strong>Nome PG:</strong> ${characterName}</p>`;
  html += `<p><strong>Classe:</strong> ${className}${subclassName ? ` (${subclassName})` : ""}</p>`;
  html += `<p><strong>Razza:</strong> ${raceName}</p>`;
  html += `<p><strong>Livello:</strong> ${level}</p>`;
  html += `<p><strong>Provenienza:</strong> ${origin}</p>`;
  html += `<p><strong>Età:</strong> ${age}</p>`;
  html += `<p><strong>Lingue:</strong> ${languages.join(", ")}</p>`;
  html += `<p><strong>Strumenti:</strong> ${tools.join(", ")}</p>`;
  html += `<p><strong>Equip:</strong> ${equipList.join(", ")}</p>`;
  recapDiv.innerHTML = html;
}

// ==================== GENERAZIONE DEL JSON FINALE (STEP 8) ====================
function generateFinalJson() {
  let chromaticAncestry = null;
  const ancestrySelect = document.getElementById("ancestrySelect");
  if (ancestrySelect && ancestrySelect.value) {
    try {
      chromaticAncestry = JSON.parse(ancestrySelect.value);
    } catch (e) {
      console.error("Errore nel parsing della Chromatic Ancestry scelta", e);
    }
  }
  const toolProficiency = document.getElementById("toolChoice0") ? document.getElementById("toolChoice0").value : null;
  const variantFeature = document.getElementById("variantFeatureChoice") ? document.getElementById("variantFeatureChoice").value : null;
  const variantExtra = {};
  const variantSkillElems = document.querySelectorAll(".variantSkillChoice");
  if (variantSkillElems.length > 0) {
    variantExtra.skills = [];
    variantSkillElems.forEach(elem => {
      if (elem.value) variantExtra.skills.push(elem.value);
    });
  }
  const variantSpellElem = document.getElementById("variantSpellChoice");
  if (variantSpellElem && variantSpellElem.value) {
    variantExtra.spell = variantSpellElem.value;
  }
  const backgroundLanguages = window.backgroundData ? window.backgroundData.languages || [] : [];
  const allLanguages = [...new Set([...(selectedData["Languages"] || []), ...backgroundLanguages])];
  const character = {
    user_name: document.getElementById("userName")?.value || "",
    name: document.getElementById("characterName").value || "Senza Nome",
    origin: document.getElementById("origin")?.value || "",
    age: document.getElementById("age")?.value || "",
    level: document.getElementById("levelSelect").value || "1",
    race: document.getElementById("raceSelect").selectedOptions[0]?.text || "Nessuna",
    class: document.getElementById("classSelect").selectedOptions[0]?.text || "Nessuna",
    subclass: document.getElementById("subclassSelect").selectedOptions[0]?.text || "Nessuna",
    background: window.backgroundData ? window.backgroundData.name : "Nessuno",
    stats: {
      strength: document.getElementById("strFinalScore").textContent,
      dexterity: document.getElementById("dexFinalScore").textContent,
      constitution: document.getElementById("conFinalScore").textContent,
      intelligence: document.getElementById("intFinalScore").textContent,
      wisdom: document.getElementById("wisFinalScore").textContent,
      charisma: document.getElementById("chaFinalScore").textContent
    },
    racial_bonus: {
      strength: document.getElementById("strRaceModifier").textContent,
      dexterity: document.getElementById("dexRaceModifier").textContent,
      constitution: document.getElementById("conRaceModifier").textContent,
      intelligence: document.getElementById("intRaceModifier").textContent,
      wisdom: document.getElementById("wisRaceModifier").textContent,
      charisma: document.getElementById("chaRaceModifier").textContent
    },
    background_proficiencies: window.backgroundData ? {
      skills: window.backgroundData.skills || [],
      tools: window.backgroundData.tools || [],
      languages: window.backgroundData.languages || []
    } : { skills: [], tools: [], languages: [] },
    background_feat: window.backgroundData ? window.backgroundData.feat || "" : "",
    equipment: selectedData.equipment || { standard: [], class: [], upgrades: [] },
    languages: {
      selected: allLanguages
    },
    selections: selectedData,
    chromatic_ancestry: chromaticAncestry,
    tool_proficiency: toolProficiency,
    variant_feature: variantFeature,
    variant_extra: variantExtra
  };
  console.log("✅ Dati finali raccolti:");
  console.log(JSON.stringify(character, null, 2));
  generateFinalPdf(character);
}

async function generateFinalPdf(character) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Riepilogo Personaggio', 10, 10);
  doc.setFontSize(12);
  let y = 25;
  doc.text(`Nome Utente: ${character.user_name}`, 10, y); y += 10;
  doc.text(`Nome PG: ${character.name}`, 10, y); y += 10;
  const classLine = character.subclass && character.subclass !== 'Nessuna'
    ? `${character.class} (${character.subclass})`
    : character.class;
  doc.text(`Classe: ${classLine}`, 10, y); y += 10;
  doc.text(`Razza: ${character.race}`, 10, y); y += 10;
  doc.text(`Livello: ${character.level}`, 10, y); y += 10;
  doc.text(`Provenienza: ${character.origin}`, 10, y); y += 10;
  doc.text(`Età: ${character.age}`, 10, y); y += 10;
  doc.text(`Lingue: ${(character.languages.selected || []).join(', ')}`, 10, y); y += 10;
  const tools = [
    ...(character.background_proficiencies.tools || []),
    ...(character.tool_proficiency ? [character.tool_proficiency] : [])
  ];
  doc.text(`Strumenti: ${tools.join(', ')}`, 10, y); y += 10;
  doc.text('Statistiche:', 10, y); y += 10;
  Object.entries(character.stats).forEach(([stat, val]) => {
    doc.text(`${stat}: ${val}`, 15, y);
    y += 10;
  });

  const recapEl = document.getElementById('finalRecap');
  if (recapEl) {
    try {
      const canvas = await html2canvas(recapEl);
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = doc.internal.pageSize.getWidth();
      const imgProps = doc.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
    } catch (e) {
      console.error('Errore generando l\'immagine del recap', e);
    }
  }

  const filename = character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_character.pdf';
  downloadPdfFile(doc, filename);
}

function downloadPdfFile(pdfDoc, filename) {
  pdfDoc.save(filename);
}

// ==================== POINT BUY SYSTEM ====================
var totalPoints = 27;

function adjustPoints(ability, action) {
  const pointsSpan = document.getElementById(ability + "Points");
  let points = parseInt(pointsSpan.textContent);
  if (action === 'add' && totalPoints > 0 && points < 15) {
    totalPoints -= (points >= 13 ? 2 : 1);
    points++;
  } else if (action === 'subtract' && points > 8) {
    totalPoints += (points > 13 ? 2 : 1);
    points--;
  }
  pointsSpan.textContent = points;
  const pointsRemaining = document.getElementById("pointsRemaining");
  if (pointsRemaining) {
    pointsRemaining.textContent = totalPoints;
  }
  updateFinalScores();
}

function updateFinalScores() {
  const level = parseInt(document.getElementById("levelSelect")?.value) || 1;
  ["str", "dex", "con", "int", "wis", "cha"].forEach(ability => {
    const base = parseInt(document.getElementById(`${ability}Points`).textContent);
    const raceMod = parseInt(document.getElementById(`${ability}RaceModifier`).textContent);
    const bgEl = document.getElementById(`${ability}BackgroundTalent`);
    const bgBonus = bgEl ? parseInt(bgEl.value) || 0 : 0;
    const finalScore = base + raceMod + bgBonus;
    const finalScoreElement = document.getElementById(`${ability}FinalScore`);
    if (level === 1 && finalScore > 17) {
      finalScoreElement.textContent = "Errore";
      finalScoreElement.style.color = "red";
    } else {
      finalScoreElement.textContent = finalScore;
      finalScoreElement.style.color = "";
    }
  });
  console.log("🔄 Punteggi Finali aggiornati!");
}

function initializeValues() {
  const abilities = ["str", "dex", "con", "int", "wis", "cha"];
  abilities.forEach(ability => {
    const raceModEl = document.getElementById(ability + "RaceModifier");
    if (raceModEl) raceModEl.textContent = "0";
    const bgEl = document.getElementById(ability + "BackgroundTalent");
    if (bgEl) bgEl.value = "0";
  });
  updateFinalScores();
}

function applyRacialBonuses() {
  console.log("⚡ applyRacialBonuses() chiamata!");
  const bonus1 = document.getElementById("racialBonus1").value;
  const bonus2 = document.getElementById("racialBonus2").value;
  const bonus3 = document.getElementById("racialBonus3").value;
  if (!bonus1 || !bonus2 || !bonus3) {
    handleError("Devi selezionare tutti e tre i bonus razziali!");
    return;
  }
  const selections = [bonus1, bonus2, bonus3];
  const counts = {};
  selections.forEach(bonus => {
    counts[bonus] = (counts[bonus] || 0) + 1;
  });
  const values = Object.values(counts);
  const validDistribution =
    (values.includes(2) && values.includes(1) && Object.keys(counts).length === 2) ||
    (values.every(val => val === 1) && Object.keys(counts).length === 3);
  if (!validDistribution) {
    handleError("Puoi assegnare +2 a una caratteristica e +1 a un'altra, oppure +1 a tre diverse!");
    return;
  }
  const abilityIds = ["str", "dex", "con", "int", "wis", "cha"];
  abilityIds.forEach(stat => {
    const el = document.getElementById(stat + "RaceModifier");
    if (el) {
      el.textContent = counts[stat] ? counts[stat] : "0";
    }
  });
  console.log("✅ Bonus razziali applicati:", counts);
  window.racialBonusesConfirmed = true;
  updateFinalScores();
}

export function resetRacialBonuses() {
  document.getElementById("racialBonus1").value = "";
  document.getElementById("racialBonus2").value = "";
  document.getElementById("racialBonus3").value = "";
  const abilityFields = ["str", "dex", "con", "int", "wis", "cha"];
  abilityFields.forEach(ability => {
    const el = document.getElementById(ability + "RaceModifier");
    if (el) el.textContent = "0";
  });
  window.racialBonusesConfirmed = false;
  updateFinalScores();
}

// ==================== STUB FOR updateSkillOptions ====================
function updateSkillOptions() {
  console.log("updateSkillOptions called.");
}

// ==================== EVENT LISTENERS AND INITIALIZATION ====================
window.applyRacialBonuses = applyRacialBonuses;
window.adjustPoints = adjustPoints;

export {
  handleVariantExtraSelections,
  handleVariantFeatureChoices,
  handleExtraAncestry,
  gatherExtraSelections,
  gatherRaceTraitSelections,
  initFeatureSelectionHandlers,
  convertDetailsToAccordion,
  initializeAccordion,
  updateSubclasses,
  renderClassFeatures,
  openExtrasModal,
  updateExtraSelectionsView,
  showExtraSelection,
  displayRaceTraits,
  getTakenSelections,
  getTakenProficiencies,
  generateFinalJson,
  generateFinalPdf,
  initializeValues,
  renderFinalRecap
};

