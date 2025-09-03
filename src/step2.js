import {
  DATA,
  CharacterState,
  loadClasses,
  loadFeats,
  totalLevel,
  updateSpellSlots,
  updateProficiencyBonus,
  MAX_CHARACTER_LEVEL,
  loadSpells,
} from './data.js';
import { t } from './i18n.js';
import {
  createElement,
  createAccordionItem,
  createSelectableCard,
  appendEntries,
  markIncomplete,
  showToast,
} from './ui-helpers.js';
import { renderFeatChoices } from './feat.js';
import { renderSpellChoices } from './spell-select.js';
import { pendingReplacements } from './proficiency.js';
import {
  filterDuplicateOptions,
  updateChoiceSelectOptions,
  updateSkillSelectOptions,
} from './choice-select-helpers.js';

const abilityMap = {
  Strength: 'str',
  Dexterity: 'dex',
  Constitution: 'con',
  Intelligence: 'int',
  Wisdom: 'wis',
  Charisma: 'cha',
};

// Snapshot of the character's proficiencies and abilities before any class
// data is applied. This allows us to cleanly rebuild the derived state when a
// class is edited or removed.
const baseState = {
  skills: [],
  tools: [],
  languages: [],
  cantrips: [],
  feats: [],
  abilities: {},
  expertise: [],
};

function refreshBaseState() {
  baseState.skills = [...CharacterState.system.skills];
  baseState.tools = [...CharacterState.system.tools];
  baseState.languages = [...CharacterState.system.traits.languages.value];
  baseState.cantrips = Array.isArray(CharacterState.system.spells.cantrips)
    ? [...CharacterState.system.spells.cantrips]
    : [];
  baseState.feats = Array.isArray(CharacterState.feats)
    ? CharacterState.feats.map(f => ({ ...f }))
    : [];
  baseState.expertise = Array.isArray(CharacterState.system.expertise)
    ? [...CharacterState.system.expertise]
    : [];
  for (const [ab, obj] of Object.entries(CharacterState.system.abilities)) {
    const bonus = CharacterState.bonusAbilities?.[ab] || 0;
    baseState.abilities[ab] = (obj.value || 0) - bonus;
  }
}

function rebuildFromClasses() {
  const skills = new Set(baseState.skills);
  const tools = new Set(baseState.tools);
  const languages = new Set(baseState.languages);
  const cantrips = new Set(baseState.cantrips);
  const feats = new Map();
  const expertise = new Set(baseState.expertise);
  baseState.feats.forEach(f => feats.set(f.name, { ...f }));
  CharacterState.bonusAbilities = {};
  for (const ab of Object.keys(baseState.abilities)) {
    CharacterState.bonusAbilities[ab] = 0;
  }

  (CharacterState.classes || []).forEach(cls => {
    (cls.skills || []).forEach(s => skills.add(s));
    (cls.expertise || []).forEach(e => expertise.add(e.skill || e));
    if (Array.isArray(cls.fixed_proficiencies)) {
      cls.fixed_proficiencies.forEach(l => languages.add(l));
    }
    if (cls.choiceSelections) {
      Object.values(cls.choiceSelections).forEach(entries => {
        entries.forEach(e => {
          if (e.type === 'skills') skills.add(e.option);
          else if (e.type === 'tools') tools.add(e.option);
          else if (e.type === 'languages') languages.add(e.option);
          else if (e.type === 'cantrips') cantrips.add(e.option);
          if (e.feat) {
            if (!feats.has(e.feat)) feats.set(e.feat, { name: e.feat });
          }
        });
      });
    }
    const bonuses = cls.asiBonuses || {};
    for (const [ab, inc] of Object.entries(bonuses)) {
      if (CharacterState.bonusAbilities[ab] !== undefined)
        CharacterState.bonusAbilities[ab] += inc;
    }
  });
  (CharacterState.feats || []).forEach(f => {
    if (f.ability) {
      for (const [ab, inc] of Object.entries(f.ability)) {
        if (CharacterState.bonusAbilities[ab] !== undefined)
          CharacterState.bonusAbilities[ab] += inc;
      }
    }
    (f.expertise || []).forEach(sk => expertise.add(sk));
  });

  CharacterState.system.skills = Array.from(skills);
  CharacterState.system.tools = Array.from(tools);
  CharacterState.system.traits.languages.value = Array.from(languages);
  CharacterState.system.spells.cantrips = Array.from(cantrips);
  CharacterState.system.expertise = Array.from(expertise);
  CharacterState.feats = Array.from(feats.values());
  for (const [ab, base] of Object.entries(baseState.abilities)) {
    CharacterState.system.abilities[ab].value =
      base + (CharacterState.bonusAbilities[ab] || 0);
  }
  updateSpellSlots();
  updateProficiencyBonus();
}

