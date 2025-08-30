import {
  DATA,
  CharacterState,
  fetchJsonWithRetry,
  loadRaces,
  logCharacterState,
  loadSpells
} from './data.js';
import { refreshBaseState, rebuildFromClasses } from './step2.js';
import { t } from './i18n.js';
import * as main from './main.js';
import { addUniqueProficiency, pendingReplacements } from './proficiency.js';
import { createAccordionItem } from './ui-helpers.js';

let selectedBaseRace = '';
let currentRaceData = null;
const pendingRaceChoices = {
  subrace: '',
  languages: [],
  spells: [],
  abilities: [],
};

let raceRenderSeq = 0;

function validateRaceChoices() {
  const allSelects = [
    ...pendingRaceChoices.languages,
    ...pendingRaceChoices.spells,
    ...pendingRaceChoices.abilities,
  ];

  allSelects.forEach((sel) => {
    sel.classList.remove('missing', 'duplicate');
    sel.removeAttribute('title');
  });

  const missing = allSelects.filter((s) => !s.value);
  missing.forEach((s) => {
    s.classList.add('missing');
    s.title = t('selectionRequired');
  });

  const counts = {};
  allSelects.forEach((s) => {
    if (s.value) counts[s.value] = (counts[s.value] || 0) + 1;
  });

  const existingCantrips = new Set([
    ...(CharacterState.system.spells?.cantrips || []),
    ...(CharacterState.raceChoices?.spells || []),
  ]);
  const existingLanguages = new Set([
    ...(CharacterState.system.traits.languages.value || []),
  ]);

  const duplicateSet = new Set();
  const languageDupSet = new Set();

  allSelects.forEach((s) => {
    if (s.value && counts[s.value] > 1) duplicateSet.add(s);
  });

  pendingRaceChoices.spells.forEach((s) => {
    if (s.value && existingCantrips.has(s.value)) duplicateSet.add(s);
  });

  pendingRaceChoices.languages.forEach((s) => {
    if (s.value && existingLanguages.has(s.value)) {
      duplicateSet.add(s);
      languageDupSet.add(s);
    }
  });

  const duplicates = Array.from(duplicateSet);
  duplicates.forEach((s) => {
    s.classList.add('duplicate');
    s.title = languageDupSet.has(s)
      ? t('languageAlreadyKnown')
      : t('selectionsMustBeUnique');
  });

  const valid =
    missing.length === 0 &&
    duplicates.length === 0 &&
    !!pendingRaceChoices.subrace;

  main.setCurrentStepComplete?.(valid);
  return valid;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function createRaceCard(race, onSelect, displayName = race.name) {
  const card = document.createElement('div');
  card.className = 'class-card';

  const title = document.createElement('h3');
  title.textContent = displayName;
  card.appendChild(title);

  const details = document.createElement('div');
  details.className = 'race-details hidden';

  const shortDesc = (race.entries || []).find((e) => typeof e === 'string');
  if (shortDesc) {
    const p = document.createElement('p');
    p.textContent = shortDesc;
    details.appendChild(p);
  }

  const traits = (race.entries || [])
    .filter((e) => e.name)
    .map((e) => e.name)
    .slice(0, 3);
  if (traits.length) {
    const ul = document.createElement('ul');
    traits.forEach((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    });
    details.appendChild(ul);
  }

  card.appendChild(details);

  const detailsBtn = document.createElement('button');
  detailsBtn.className = 'btn btn-primary';
  detailsBtn.textContent = t('details');
  detailsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    details.classList.toggle('hidden');
  });
  card.appendChild(detailsBtn);

  card.addEventListener('click', onSelect);

  return card;
}

async function renderBaseRaces(search = '') {
  const seq = ++raceRenderSeq;
  const container = document.getElementById('raceList');
  const features = document.getElementById('raceFeatures');
  if (!container) return;
  container.innerHTML = '';
  const changeBtn = document.getElementById('changeRace');
  changeBtn?.classList.add('hidden');
  features?.classList.add('hidden');
  if (features) features.innerHTML = '<div id="raceTraits"></div>';
  container.classList.remove('hidden');
  const term = (search || '').toLowerCase();
  for (const [base, subs] of Object.entries(DATA.races)) {
    const baseMatch = base.toLowerCase().includes(term);
    const subMatch = subs.some((s) => s.name.toLowerCase().includes(term));
    if (term && !baseMatch && !subMatch) continue;
    let race = { name: base };
    const path = subs[0]?.path;
    if (path) {
      const data = await fetchJsonWithRetry(path, `race at ${path}`);
      race = { ...data, name: base };
    }
    if (seq !== raceRenderSeq) return;
    const card = createRaceCard(
      race,
      () => selectBaseRace(base),
      `${base} (${subs.length})`
    );
    if (seq !== raceRenderSeq) return;
    container.appendChild(card);
  }
}

