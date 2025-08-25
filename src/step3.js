import {
  DATA,
  CharacterState,
  fetchJsonWithRetry,
  loadRaces,
  logCharacterState
} from './data.js';
import { refreshBaseState, rebuildFromClasses } from './step2.js';
import { t } from './i18n.js';
import { showStep } from './main.js';
import { addUniqueProficiency } from './proficiency.js';

let selectedBaseRace = '';
let currentRaceData = null;
const pendingRaceChoices = {
  subrace: '',
  languages: [],
  spells: [],
};

function validateRaceChoices() {
  const btn = document.getElementById('confirmRaceSelection');
  const allSelects = [
    ...pendingRaceChoices.languages,
    ...pendingRaceChoices.spells,
  ];

  allSelects.forEach((sel) => {
    sel.classList.remove('missing', 'duplicate');
    sel.removeAttribute('title');
  });

  const missing = allSelects.filter((s) => !s.value);
  missing.forEach((s) => {
    s.classList.add('missing');
    s.title = 'Selection required';
  });

  const counts = {};
  allSelects.forEach((s) => {
    if (s.value) counts[s.value] = (counts[s.value] || 0) + 1;
  });
  const existingCantrips = new Set([
    ...(CharacterState.system.spells?.cantrips || []),
    ...(CharacterState.raceChoices?.spells || []),
  ]);
  const duplicates = allSelects.filter(
    (s) => s.value && (counts[s.value] > 1 || existingCantrips.has(s.value))
  );
  duplicates.forEach((s) => {
    s.classList.add('duplicate');
    s.title = 'Selections must be unique';
  });

  const valid =
    missing.length === 0 &&
    duplicates.length === 0 &&
    !!pendingRaceChoices.subrace;

  const errors = [];
  if (!pendingRaceChoices.subrace) errors.push('Select a subrace');
  if (missing.length) errors.push('Complete all selections');
  if (duplicates.length) errors.push('Choose unique options');

  if (btn) {
    btn.disabled = !valid;
    btn.title = valid ? '' : errors.join('. ');
  }
  return valid;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function createAccordionItem(title, content, isChoice = false, description = '') {
  const item = document.createElement('div');
  item.className = 'accordion-item' + (isChoice ? ' user-choice' : '');

  const header = document.createElement('button');
  header.className = 'accordion-header';
  if (description) {
    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    const descSpan = document.createElement('small');
    descSpan.textContent = ` - ${description}`;
    header.appendChild(titleSpan);
    header.appendChild(descSpan);
  } else {
    header.textContent = title;
  }

  const body = document.createElement('div');
  body.className = 'accordion-content';
  if (typeof content === 'string') {
    body.textContent = content;
  } else {
    body.appendChild(content);
  }

  header.addEventListener('click', () => {
    header.classList.toggle('active');
    body.classList.toggle('show');
  });

  item.appendChild(header);
  item.appendChild(body);
  return item;
}

function createRaceCard(race, onSelect, displayName = race.name) {
  const card = document.createElement('div');
  card.className = 'class-card';

  const title = document.createElement('h3');
  title.textContent = displayName;
  card.appendChild(title);

  const shortDesc = (race.entries || []).find((e) => typeof e === 'string');
  if (shortDesc) {
    const p = document.createElement('p');
    p.textContent = shortDesc;
    card.appendChild(p);
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
    card.appendChild(ul);
  }

  const detailsBtn = document.createElement('button');
  detailsBtn.className = 'btn btn-primary';
  detailsBtn.textContent = 'Details';
  detailsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showRaceModal(race);
  });
  card.appendChild(detailsBtn);

  card.addEventListener('click', onSelect);

  return card;
}

async function renderBaseRaces() {
  const container = document.getElementById('raceList');
  const features = document.getElementById('raceFeatures');
  if (!container) return;
  container.innerHTML = '';
  const changeBtn = document.getElementById('changeRace');
  changeBtn?.classList.add('hidden');
  features?.classList.add('hidden');
  if (features) features.innerHTML = '<div id="raceTraits"></div>';
  container.classList.remove('hidden');
  await Promise.all(
    Object.entries(DATA.races).map(async ([base, subs]) => {
      let race = { name: base };
      const path = subs[0]?.path;
      if (path) {
        const data = await fetchJsonWithRetry(path, `race at ${path}`);
        race = { ...data, name: base };
      }
      const card = createRaceCard(race, () => selectBaseRace(base));
      container.appendChild(card);
    })
  );
}

async function selectBaseRace(base) {
  selectedBaseRace = base;
  currentRaceData = null;
  pendingRaceChoices.subrace = '';
  pendingRaceChoices.languages = [];
  pendingRaceChoices.spells = [];
  const traits = document.getElementById('raceTraits');
  if (traits) traits.innerHTML = '';
  const features = document.getElementById('raceFeatures');
  features?.classList.add('hidden');
  const list = document.getElementById('raceList');
  list?.classList.remove('hidden');
  await renderSubraceCards(base);
  validateRaceChoices();
}