function validateTotalLevel(pendingClass) {
  const pending = pendingClass?.level || 0;
  const existing = totalLevel();
  if (existing + pending > MAX_CHARACTER_LEVEL) {
    const allowed = Math.max(0, MAX_CHARACTER_LEVEL - existing);
    if (pendingClass) pendingClass.level = allowed;
    showToast(t('levelCap', { max: MAX_CHARACTER_LEVEL }));
    return false;
  }
  return true;
}

function updateExpertiseSelectOptions(selects) {
  const list = Array.from(selects);
  const profSkills = [...CharacterState.system.skills].sort();
  list.forEach(sel => {
    const current = sel.value;
    sel.innerHTML = `<option value=''>${t('select')}</option>`;
    profSkills.forEach(sk => {
      const o = document.createElement('option');
      o.value = sk;
      o.textContent = sk;
      sel.appendChild(o);
    });
    if (profSkills.includes(current)) sel.value = current;
  });
  filterDuplicateOptions(list, CharacterState.system.expertise || []);
}

function getExistingFeats() {
  const feats = new Set((CharacterState.feats || []).map(f => f.name));
  (CharacterState.classes || []).forEach(cls => {
    if (cls.choiceSelections) {
      Object.values(cls.choiceSelections).forEach(entries => {
        entries.forEach(e => {
          if (e.feat) feats.add(e.feat);
        });
      });
    }
  });
  return feats;
}

function updateFeatSelectOptions() {
  const selects = document.querySelectorAll("select[data-type='asi-feat']");
  const takenFromState = getExistingFeats();
  selects.forEach(sel => {
    const taken = new Set(takenFromState);
    selects.forEach(other => {
      if (other !== sel && other.value) taken.add(other.value);
    });
    Array.from(sel.options).forEach(opt => {
      if (opt.value && opt.value !== sel.value && taken.has(opt.value)) {
        opt.disabled = true;
      } else {
        opt.disabled = false;
      }
    });
  });
}

/**
 * Convert a subclass name into the slug used for data files.
 *
 * Handles several common naming patterns:
 * - Leading articles like "The" (e.g. "The Undying" → "undying")
 * - Standard subclass prefixes such as "Path of the", "Oath of the",
 *   "College of", etc. (e.g. "Path of the Beast" → "beast")
 * - Druid land circles where the terrain type is in parentheses
 *   ("Circle of the Land (Desert)" → "desert")
 * - Trailing descriptors like "Domain" or "Tradition"
 * - Parenthetical notes are folded into the slug
 *   ("Purple Dragon Knight (Banneret)" → "purple_dragon_knight_banneret")
 */