async function selectBaseRace(base) {
  selectedBaseRace = base;
  currentRaceData = null;
  pendingRaceChoices.subrace = '';
  pendingRaceChoices.languages = [];
  pendingRaceChoices.spells = [];
  pendingRaceChoices.abilities = [];
  const traits = document.getElementById('raceTraits');
  if (traits) traits.innerHTML = '';
  const features = document.getElementById('raceFeatures');
  features?.classList.add('hidden');
  const list = document.getElementById('raceList');
  list?.classList.remove('hidden');
  const searchInput = document.getElementById('raceSearch');
  if (searchInput) searchInput.value = '';
  await renderSubraceCards(base);
  validateRaceChoices();
}

async function renderSubraceCards(base, search = '') {
  const seq = ++raceRenderSeq;
  const container = document.getElementById('raceList');
  if (!container) return;
  container.innerHTML = '';
  const changeBtn = document.getElementById('changeRace');
  changeBtn?.classList.remove('hidden');
  const subraces = DATA.races[base] || [];
  const term = (search || '').toLowerCase();
  for (const { name, path } of subraces) {
    const race = await fetchJsonWithRetry(path, `race at ${path}`);
    if (!race.name.toLowerCase().includes(term)) continue;
    if (seq !== raceRenderSeq) return;
    const card = createRaceCard(race, async () => {
      currentRaceData = race;
      pendingRaceChoices.subrace = race.name;
      await renderSelectedRace();
      container.classList.add('hidden');
      document.getElementById('raceSearch')?.classList.add('hidden');
      const features = document.getElementById('raceFeatures');
      features?.classList.remove('hidden');
      validateRaceChoices();
    });
    if (seq !== raceRenderSeq) return;
    container.appendChild(card);
  }
}
async function renderSelectedRace() {
  const accordion = document.getElementById('raceFeatures');
  if (!currentRaceData || !accordion) return;
  accordion.innerHTML = '';
  pendingRaceChoices.languages = [];
  pendingRaceChoices.spells = [];
  pendingRaceChoices.abilities = [];

  const header = document.createElement('h3');
  header.textContent = currentRaceData.name;
  accordion.appendChild(header);

  if (currentRaceData.entries) {
    currentRaceData.entries.forEach((e) => {
      if (e.name) {
        const body = document.createElement('div');
        (e.entries || []).forEach((sub) => {
          if (typeof sub === 'string') {
            const p = document.createElement('p');
            p.textContent = sub;
            body.appendChild(p);
          }
        });
        accordion.appendChild(createAccordionItem(e.name, body));
      }
    });
  }

  if (currentRaceData.skillProficiencies) {
    const raceSkills = [];
    currentRaceData.skillProficiencies.forEach((obj) => {
      for (const k in obj) if (obj[k]) raceSkills.push(capitalize(k));
    });
    if (raceSkills.length) {
      accordion.appendChild(
        createAccordionItem(`${t('skills')}`, raceSkills.join(', '))
      );
    }
  }
  if (currentRaceData.languageProficiencies) {
    const raceLang = [];
    let pendingLang = 0;
    currentRaceData.languageProficiencies.forEach((obj) => {
      for (const k in obj) {
        if (k === 'anyStandard') pendingLang += obj[k];
        else if (obj[k]) raceLang.push(capitalize(k));
      }
    });
    if (raceLang.length || pendingLang > 0) {
      if (pendingLang > 0 && (!DATA.languages || !DATA.languages.length)) {
        const langs = await fetchJsonWithRetry('data/languages.json', 'languages');
        DATA.languages = langs.languages || langs;
      }
      const langContent = document.createElement('div');
      if (raceLang.length) {
        const p = document.createElement('p');
        p.textContent = raceLang.join(', ');
        langContent.appendChild(p);
      }
      if (pendingLang > 0) {
        const known = new Set([
          ...CharacterState.system.traits.languages.value,
          ...raceLang,
        ]);
        for (let i = 0; i < pendingLang; i++) {
          const sel = document.createElement('select');
          sel.innerHTML = `<option value=''>${t('select')}</option>`;
          (DATA.languages || [])
            .filter((l) => !known.has(l))
            .forEach((l) => {
              const o = document.createElement('option');
              o.value = l;
              o.textContent = l;
              sel.appendChild(o);
            });
          sel.dataset.type = 'choice';
          sel.dataset.choice = 'language';
          sel.addEventListener('change', validateRaceChoices);
          langContent.appendChild(sel);
          pendingRaceChoices.languages.push(sel);
        }
      }
      accordion.appendChild(
        createAccordionItem(t('languages'), langContent, pendingLang > 0)
      );
    }
  }

  if (currentRaceData.additionalSpells) {
    let abilityOpts = null;
    if (Array.isArray(currentRaceData.additionalSpells)) {
      currentRaceData.additionalSpells.forEach((obj) => {
        if (obj.ability?.choose) abilityOpts = obj.ability.choose;
      });
    }

    if (abilityOpts) {
      const abilityContent = document.createElement('div');
      const sel = document.createElement('select');
      sel.innerHTML = `<option value=''>${t('select')}</option>`;
      abilityOpts.forEach((ab) => {
        const o = document.createElement('option');
        o.value = ab;
        o.textContent = ab.toUpperCase();
        sel.appendChild(o);
      });
      sel.dataset.type = 'choice';
      sel.dataset.choice = 'ability';
      sel.addEventListener('change', validateRaceChoices);
      abilityContent.appendChild(sel);
      pendingRaceChoices.abilities.push(sel);
      accordion.appendChild(
        createAccordionItem(t('spellAbility'), abilityContent, true)
      );
    }

    const choices = [];
    const walk = (node) => {
      if (!node) return;
      if (Array.isArray(node)) node.forEach(walk);
      else if (typeof node === 'object') {
        if (node.choose && !Array.isArray(node.choose)) choices.push(node.choose);
        Object.values(node).forEach(walk);
      }
    };
    walk(currentRaceData.additionalSpells);
    if (choices.length) {
      if (!DATA.spells) {
        await loadSpells();
      }
      const SCHOOL_MAP = {
        A: 'Abjuration',
        C: 'Conjuration',
        D: 'Divination',
        E: 'Enchantment',
        I: 'Illusion',
        N: 'Necromancy',
        T: 'Transmutation',
        V: 'Evocation',
      };
      const spellContent = document.createElement('div');

      function updateSpellSelects() {
        const chosen = new Set([
          ...(CharacterState.system.spells?.cantrips || []),
          ...(CharacterState.raceChoices?.spells || []),
          ...pendingRaceChoices.spells
            .map((s) => s.value)
            .filter((v) => v),
        ]);
        pendingRaceChoices.spells.forEach((sel) => {
          const opts = JSON.parse(sel.dataset.opts || '[]');
          const current = sel.value;
          if (current) chosen.delete(current);
          sel.innerHTML = `<option value=''>${t('select')}</option>`;
          opts.forEach((sp) => {
            if (sp !== current && chosen.has(sp)) return;
            const o = document.createElement('option');
            o.value = sp;
            o.textContent = sp;
            sel.appendChild(o);
          });
          sel.value = current;
          if (current) chosen.add(current);
        });
      }

      choices.forEach((choice) => {
        let opts = [];
        let count = 1;
        if (typeof choice === 'string') {
          opts = (DATA.spells || [])
            .filter((sp) => {
              return choice.split('|').every((cond) => {
                const [key, val] = cond.split('=');
                if (key === 'level') return sp.level === parseInt(val, 10);
                if (key === 'school') {
                  const schools = val
                    .split(';')
                    .map((s) => SCHOOL_MAP[s] || s);
                  return schools.includes(sp.school);
                }
                if (key === 'class') {
                  const classes = val
                    .split(';')
                    .map((c) => capitalize(c.trim()))
                    .filter((c) => c);
                  return classes.some((c) =>
                    (sp.spell_list || []).includes(c)
                  );
                }
                return true;
              });
            })
            .map((sp) => sp.name);
        } else if (Array.isArray(choice.from)) {
          opts = choice.from;
          if (choice.count) count = choice.count;
        }
        for (let i = 0; i < count; i++) {
          const sel = document.createElement('select');
          sel.dataset.type = 'choice';
          sel.dataset.opts = JSON.stringify(opts);
          sel.addEventListener('change', () => {
            updateSpellSelects();
            validateRaceChoices();
          });
          spellContent.appendChild(sel);
          pendingRaceChoices.spells.push(sel);
        }
      });

      updateSpellSelects();
      accordion.appendChild(createAccordionItem(t('spells'), spellContent, true));
    }
  }

  const traitsDiv = document.createElement('div');
  traitsDiv.id = 'raceTraits';
  accordion.appendChild(traitsDiv);
  validateRaceChoices();
}