async function renderSubraceCards(base) {
  const container = document.getElementById('raceList');
  if (!container) return;
  container.innerHTML = '';
  const changeBtn = document.getElementById('changeRace');
  changeBtn?.classList.remove('hidden');
  const subraces = DATA.races[base] || [];
  await Promise.all(
    subraces.map(async ({ name, path }) => {
      const race = await fetchJsonWithRetry(path, `race at ${path}`);
      const card = createRaceCard(race, async () => {
        currentRaceData = race;
        pendingRaceChoices.subrace = race.name;
        await renderSelectedRace();
        container.classList.add('hidden');
        const features = document.getElementById('raceFeatures');
        features?.classList.remove('hidden');
        validateRaceChoices();
      });
      container.appendChild(card);
    })
  );
}
async function renderSelectedRace() {
  const accordion = document.getElementById('raceFeatures');
  if (!currentRaceData || !accordion) return;
  accordion.innerHTML = '';
  pendingRaceChoices.languages = [];
  pendingRaceChoices.spells = [];

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
    const choices = [];
    const walk = (node) => {
      if (!node) return;
      if (Array.isArray(node)) node.forEach(walk);
      else if (typeof node === 'object') {
        if (node.choose) choices.push(node.choose);
        Object.values(node).forEach(walk);
      }
    };
    walk(currentRaceData.additionalSpells);
    if (choices.length) {
      if (!DATA.spells) {
        const spells = await fetchJsonWithRetry('data/spells.json', 'spells');
        DATA.spells = spells;
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
          sel.innerHTML = `<option value=''>${t('select')}</option>`;
          opts.forEach((sp) => {
            if (sp !== current && chosen.has(sp)) return;
            const o = document.createElement('option');
            o.value = sp;
            o.textContent = sp;
            sel.appendChild(o);
          });
          sel.value = current;
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
      accordion.appendChild(createAccordionItem('Spells', spellContent, true));
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
  if (!currentRaceData || !selectedBaseRace) return;
  if (!validateRaceChoices()) return;
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

  const move = CharacterState.system.attributes.movement || {};
  const speed = currentRaceData.speed;
  if (typeof speed === 'number') move.walk = speed;
  else if (speed && typeof speed === 'object') {
    if (typeof speed.walk === 'number') move.walk = speed.walk;
    ['burrow', 'climb', 'fly', 'swim'].forEach((t) => {
      const val = speed[t];
      if (typeof val === 'number') move[t] = val;
      else if (val === true && typeof move.walk === 'number') move[t] = move.walk;
    });
  }
  CharacterState.system.attributes.movement = move;

  if (Array.isArray(currentRaceData.ability)) {
    currentRaceData.ability.forEach((obj) => {
      for (const [ab, val] of Object.entries(obj)) {
        if (typeof val === 'number' && CharacterState.system.abilities[ab]) {
          const abil = CharacterState.system.abilities[ab];
          abil.value = (abil.value || 0) + val;
        }
      }
    });
  }

  if (currentRaceData.darkvision)
    CharacterState.system.traits.senses.darkvision = currentRaceData.darkvision;
  if (currentRaceData.traitTags)
    CharacterState.system.traits.traitTags = [...currentRaceData.traitTags];

  if (currentRaceData.skillProficiencies) {
    currentRaceData.skillProficiencies.forEach((obj) => {
      for (const k in obj)
        if (obj[k]) addUniqueProficiency('skills', capitalize(k), container);
    });
  }
  if (currentRaceData.languageProficiencies) {
    currentRaceData.languageProficiencies.forEach((obj) => {
      for (const k in obj)
        if (k !== 'anyStandard' && obj[k])
          addUniqueProficiency('languages', capitalize(k), container);
    });
  }
  pendingRaceChoices.languages.forEach((sel) => {
    addUniqueProficiency('languages', sel.value, container);
    sel.disabled = true;
  });
  pendingRaceChoices.spells.forEach((sel) => {
    addUniqueProficiency('cantrips', sel.value, container);
    CharacterState.raceChoices.spells.push(sel.value);
    sel.disabled = true;
  });

  pendingRaceChoices.languages = [];
  pendingRaceChoices.spells = [];
  refreshBaseState();
  rebuildFromClasses();
  const btn4 = document.getElementById('btnStep4');
  if (btn4) btn4.disabled = false;
  logCharacterState();
  showStep(4);
}

export async function loadStep3(force = false) {
  await loadRaces();
  const container = document.getElementById('raceList');
  if (!container) return;
  if (container.childElementCount && !force) return;
  await renderBaseRaces();

  const btn = document.getElementById('confirmRaceSelection');
  btn?.addEventListener('click', confirmRaceSelection);
  const changeBtn = document.getElementById('changeRace');
  changeBtn?.addEventListener('click', async () => {
    selectedBaseRace = '';
    currentRaceData = null;
    pendingRaceChoices.subrace = '';
    pendingRaceChoices.languages = [];
    pendingRaceChoices.spells = [];
    const traits = document.getElementById('raceTraits');
    if (traits) traits.innerHTML = '';
    const list = document.getElementById('raceList');
    const features = document.getElementById('raceFeatures');
    list?.classList.remove('hidden');
    features?.classList.add('hidden');
    await renderBaseRaces();
    validateRaceChoices();
  });
}