function slugifySubclass(name = '') {
  return name
    .replace(/^Circle of the Land\s*/i, '')
    .replace(/^The /i, '')
    .replace(/^(Path|Oath|Circle|College|Order|Domain|Way|School) of (the )?/i, '')
    .replace(/ (Domain|Tradition)$/i, '')
    .replace(/\s*\(([^)]+)\)/g, ' $1')
    .replace(/[’']/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function loadSubclassData(cls) {
  if (!cls.subclass) {
    cls.subclassData = null;
    return;
  }
  const slug = slugifySubclass(cls.subclass);
  try {
    const resp = await fetch(`data/subclasses/${slug}.json`);
    if (!resp.ok) throw new Error('Failed to load');
    cls.subclassData = await resp.json();
  } catch (e) {
    cls.subclassData = null;
  }
}

function compileClassFeatures(cls) {
  const data = DATA.classes.find(c => c.name === cls.name);
  if (!data) return;
  cls.features = [];
  for (let lvl = 1; lvl <= (cls.level || 1); lvl++) {
    const feats = [
      ...(data.features_by_level?.[lvl] || []),
      ...(cls.subclassData?.features_by_level?.[lvl] || []),
    ];
    feats.forEach(f => {
      cls.features.push({
        level: lvl,
        name: f.name,
        description: f.description || '',
        entries: f.entries || [],
      });
    });
  }
  if (cls.choiceSelections) {
    for (const [name, entries] of Object.entries(cls.choiceSelections)) {
      const choiceDef = (data.choices || []).find(c => c.name === name);
      entries.forEach(e => {
        cls.features.push({
          level: e.level || null,
          name: `${name}: ${e.option}`,
          abilities: e.abilities,
          feat: e.feat,
          optionalFeatures: e.optionalFeatures,
          description: choiceDef?.description || '',
          entries: choiceDef?.entries || [],
        });
      });
    }
  }
  (cls.expertise || []).forEach(e => {
    cls.features.push({
      level: e.level || null,
      name: `Expertise: ${e.skill}`,
      description: '',
      entries: [],
    });
  });
}

function createAbilitySelect() {
  const abilities = [
    'Strength',
    'Dexterity',
    'Constitution',
    'Intelligence',
    'Wisdom',
    'Charisma',
  ];
  const sel = document.createElement('select');
  sel.innerHTML = `<option value=''>${t('selectAbility')}</option>`;
  abilities.forEach(ab => {
    const o = document.createElement('option');
    o.value = ab;
    o.textContent = ab;
    sel.appendChild(o);
  });
  sel.dataset.type = 'asi-ability';
  return sel;
}

function createFeatSelect(current = '') {
  const sel = document.createElement('select');
  sel.innerHTML = `<option value=''>${t('selectFeat')}</option>`;
  const taken = getExistingFeats();
  (DATA.feats || []).forEach(feat => {
    if (!taken.has(feat) || feat === current) {
      const o = document.createElement('option');
      o.value = feat;
      o.textContent = feat;
      sel.appendChild(o);
    }
  });
  sel.dataset.type = 'asi-feat';
  return sel;
}

function handleASISelection(sel, container, entry, cls) {
  const existing = container.querySelectorAll(
    `select[data-parent='${sel.dataset.choiceId}']`
  );
  existing.forEach(e => e.remove());

  entry.abilities = [];
  cls.asiBonuses = cls.asiBonuses || {};
  const refreshBonuses = () => {
    cls.asiBonuses = {};
    if (!cls.choiceSelections) return;
    Object.values(cls.choiceSelections).forEach(entries => {
      entries.forEach(e => {
        if (
          e.option === 'Increase one ability score by 2' &&
          Array.isArray(e.abilities)
        ) {
          const code = abilityMap[e.abilities[0]];
          if (code) cls.asiBonuses[code] = (cls.asiBonuses[code] || 0) + 2;
        } else if (
          e.option === 'Increase two ability scores by 1' &&
          Array.isArray(e.abilities)
        ) {
          e.abilities.forEach(ab => {
            const code = abilityMap[ab];
            if (code) cls.asiBonuses[code] = (cls.asiBonuses[code] || 0) + 1;
          });
        }
      });
    });
  };
  refreshBonuses();

  if (sel.value === 'Increase one ability score by 2') {
    const abilitySel = createAbilitySelect();
    abilitySel.dataset.parent = sel.dataset.choiceId;
    abilitySel.value = entry?.abilities?.[0] || '';
    abilitySel.addEventListener('change', () => {
      entry.abilities = [abilitySel.value];
      refreshBonuses();
      compileClassFeatures(cls);
      rebuildFromClasses();
      updateStep2Completion();
    });
    container.appendChild(abilitySel);
  } else if (sel.value === 'Increase two ability scores by 1') {
    for (let j = 0; j < 2; j++) {
      const abilitySel = createAbilitySelect();
      abilitySel.dataset.parent = sel.dataset.choiceId;
      abilitySel.value = entry?.abilities?.[j] || '';
      abilitySel.addEventListener('change', () => {
        const abilities = entry.abilities || [];
        abilities[j] = abilitySel.value;
        entry.abilities = abilities;
        refreshBonuses();
        compileClassFeatures(cls);
        rebuildFromClasses();
        updateStep2Completion();
      });
      container.appendChild(abilitySel);
    }
  } else if (sel.value === 'Feat') {
    const featSel = createFeatSelect(entry?.feat || '');
    featSel.dataset.parent = sel.dataset.choiceId;
    featSel.value = entry?.feat || '';
    const featChoicesDiv = document.createElement('div');
    featSel.addEventListener('change', async () => {
      entry.feat = featSel.value;
      entry.featRenderer = null;
      featChoicesDiv.innerHTML = '';
      if (featSel.value) {
        const onFeatChange = () => {
          if (entry.featRenderer?.isComplete()) {
            entry.featRenderer.apply();
            entry.optionalFeatures =
              entry.featRenderer.optionalFeatureSelects?.map(
                (s) => s.value
              );
            rebuildFromClasses();
          }
          updateStep2Completion();
        };
        entry.featRenderer = await renderFeatChoices(
          featSel.value,
          featChoicesDiv,
          onFeatChange
        );
        const all = [
          ...(entry.featRenderer.abilitySelects || []),
          ...(entry.featRenderer.skillSelects || []),
          ...(entry.featRenderer.toolSelects || []),
          ...(entry.featRenderer.languageSelects || []),
          ...(entry.featRenderer.spellSelects || []),
          ...(entry.featRenderer.optionalFeatureSelects || []),
        ];
        all.forEach((s) => s.addEventListener('change', onFeatChange));
      }
      compileClassFeatures(cls);
      rebuildFromClasses();
      updateFeatSelectOptions();
      updateStep2Completion();
    });
    container.appendChild(featSel);
    container.appendChild(featChoicesDiv);
    updateFeatSelectOptions();
  }
}

function renderClassEditor(cls, index) {
  const card = document.createElement('div');
  card.className = 'saved-class';
  card.classList.add('needs-selection');
  cls.element = card;
  markIncomplete(card, !classHasPendingChoices(cls));

  const header = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = `${cls.name}`;
  header.appendChild(title);

  const removeBtn = createElement('button', t('remove'));
  removeBtn.className = 'btn btn-danger';
  removeBtn.addEventListener('click', () => removeClass(index));
  header.appendChild(removeBtn);

  card.appendChild(header);

  const levelSel = document.createElement('select');
  for (let i = 1; i <= MAX_CHARACTER_LEVEL; i++) {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = i;
    levelSel.appendChild(o);
  }
  levelSel.value = cls.level || 1;
  levelSel.addEventListener('change', () => {
    const lvl = parseInt(levelSel.value, 10) || 1;
    const delta = lvl - (cls.level || 1);
    if (!validateTotalLevel({ level: delta })) {
      levelSel.value = cls.level || 1;
      return;
    }
    cls.level = lvl;
    if (cls.choiceSelections) {
      Object.keys(cls.choiceSelections).forEach(name => {
        cls.choiceSelections[name] = cls.choiceSelections[name].filter(
          e => (e.level || 1) <= cls.level
        );
        if (cls.choiceSelections[name].length === 0) delete cls.choiceSelections[name];
      });
    }
    cls.expertise = (cls.expertise || []).filter(e => (e.level || 1) <= cls.level);
    compileClassFeatures(cls);
    rebuildFromClasses();
    (CharacterState.classes || []).forEach(c => {
      if (c.spellcasting?.type === 'known' && c.spellItem) {
        const newRenderer = renderSpellChoices(c);
        const newItem = createAccordionItem(t('spellsKnown'), newRenderer.element, true);
        c.spellItem.parentNode.replaceChild(newItem, c.spellItem);
        c.spellRenderer = newRenderer;
        c.spellItem = newItem;
      }
    });
    renderSelectedClasses();
    updateStep2Completion();
  });
  card.appendChild(levelSel);

  const accordion = document.createElement('div');
  accordion.className = 'accordion';

  const skillSelects = [];
  const skillChoiceSelects = [];
  const skillChoiceSelectMap = new Map();

  const clsDef = DATA.classes.find(c => c.name === cls.name);
  if (clsDef) {
    if (clsDef.skill_proficiencies?.options) {
      const sContainer = document.createElement('div');
      if (CharacterState.showHelp) {
        const desc = document.createElement('p');
        desc.textContent = `${t('skillProficiencyExplanation')} ${t('chooseSkills', { count: clsDef.skill_proficiencies.choose })}`;
        sContainer.appendChild(desc);
      }
      for (let i = 0; i < clsDef.skill_proficiencies.choose; i++) {
        const sel = document.createElement('select');
        sel.innerHTML = `<option value=''>${t('select')}</option>`;
        clsDef.skill_proficiencies.options.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          sel.appendChild(o);
        });
        sel.dataset.type = 'skill';
        sel.value = cls.skills?.[i] || '';
        skillSelects.push(sel);
        sel.addEventListener('change', () => {
          cls.skills = cls.skills || [];
          cls.skills[i] = sel.value;
          updateSkillSelectOptions(skillSelects, skillChoiceSelects);
          skillChoiceSelectMap.forEach(selects => {
            updateChoiceSelectOptions(selects, 'skills', skillSelects, skillChoiceSelects);
          });
          compileClassFeatures(cls);
          rebuildFromClasses();
          updateExpertiseSelectOptions(
            document.querySelectorAll("select[data-type='expertise']")
          );
          updateStep2Completion();
        });
        sContainer.appendChild(sel);
      }
      updateSkillSelectOptions(skillSelects, skillChoiceSelects);
      accordion.appendChild(
        createAccordionItem(t('skillProficiencies'), sContainer, true)
      );
    }

    if (Array.isArray(clsDef.subclasses) && clsDef.subclasses.length) {
      const subContainer = document.createElement('div');
      if (CharacterState.showHelp) {
        const desc = document.createElement('p');
        desc.textContent = t('chooseSubclass');
        subContainer.appendChild(desc);
      }
      const sel = document.createElement('select');
      sel.innerHTML = `<option value=''>${t('select')}</option>`;
      clsDef.subclasses.forEach(sc => {
        const o = document.createElement('option');
        o.value = sc.name;
        o.textContent = sc.name;
        sel.appendChild(o);
      });
      sel.dataset.type = 'subclass';
      sel.value = cls.subclass || '';
      sel.addEventListener('change', async () => {
        cls.subclass = sel.value;
        await loadSubclassData(cls);
        compileClassFeatures(cls);
        rebuildFromClasses();
        renderSelectedClasses();
        updateStep2Completion();
      });
      subContainer.appendChild(sel);
      accordion.appendChild(createAccordionItem(t('subclass'), subContainer, true));
    }

    if (cls.subclass && !cls.subclassData) {
      loadSubclassData(cls).then(() => {
        compileClassFeatures(cls);
        rebuildFromClasses();
        renderSelectedClasses();
      });
    }

    for (let lvl = 1; lvl <= (cls.level || 1); lvl++) {
      const levelChoices = [
        ...(clsDef.choices || []).filter(c => c.level === lvl),
        ...(cls.subclassData?.choices || []).filter(c => c.level === lvl),
      ];
      const features = [
        ...(clsDef.features_by_level?.[lvl] || []),
        ...(cls.subclassData?.features_by_level?.[lvl] || []),
      ];

      levelChoices.forEach(choice => {
        const cContainer = document.createElement('div');

        const fIdx = features.findIndex(f => f.name === choice.name);
        if (fIdx >= 0) {
          const feature = features.splice(fIdx, 1)[0];
          if (feature.description)
            cContainer.appendChild(createElement('p', feature.description));
          appendEntries(cContainer, feature.entries);
        }

        if (choice.description)
          cContainer.appendChild(createElement('p', choice.description));
        appendEntries(cContainer, choice.entries);
        const count = choice.count || 1;
        const choiceSelects = [];
        const isExpertise = choice.name === 'Expertise' || choice.requiresProficiency;
        let existing = [];
        if (isExpertise) {
          cls.expertise = cls.expertise || [];
          existing = cls.expertise.filter(e => e.id.startsWith(`${choice.name}-${choice.level}-`));
        } else {
          cls.choiceSelections = cls.choiceSelections || {};
          existing = cls.choiceSelections[choice.name] || [];
        }
        let cantripOptionsPromise;
        if (choice.type === 'cantrips' && !isExpertise) {
          cantripOptionsPromise = loadSpells().then(spells =>
            spells
              .filter(
                s => s.level === 0 && (s.spell_list || []).includes(cls.name)
              )
              .map(s => s.name)
              .sort()
          );
        }
        for (let i = 0; i < count; i++) {
          const sel = document.createElement('select');
          sel.innerHTML = `<option value=''>${t('select')}</option>`;
          const choiceId = `${choice.name}-${lvl}-${i}`;
          sel.dataset.choiceId = choiceId;
          if (isExpertise) {
            sel.dataset.type = 'expertise';
            const stored = existing.find(e => e.id === choiceId);
            if (stored) sel.value = stored.skill;
            choiceSelects.push(sel);
            sel.addEventListener('change', () => {
              cls.expertise = cls.expertise || [];
              const idx = cls.expertise.findIndex(e => e.id === choiceId);
              if (sel.value) {
                const obj = { id: choiceId, level: lvl, skill: sel.value };
                if (idx >= 0) cls.expertise[idx] = obj;
                else cls.expertise.push(obj);
              } else if (idx >= 0) {
                cls.expertise.splice(idx, 1);
              }
              rebuildFromClasses();
              updateExpertiseSelectOptions(
                document.querySelectorAll("select[data-type='expertise']")
              );
              updateStep2Completion();
            });
            cContainer.appendChild(sel);
          } else {
            sel.dataset.type = 'choice';
            sel.dataset.choiceName = choice.name;
            sel.dataset.choiceType = choice.type || '';
            const stored = existing[i];
            choiceSelects.push(sel);
            if (choice.type === 'cantrips') {
              cantripOptionsPromise.then(opts => {
                opts.forEach(opt => {
                  const o = document.createElement('option');
                  o.value = opt;
                  o.textContent = opt;
                  sel.appendChild(o);
                });
                if (stored) sel.value = stored.option;
              });
            } else {
              (choice.selection || []).forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                sel.appendChild(o);
              });
              if (stored) sel.value = stored.option;
            }
            if (choice.type === 'skills') {
              skillChoiceSelects.push(sel);
            }
            sel.addEventListener('change', () => {
              cls.choiceSelections[choice.name] = cls.choiceSelections[choice.name] || [];
              const arr = cls.choiceSelections[choice.name];
              const entry = arr[i] || { level: lvl, type: choice.type };
              entry.option = sel.value;
              arr[i] = entry;
              handleASISelection(sel, cContainer, entry, cls);
              updateChoiceSelectOptions(choiceSelects, choice.type, skillSelects, skillChoiceSelects);
              if (choice.type === 'skills') {
                updateSkillSelectOptions(skillSelects, skillChoiceSelects);
                skillChoiceSelectMap.forEach(selects => {
                  updateChoiceSelectOptions(selects, 'skills', skillSelects, skillChoiceSelects);
                });
              }
              compileClassFeatures(cls);
              rebuildFromClasses();
              updateExpertiseSelectOptions(
                document.querySelectorAll("select[data-type='expertise']")
              );
              updateFeatSelectOptions();
              updateStep2Completion();
            });
            cContainer.appendChild(sel);
            if (stored) {
              handleASISelection(sel, cContainer, stored, cls);
            }
          }
        }
        if (isExpertise) {
          updateExpertiseSelectOptions(
            document.querySelectorAll("select[data-type='expertise']")
          );
        } else if (choice.type === 'skills') {
          skillChoiceSelectMap.set(choice.name, choiceSelects);
          updateSkillSelectOptions(skillSelects, skillChoiceSelects);
          skillChoiceSelectMap.forEach(selects => {
            updateChoiceSelectOptions(selects, 'skills', skillSelects, skillChoiceSelects);
          });
        } else if (choice.type === 'cantrips') {
          cantripOptionsPromise.then(() => {
            updateChoiceSelectOptions(choiceSelects, choice.type, skillSelects, skillChoiceSelects);
          });
        } else {
          updateChoiceSelectOptions(choiceSelects, choice.type, skillSelects, skillChoiceSelects);
        }
        accordion.appendChild(
          createAccordionItem(
            `${t('level')} ${choice.level}: ${choice.name}`,
            cContainer,
            true
          )
        );
      });
      features.forEach(f => {
        const body = document.createElement('div');
        if (f.description)
          body.appendChild(createElement('p', f.description));
        appendEntries(body, f.entries);
        accordion.appendChild(
          createAccordionItem(`${t('level')} ${lvl}: ${f.name}`, body)
        );
      });
    }
  }

  if (cls.spellcasting?.type === 'known') {
    cls.spellRenderer = renderSpellChoices(cls);
    cls.spellItem = createAccordionItem(t('spellsKnown'), cls.spellRenderer.element, true);
    accordion.appendChild(cls.spellItem);
  }

  card.appendChild(accordion);
  return card;
}