function showRaceModal(race) {
  const modal = document.getElementById('raceModal');
  const details = document.getElementById('raceModalDetails');
  const closeBtn = document.getElementById('closeRaceModal');
  if (!modal || !details) return;
  details.innerHTML = `<h2>${race.name}</h2>`;
  (race.entries || []).forEach((entry) => {
    if (typeof entry === 'string') {
      const p = document.createElement('p');
      p.textContent = entry;
      details.appendChild(p);
    } else if (entry.name) {
      const h3 = document.createElement('h3');
      h3.textContent = entry.name;
      details.appendChild(h3);
      (entry.entries || []).forEach((sub) => {
        if (typeof sub === 'string') {
          const p = document.createElement('p');
          p.textContent = sub;
          details.appendChild(p);
        }
      });
    }
  });
  modal.classList.remove('hidden');
  closeBtn?.addEventListener('click', () => modal.classList.add('hidden'), {
    once: true,
  });
}

function confirmRaceSelection() {
  if (!currentRaceData || !selectedBaseRace) return false;
  if (!validateRaceChoices()) return false;
  const container = document.getElementById('raceTraits');

  CharacterState.system.details.race = selectedBaseRace;
  CharacterState.system.details.subrace = currentRaceData.name;

  const sizeMap = { T: 'tiny', S: 'sm', M: 'med', L: 'lg', H: 'huge', G: 'grg' };
  if (currentRaceData.size) {
    const sz = Array.isArray(currentRaceData.size)
      ? currentRaceData.size[0]
      : currentRaceData.size;
    CharacterState.system.traits.size =
      sizeMap[sz] || CharacterState.system.traits.size;
  }

  const move = { ...(CharacterState.system.attributes.movement || {}) };
  const speed = currentRaceData.speed;
  if (typeof speed === 'number') move.walk = speed;
  else if (speed && typeof speed === 'object') {
    if (typeof speed.walk === 'number') move.walk = speed.walk;
    ['burrow', 'climb', 'swim'].forEach((t) => {
      const val = speed[t];
      if (typeof val === 'number') move[t] = val;
      else if (val === true && typeof move.walk === 'number') move[t] = move.walk;
    });
    if (speed.fly === true && typeof move.walk === 'number') move.fly = move.walk;
    else if (typeof speed.fly === 'number') move.fly = speed.fly;
  }
  CharacterState.system.attributes.movement = {
    ...CharacterState.system.attributes.movement,
    ...move,
  };
  CharacterState.raceChoices.movement = move;

  // Ability score increases are now handled in Step 6. Race selection
  // should not apply any modifiers to ability scores directly.

  if (currentRaceData.darkvision)
    CharacterState.system.traits.senses.darkvision = currentRaceData.darkvision;
  if (currentRaceData.traitTags)
    CharacterState.system.traits.traitTags = [...currentRaceData.traitTags];

  const replacements = [];
  if (currentRaceData.skillProficiencies) {
    currentRaceData.skillProficiencies.forEach((obj) => {
      for (const k in obj)
        if (obj[k]) {
          const val = capitalize(k);
          const sel = addUniqueProficiency('skills', val, container);
          if (sel) {
            sel.dataset.proftype = 'skills';
            replacements.push(sel);
          } else {
            CharacterState.raceChoices.skills =
              CharacterState.raceChoices.skills || [];
            CharacterState.raceChoices.skills.push(val);
          }
        }
    });
  }
  if (currentRaceData.languageProficiencies) {
    currentRaceData.languageProficiencies.forEach((obj) => {
      for (const k in obj)
        if (k !== 'anyStandard' && obj[k]) {
          const val = capitalize(k);
          const sel = addUniqueProficiency('languages', val, container);
          if (sel) {
            sel.dataset.proftype = 'languages';
            replacements.push(sel);
          } else {
            CharacterState.raceChoices.languages =
              CharacterState.raceChoices.languages || [];
            CharacterState.raceChoices.languages.push(val);
          }
        }
    });
  }
  pendingRaceChoices.languages.forEach((sel) => {
    const repl = addUniqueProficiency('languages', sel.value, container);
    if (repl) {
      repl.dataset.proftype = 'languages';
      replacements.push(repl);
    }
    if (!CharacterState.system.traits.languages.value.includes(sel.value))
      CharacterState.system.traits.languages.value.push(sel.value);
    CharacterState.raceChoices.languages =
      CharacterState.raceChoices.languages || [];
    CharacterState.raceChoices.languages.push(sel.value);
    sel.disabled = true;
  });
  pendingRaceChoices.spells.forEach((sel) => {
    const repl = addUniqueProficiency('cantrips', sel.value, container);
    if (repl) replacements.push(repl);
    CharacterState.raceChoices.spells.push(sel.value);
    sel.disabled = true;
  });
  pendingRaceChoices.abilities.forEach((sel) => {
    CharacterState.raceChoices.spellAbility = sel.value;
    sel.disabled = true;
  });

  pendingRaceChoices.languages = [];
  pendingRaceChoices.spells = [];
  pendingRaceChoices.abilities = [];
  refreshBaseState();
  rebuildFromClasses();
  const finalize = () => {
    logCharacterState();
    main.setCurrentStepComplete?.(true);
  };
  if (replacements.length) {
    main.setCurrentStepComplete?.(false);
    const check = () => {
      replacements.forEach((s) => {
        if (s.value && s.dataset.proftype) {
          const list =
            (CharacterState.raceChoices[s.dataset.proftype] =
              CharacterState.raceChoices[s.dataset.proftype] || []);
          if (!list.includes(s.value)) list.push(s.value);
        }
      });
      if (replacements.every((s) => s.value)) {
        replacements.forEach((s) => s.removeEventListener('change', check));
        finalize();
      }
    };
    replacements.forEach((s) => s.addEventListener('change', check));
    return false;
  }
  finalize();
  return true;
}