function removeClass(index) {
  const classes = CharacterState.classes || [];
  if (index < 0 || index >= classes.length) return;

  if (
    typeof window !== 'undefined' &&
    typeof window.confirm === 'function'
  ) {
    const proceed = window.confirm(t('removeClassConfirm'));
    if (!proceed) return;
  }

  const removed = classes.splice(index, 1)[0];
  if (removed) {
    delete (CharacterState.knownSpells || {})[removed.name];
  }
  rebuildFromClasses();
  renderSelectedClasses();
  updateStep2Completion();
}

function renderSelectedClasses() {
  const container = document.getElementById('selectedClasses');
  if (!container) return;
  container.innerHTML = '';
  const classes = CharacterState.classes || [];
  if (classes.length) {
    const summaryText = classes
      .map(c => `${c.name} (${t('level')} ${c.level})`)
      .join(', ');
    if (CharacterState.showHelp) {
      container.appendChild(
        createElement(
          'p',
          t('selectedClasses', { classes: summaryText, level: totalLevel() })
        )
      );
      container.appendChild(
        createElement('p',
          t('proficiencyBonus', {
            value: CharacterState.system.attributes.prof,
          })
        )
      );
    }
  }

  classes.forEach((cls, index) => {
    const card = renderClassEditor(cls, index);
    container.appendChild(card);
  });
  updateExpertiseSelectOptions(
    document.querySelectorAll("select[data-type='expertise']")
  );

  const addLink = document.createElement('a');
  addLink.href = '#';
  addLink.textContent = t('addAnotherClass');
  addLink.addEventListener('click', e => {
    e.preventDefault();
    showClassSelectionModal();
  });
  const linkWrapper = document.createElement('p');
  linkWrapper.appendChild(addLink);
  container.appendChild(linkWrapper);
}

function showClassSelectionModal() {
  const modal = document.getElementById('classSelectionModal');
  const list = document.getElementById('classSelectionList');
  const closeBtn = document.getElementById('closeClassSelectionModal');
  if (!modal || !list) return;
  list.innerHTML = '';
  // Filter out classes that are already part of the character's build
  const taken = new Set((CharacterState.classes || []).map(c => c.name));

  (DATA.classes || []).forEach(cls => {
    if (taken.has(cls.name)) return;

    // Each remaining class is rendered as a clickable button
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = cls.name;
    btn.addEventListener('click', () => {
      modal.classList.add('hidden');
      selectClass(cls);
    });
    list.appendChild(btn);
  });

  // Reveal the modal and wire up the close action
  modal.classList.remove('hidden');
  if (closeBtn) {
    closeBtn.onclick = () => modal.classList.add('hidden');
  }
}

function classHasPendingChoices(cls) {
  const clsDef = DATA.classes.find(c => c.name === cls.name);
  if (!clsDef) return false;

  if (clsDef.skill_proficiencies?.options) {
    const required = clsDef.skill_proficiencies.choose || 0;
    if ((cls.skills || []).length < required) return true;
  }

  if (Array.isArray(clsDef.subclasses) && clsDef.subclasses.length && !cls.subclass) {
    return true;
  }

  const choices = (clsDef.choices || []).filter(c => c.level <= (cls.level || 1));
  for (const choice of choices) {
    const needed = choice.count || 1;
    const isExpertise = choice.name === 'Expertise' || choice.requiresProficiency;
    if (isExpertise) {
      const selections = (cls.expertise || []).filter(e => e.level === choice.level);
      if (selections.length < needed) return true;
      if (selections.some(s => !s.skill)) return true;
      continue;
    }
    const selections = cls.choiceSelections?.[choice.name] || [];
    if (selections.length < needed) return true;
    if (selections.some(s => !s.option)) return true;
    if (choice.type === 'asi') {
      for (const sel of selections) {
        if (
          sel.option === 'Increase one ability score by 2' &&
          !(sel.abilities && sel.abilities.length)
        )
          return true;
        if (
          sel.option === 'Increase two ability scores by 1' &&
          (!sel.abilities || sel.abilities.length !== 2)
        )
          return true;
        if (sel.option === 'Feat') {
          if (!sel.feat) return true;
          if (sel.featRenderer && !sel.featRenderer.isComplete()) return true;
        }
      }
    }
  }
  if (cls.spellcasting?.type === 'known') {
    if (!cls.spellRenderer || !cls.spellRenderer.isComplete()) return true;
  }
  return false;
}