export async function loadStep3(force = false) {
  await loadRaces();
  const container = document.getElementById('raceList');
  let searchInput = document.getElementById('raceSearch');
  if (!container) return;
  if (container.childElementCount && !force) return;
  await renderBaseRaces(searchInput?.value);

  if (searchInput) {
    const newInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newInput, searchInput);
    searchInput = newInput;
    searchInput.addEventListener('input', async (e) => {
      const term = e.target.value;
      if (selectedBaseRace) await renderSubraceCards(selectedBaseRace, term);
      else await renderBaseRaces(term);
    });
  }

  const changeBtn = document.getElementById('changeRace');
  changeBtn?.addEventListener('click', async () => {
    if (currentRaceData) {
      (CharacterState.raceChoices.skills || []).forEach((s) => {
        const idx = CharacterState.system.skills.indexOf(s);
        if (idx >= 0) CharacterState.system.skills.splice(idx, 1);
      });
      (CharacterState.raceChoices.tools || []).forEach((t) => {
        const idx = CharacterState.system.tools.indexOf(t);
        if (idx >= 0) CharacterState.system.tools.splice(idx, 1);
      });
      (CharacterState.raceChoices.languages || []).forEach((l) => {
        const idx = CharacterState.system.traits.languages.value.indexOf(l);
        if (idx >= 0)
          CharacterState.system.traits.languages.value.splice(idx, 1);
      });
      const move = CharacterState.raceChoices.movement || {};
      const movement = CharacterState.system.attributes.movement || {};
      Object.keys(move).forEach((m) => {
        if (m === 'walk') movement.walk = 30;
        else delete movement[m];
      });
      CharacterState.system.attributes.movement = movement;
      // No ability score adjustments are made during race selection,
      // so there is nothing to revert here.
      CharacterState.raceChoices.skills = [];
      CharacterState.raceChoices.tools = [];
      CharacterState.raceChoices.languages = [];
      CharacterState.raceChoices.movement = {};
      CharacterState.raceChoices.spells = [];
      CharacterState.raceChoices.spellAbility = '';
    }
    selectedBaseRace = '';
    currentRaceData = null;
    pendingRaceChoices.subrace = '';
    pendingRaceChoices.languages = [];
    pendingRaceChoices.spells = [];
    pendingRaceChoices.abilities = [];
    if (CharacterState.system?.details) {
      CharacterState.system.details.race = '';
      CharacterState.system.details.subrace = '';
    }
    refreshBaseState();
    rebuildFromClasses();
    const traits = document.getElementById('raceTraits');
    if (traits) traits.innerHTML = '';
    const list = document.getElementById('raceList');
    const features = document.getElementById('raceFeatures');
    list?.classList.remove('hidden');
    features?.classList.add('hidden');
    searchInput?.classList.remove('hidden');
    await renderBaseRaces(searchInput?.value);
    validateRaceChoices();
  });
}

export function isStepComplete() {
  return !!CharacterState.system.details.race && pendingReplacements() === 0;
}

export function confirmStep() {
  if (isStepComplete()) return true;
  return confirmRaceSelection();
}

export { renderBaseRaces, selectBaseRace };