function updateStep2Completion() {
  const btnStep3 = document.getElementById('btnStep3');
  const btnStep4 = document.getElementById('btnStep4');
  const progressBar = document.getElementById('progressBar');

  const complete = isStepComplete();

  if (btnStep3) btnStep3.disabled = !complete;
  if (btnStep4)
    btnStep4.disabled =
      !complete || !CharacterState.system.details.race;
  if (progressBar) {
    const width = (complete ? 2 : 1) / 6 * 100;
    progressBar.style.width = `${width}%`;
  }
  (CharacterState.classes || []).forEach((cls) => {
    if (cls.element) markIncomplete(cls.element, !classHasPendingChoices(cls));
  });
  globalThis.setCurrentStepComplete?.(complete);
}

globalThis.updateStep2Completion = updateStep2Completion;

export function isStepComplete() {
  const incomplete = (CharacterState.classes || []).some(classHasPendingChoices);
  const hasClass = (CharacterState.classes || []).length > 0;
  return hasClass && !incomplete && pendingReplacements() === 0;
}

export function confirmStep() {
  updateStep2Completion();
  return isStepComplete();
}

/**
 * Inizializza lo Step 2: Selezione Classe
 */
export async function loadStep2(refresh = true) {
  const classListContainer = document.getElementById('classList');
  const selectedClassesContainer = document.getElementById('selectedClasses');
  let searchInput = document.getElementById('classSearch');
  if (!classListContainer || !selectedClassesContainer) return;
  classListContainer.innerHTML = '';
  selectedClassesContainer.innerHTML = '';

  // Ensure the class data has been loaded before rendering
  try {
    await loadClasses();
    await loadFeats();
  } catch (err) {
    console.error(t('classDataUnavailable'), err);
    return;
  }

  if (refresh) refreshBaseState();
  // Rebuild the selected classes list from the current character state
  renderSelectedClasses();
  updateStep2Completion();

  // Show either the class selection list or the already selected classes
  classListContainer.classList.toggle('hidden', CharacterState.classes.length !== 0);
  selectedClassesContainer?.classList.toggle('hidden', CharacterState.classes.length === 0);
  searchInput?.classList.toggle('hidden', CharacterState.classes.length !== 0);

  if (CharacterState.classes.length !== 0) {
    return;
  }

  const classes = Array.isArray(DATA.classes) ? DATA.classes : [];
  if (!classes.length) {
    console.error(t('classDataUnavailable'));
    return;
  }
  function renderClassCards(query = '') {
    classListContainer.innerHTML = '';
    const taken = new Set(CharacterState.classes.map(c => c.name));
    classes
      .filter(
        cls =>
          !taken.has(cls.name) &&
          cls.name.toLowerCase().includes(query.toLowerCase())
      )
      .forEach(cls => {
        const imageUrl = `assets/classes/${cls.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '')}.png`;
        const card = createSelectableCard(
          cls.name,
          cls.description || t('noDescription'),
          null,
          () => showClassModal(cls),
          t('details'),
          () => showClassModal(cls),
          imageUrl
        );
        classListContainer.appendChild(card);
      });
  }
  if (searchInput) {
    const newInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newInput, searchInput);
    searchInput = newInput;
    searchInput.addEventListener('input', () =>
      renderClassCards(searchInput.value)
    );
  }
  renderClassCards();
}

/**
 * Mostra il modal con i dettagli della classe
 */
function showClassModal(cls) {
  const modal = document.getElementById('classModal');
  const details = document.getElementById('classModalDetails');
  const addBtn = document.getElementById('addClassButton');
  const closeBtn = document.getElementById('closeClassModal');

  if (!modal || !details || !addBtn) return;

  details.innerHTML = '';

  // Title and description
  details.appendChild(createElement('h2', cls.name));
  if (CharacterState.showHelp)
    details.appendChild(
      createElement('p', cls.description || t('noDescription'))
    );

  // Proficiency information
  const profList = document.createElement('ul');
  if (Array.isArray(cls.armor_proficiencies) && cls.armor_proficiencies.length) {
    profList.appendChild(
      createElement('li',
        t('armorProficiencies', { list: cls.armor_proficiencies.join(', ') })
      )
    );
  }
  if (Array.isArray(cls.weapon_proficiencies) && cls.weapon_proficiencies.length) {
    profList.appendChild(
      createElement('li',
        t('weaponProficiencies', { list: cls.weapon_proficiencies.join(', ') })
      )
    );
  }
  if (cls.skill_proficiencies) {
    let skillText = '';
    if (cls.skill_proficiencies.options) {
      skillText = t('chooseOptions', {
        count: cls.skill_proficiencies.choose,
        options: cls.skill_proficiencies.options.join(', '),
      });
    } else if (cls.skill_proficiencies.fixed) {
      skillText = cls.skill_proficiencies.fixed.join(', ');
    }
    if (skillText) {
      profList.appendChild(
        createElement('li', `${t('skills')}: ${skillText}`)
      );
    }
  }
  if (profList.childNodes.length) {
    const profHeader = createElement('h3', t('proficiencies'));
    details.appendChild(profHeader);
    details.appendChild(profList);
  }

  addBtn.onclick = () => {
    selectClass(cls);
    modal.classList.add('hidden');
  };
  modal.classList.remove('hidden');

  if (closeBtn) {
    closeBtn.onclick = () => modal.classList.add('hidden');
  }
}

/**
 * Salva la classe selezionata nel CharacterState
 */
function selectClass(cls) {
  const classes = CharacterState.classes || (CharacterState.classes = []);
  if (classes.some(c => c.name === cls.name)) {
    if (typeof alert !== 'undefined') {
      alert(t('classAlreadySelected', { name: cls.name }));
    }
    loadStep2(false);
    return;
  }

  const newCls = {
    name: cls.name,
    level: 1,
    fixed_proficiencies: cls.language_proficiencies?.fixed || [],
    skill_choices: cls.skill_proficiencies || [],
    spellcasting: cls.spellcasting || {},
    skills: [],
    choiceSelections: {},
    expertise: [],
  };
  classes.push(newCls);
  compileClassFeatures(newCls);
  const modal = document.getElementById('classModal');
  modal?.classList.add('hidden');
  rebuildFromClasses();
  document.getElementById('classList')?.classList.add('hidden');
  document.getElementById('classSearch')?.classList.add('hidden');
  document.getElementById('selectedClasses')?.classList.remove('hidden');
  loadStep2(false);
  updateStep2Completion();
}

export {
  updateExpertiseSelectOptions,
  validateTotalLevel,
  refreshBaseState,
  rebuildFromClasses,
  selectClass,
  renderClassEditor,
  slugifySubclass,
};
