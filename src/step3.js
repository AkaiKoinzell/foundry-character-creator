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
import {
  addUniqueProficiency,
  pendingReplacements,
  ALL_SKILLS,
  ALL_TOOLS,
} from './proficiency.js';
import {
  createAccordionItem,
  createSelectableCard,
  capitalize,
  appendEntries,
  createElement,
} from './ui-helpers.js';

let selectedBaseRace = '';
let currentRaceData = null;
const pendingRaceChoices = {
  subrace: '',
  skills: [],
  languages: [],
  spells: [],
  abilities: [],
  tools: [],
  size: null,
  alterations: { combo: null, minor: [], major: [] },
};

let raceRenderSeq = 0;

function validateRaceChoices() {
  const choiceSelects = [
    ...pendingRaceChoices.skills,
    ...pendingRaceChoices.languages,
    ...pendingRaceChoices.spells,
    ...pendingRaceChoices.abilities,
    ...pendingRaceChoices.tools,
    ...(pendingRaceChoices.alterations?.minor || []),
    ...(pendingRaceChoices.alterations?.major || []),
  ];
  const allSelects = [...choiceSelects];
  if (pendingRaceChoices.size) allSelects.push(pendingRaceChoices.size);
  if (pendingRaceChoices.alterations?.combo)
    allSelects.push(pendingRaceChoices.alterations.combo);

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
  choiceSelects.forEach((s) => {
    if (s.value) counts[s.value] = (counts[s.value] || 0) + 1;
  });

  const existingCantrips = new Set([
    ...(CharacterState.system.spells?.cantrips || []),
    ...(CharacterState.raceChoices?.spells || []),
  ]);
  const existingLanguages = new Set([
    ...(CharacterState.system.traits.languages.value || []),
  ]);
  const existingSkills = new Set([...(CharacterState.system.skills || [])]);
  const existingTools = new Set([...(CharacterState.system.tools || [])]);
  if (currentRaceData?.skillProficiencies) {
    currentRaceData.skillProficiencies.forEach((obj) => {
      for (const k in obj) {
        if (k !== 'choose' && k !== 'any' && obj[k])
          existingSkills.add(capitalize(k));
      }
    });
  }
  if (currentRaceData?.toolProficiencies) {
    currentRaceData.toolProficiencies.forEach((obj) => {
      for (const k in obj) {
        if (k !== 'choose' && k !== 'any' && obj[k])
          existingTools.add(capitalize(k));
      }
    });
  }

  const duplicateSet = new Set();
  const languageDupSet = new Set();
  const skillDupSet = new Set();
  const toolDupSet = new Set();

  choiceSelects.forEach((s) => {
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

  pendingRaceChoices.skills.forEach((s) => {
    if (s.value && existingSkills.has(s.value)) {
      duplicateSet.add(s);
      skillDupSet.add(s);
    }
  });
  pendingRaceChoices.tools.forEach((s) => {
    if (s.value && existingTools.has(s.value)) {
      duplicateSet.add(s);
      toolDupSet.add(s);
    }
  });

  const duplicates = Array.from(duplicateSet);
  duplicates.forEach((s) => {
    s.classList.add('duplicate');
    s.title = languageDupSet.has(s)
      ? t('languageAlreadyKnown')
      : skillDupSet.has(s)
      ? t('skillAlreadyKnown')
      : toolDupSet.has(s)
      ? t('toolAlreadyKnown')
      : t('selectionsMustBeUnique');
  });

  const valid =
    missing.length === 0 &&
    duplicates.length === 0 &&
    !!pendingRaceChoices.subrace;

  main.setCurrentStepComplete?.(valid);
  return valid;
}

function createRaceCard(race, onSelect, displayName = race.name) {
  const detailItems = [];
  const shortDesc = (race.entries || []).find(e => typeof e === 'string');
  if (shortDesc) detailItems.push(shortDesc);

  const traits = (race.entries || [])
    .filter(e => e.name)
    .map(e => e.name)
    .slice(0, 3);
  if (traits.length) {
    const ul = document.createElement('ul');
    traits.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    });
    detailItems.push(ul);
  }

  return createSelectableCard(
    displayName,
    null,
    detailItems,
    onSelect,
    t('details') || 'Details'
  );
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
  pendingRaceChoices.skills = [];
  pendingRaceChoices.languages = [];
  pendingRaceChoices.spells = [];
  pendingRaceChoices.abilities = [];
  pendingRaceChoices.tools = [];
  pendingRaceChoices.size = null;
  pendingRaceChoices.alterations = { combo: null, minor: [], major: [] };
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
  pendingRaceChoices.skills = [];
  pendingRaceChoices.languages = [];
  pendingRaceChoices.spells = [];
  pendingRaceChoices.abilities = [];
  pendingRaceChoices.tools = [];
  pendingRaceChoices.size = null;
  pendingRaceChoices.alterations = { combo: null, minor: [], major: [] };

  const header = document.createElement('h3');
  header.textContent = currentRaceData.name;
  accordion.appendChild(header);

  const entryMap = {};
  (currentRaceData.entries || []).forEach(e => {
    if (e.name) entryMap[e.name] = e;
  });
  const usedEntries = new Set();
  const spellEntry = Object.values(entryMap).find(e =>
    Array.isArray(e.entries) &&
    e.entries.some(sub => typeof sub === 'string' && /@spell|spell/i.test(sub))
  );
  let spellEntryUsed = false;

  if (
    Array.isArray(currentRaceData.size) &&
    currentRaceData.size.length > 1
  ) {
    const sizeContent = document.createElement('div');
    const sel = document.createElement('select');
    sel.innerHTML = `<option value=''>${t('select')}</option>`;
    const sizeNames = {
      T: 'Tiny',
      S: 'Small',
      M: 'Medium',
      L: 'Large',
      H: 'Huge',
      G: 'Gargantuan',
    };
    currentRaceData.size.forEach((sz) => {
      const o = document.createElement('option');
      o.value = sz;
      o.textContent = sizeNames[sz] || sz;
      sel.appendChild(o);
    });
    sel.dataset.type = 'choice';
    sel.dataset.choice = 'size';
    sel.addEventListener('change', validateRaceChoices);
    sizeContent.appendChild(sel);
    pendingRaceChoices.size = sel;
    const sizeEntry = Object.values(entryMap).find(
      e => e.name && e.name.toLowerCase() === 'size'
    );
    if (sizeEntry) {
      if (sizeEntry.description)
        sizeContent.appendChild(createElement('p', sizeEntry.description));
      appendEntries(sizeContent, sizeEntry.entries);
      usedEntries.add(sizeEntry.name);
    }
    accordion.appendChild(createAccordionItem(t('size'), sizeContent, true));
  }

  if (currentRaceData.skillProficiencies) {
    const raceSkills = [];
    let pendingAny = 0;
    const chooseGroups = [];
    currentRaceData.skillProficiencies.forEach((obj) => {
      if (typeof obj.any === 'number') pendingAny += obj.any;
      else if (obj.choose) {
        const from = obj.choose.from || [];
        const count = obj.choose.count || 1;
        chooseGroups.push({ from, count });
      } else {
        for (const k in obj) if (obj[k]) raceSkills.push(capitalize(k));
      }
    });
    if (raceSkills.length || pendingAny > 0 || chooseGroups.length) {
      const skillContent = document.createElement('div');
      if (raceSkills.length) {
        const p = document.createElement('p');
        p.textContent = raceSkills.join(', ');
        skillContent.appendChild(p);
      }
      const known = new Set([...CharacterState.system.skills, ...raceSkills]);
      for (let i = 0; i < pendingAny; i++) {
        const sel = document.createElement('select');
        sel.innerHTML = `<option value=''>${t('select')}</option>`;
        ALL_SKILLS.filter((sk) => !known.has(sk)).forEach((sk) => {
          const o = document.createElement('option');
          o.value = sk;
          o.textContent = sk;
          sel.appendChild(o);
        });
        sel.dataset.type = 'choice';
        sel.dataset.choice = 'skill';
        sel.addEventListener('change', validateRaceChoices);
        skillContent.appendChild(sel);
        pendingRaceChoices.skills.push(sel);
      }
      chooseGroups.forEach((grp) => {
        const opts = (grp.from || []).map((s) => capitalize(s));
        const count = grp.count || 1;
        for (let i = 0; i < count; i++) {
          const sel = document.createElement('select');
          sel.innerHTML = `<option value=''>${t('select')}</option>`;
          opts
            .filter((opt) => !known.has(opt))
            .forEach((opt) => {
              const o = document.createElement('option');
              o.value = opt;
              o.textContent = opt;
              sel.appendChild(o);
            });
          sel.dataset.type = 'choice';
          sel.dataset.choice = 'skill';
          sel.addEventListener('change', validateRaceChoices);
          skillContent.appendChild(sel);
          pendingRaceChoices.skills.push(sel);
        }
      });
      accordion.appendChild(
        createAccordionItem(
          `${t('skills')}`,
          skillContent,
          pendingRaceChoices.skills.length > 0
        )
      );
    }
  }
  if (currentRaceData.toolProficiencies) {
    const raceTools = [];
    let pendingAny = 0;
    const chooseGroups = [];
    currentRaceData.toolProficiencies.forEach((obj) => {
      if (typeof obj.any === 'number') pendingAny += obj.any;
      else if (obj.choose) {
        const from = obj.choose.from || obj.choose.options || [];
        const count = obj.choose.count || obj.choose.amount || 1;
        chooseGroups.push({ from, count });
      } else {
        for (const k in obj) if (obj[k]) raceTools.push(capitalize(k));
      }
    });
    if (raceTools.length || pendingAny > 0 || chooseGroups.length) {
      const toolContent = document.createElement('div');
      if (raceTools.length) {
        const p = document.createElement('p');
        p.textContent = raceTools.join(', ');
        toolContent.appendChild(p);
      }
      const known = new Set([
        ...(CharacterState.system.tools || []),
        ...raceTools,
      ]);
      for (let i = 0; i < pendingAny; i++) {
        const sel = document.createElement('select');
        sel.innerHTML = `<option value=''>${t('select')}</option>`;
        ALL_TOOLS.filter((tl) => !known.has(tl)).forEach((tl) => {
          const o = document.createElement('option');
          o.value = tl;
          o.textContent = tl;
          sel.appendChild(o);
        });
        sel.dataset.type = 'choice';
        sel.dataset.choice = 'tool';
        sel.addEventListener('change', validateRaceChoices);
        toolContent.appendChild(sel);
        pendingRaceChoices.tools.push(sel);
      }
      chooseGroups.forEach((grp) => {
        const opts = (grp.from || []).map((s) => capitalize(s));
        const count = grp.count || 1;
        for (let i = 0; i < count; i++) {
          const sel = document.createElement('select');
          sel.innerHTML = `<option value=''>${t('select')}</option>`;
          opts
            .filter((opt) => !known.has(opt))
            .forEach((opt) => {
              const o = document.createElement('option');
              o.value = opt;
              o.textContent = opt;
              sel.appendChild(o);
            });
          sel.dataset.type = 'choice';
          sel.dataset.choice = 'tool';
          sel.addEventListener('change', validateRaceChoices);
          toolContent.appendChild(sel);
          pendingRaceChoices.tools.push(sel);
        }
      });
      accordion.appendChild(
        createAccordionItem(
          `${t('tools')}`,
          toolContent,
          pendingRaceChoices.tools.length > 0
        )
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
      const langEntry = Object.values(entryMap).find(
        e => e.name && e.name.toLowerCase() === 'languages'
      );
      if (langEntry) {
        if (langEntry.description)
          langContent.appendChild(createElement('p', langEntry.description));
        appendEntries(langContent, langEntry.entries);
        usedEntries.add(langEntry.name);
      }
      if (raceLang.length) {
        langContent.appendChild(
          createElement('p', raceLang.join(', '))
        );
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

  if (
    currentRaceData.minorAlterations?.length ||
    currentRaceData.majorAlterations?.length
  ) {
    const alterContent = document.createElement('div');
    const comboSel = document.createElement('select');
    comboSel.innerHTML = `<option value=''>${t('select')}</option>`;
    (currentRaceData.alterationCombinations || []).forEach((combo, idx) => {
      const parts = [];
      if (combo.minor) parts.push(`${combo.minor} Minor`);
      if (combo.major) parts.push(`${combo.major} Major`);
      const o = document.createElement('option');
      o.value = idx;
      o.textContent = parts.join(' and ');
      comboSel.appendChild(o);
    });
    function renderAlterSelections() {
      pendingRaceChoices.alterations.minor = [];
      pendingRaceChoices.alterations.major = [];
      while (comboSel.nextSibling)
        comboSel.parentNode.removeChild(comboSel.nextSibling);
      const combo =
        (currentRaceData.alterationCombinations || [])[comboSel.value];
      if (!combo) {
        validateRaceChoices();
        return;
      }
      for (let i = 0; i < (combo.minor || 0); i++) {
        const sel = document.createElement('select');
        sel.innerHTML = `<option value=''>${t('select')}</option>`;
        (currentRaceData.minorAlterations || []).forEach((opt) => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          sel.appendChild(o);
        });
        sel.dataset.type = 'choice';
        sel.addEventListener('change', validateRaceChoices);
        comboSel.parentNode.appendChild(sel);
        pendingRaceChoices.alterations.minor.push(sel);
      }
      for (let i = 0; i < (combo.major || 0); i++) {
        const sel = document.createElement('select');
        sel.innerHTML = `<option value=''>${t('select')}</option>`;
        (currentRaceData.majorAlterations || []).forEach((opt) => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          sel.appendChild(o);
        });
        sel.dataset.type = 'choice';
        sel.addEventListener('change', validateRaceChoices);
        comboSel.parentNode.appendChild(sel);
        pendingRaceChoices.alterations.major.push(sel);
      }
      validateRaceChoices();
    }
    comboSel.addEventListener('change', renderAlterSelections);
    alterContent.appendChild(comboSel);
    pendingRaceChoices.alterations.combo = comboSel;
    accordion.appendChild(
      createAccordionItem('Alterations', alterContent, true)
    );
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
      if (spellEntry) {
        if (spellEntry.description)
          abilityContent.appendChild(createElement('p', spellEntry.description));
        appendEntries(abilityContent, spellEntry.entries);
        usedEntries.add(spellEntry.name);
        spellEntryUsed = true;
      }
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
      if (spellEntry && !spellEntryUsed) {
        if (spellEntry.description)
          spellContent.appendChild(createElement('p', spellEntry.description));
        appendEntries(spellContent, spellEntry.entries);
        usedEntries.add(spellEntry.name);
        spellEntryUsed = true;
      }

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
  Object.values(entryMap).forEach(e => {
    if (!e.name || usedEntries.has(e.name)) return;
    const body = document.createElement('div');
    if (e.description) body.appendChild(createElement('p', e.description));
    appendEntries(body, e.entries);
    accordion.appendChild(createAccordionItem(e.name, body));
  });
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
    let sz;
    if (Array.isArray(currentRaceData.size)) {
      sz = pendingRaceChoices.size?.value || currentRaceData.size[0];
    } else {
      sz = currentRaceData.size;
    }
    CharacterState.system.traits.size =
      sizeMap[sz] || CharacterState.system.traits.size;
    CharacterState.raceChoices.size = sizeMap[sz] || '';
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
  pendingRaceChoices.skills.forEach((sel) => {
    const repl = addUniqueProficiency('skills', sel.value, container);
    if (repl) {
      repl.dataset.proftype = 'skills';
      replacements.push(repl);
    }
    if (!CharacterState.system.skills.includes(sel.value))
      CharacterState.system.skills.push(sel.value);
    CharacterState.raceChoices.skills =
      CharacterState.raceChoices.skills || [];
    CharacterState.raceChoices.skills.push(sel.value);
    sel.disabled = true;
  });
  if (currentRaceData.toolProficiencies) {
    currentRaceData.toolProficiencies.forEach((obj) => {
      for (const k in obj)
        if (k !== 'any' && k !== 'choose' && obj[k]) {
          const val = capitalize(k);
          const sel = addUniqueProficiency('tools', val, container);
          if (sel) {
            sel.dataset.proftype = 'tools';
            replacements.push(sel);
          } else {
            CharacterState.raceChoices.tools =
              CharacterState.raceChoices.tools || [];
            CharacterState.raceChoices.tools.push(val);
          }
        }
    });
  }
  pendingRaceChoices.tools.forEach((sel) => {
    const repl = addUniqueProficiency('tools', sel.value, container);
    if (repl) {
      repl.dataset.proftype = 'tools';
      replacements.push(repl);
    }
    if (!CharacterState.system.tools.includes(sel.value))
      CharacterState.system.tools.push(sel.value);
    CharacterState.raceChoices.tools =
      CharacterState.raceChoices.tools || [];
    CharacterState.raceChoices.tools.push(sel.value);
    sel.disabled = true;
  });
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
  if (
    pendingRaceChoices.alterations.minor.length ||
    pendingRaceChoices.alterations.major.length
  ) {
    CharacterState.raceChoices.alterations = { minor: [], major: [] };
    pendingRaceChoices.alterations.minor.forEach((sel) => {
      CharacterState.raceChoices.alterations.minor.push(sel.value);
      sel.disabled = true;
    });
    pendingRaceChoices.alterations.major.forEach((sel) => {
      CharacterState.raceChoices.alterations.major.push(sel.value);
      sel.disabled = true;
    });
    if (pendingRaceChoices.alterations.combo)
      pendingRaceChoices.alterations.combo.disabled = true;
    const chosen = [
      ...CharacterState.raceChoices.alterations.minor,
      ...CharacterState.raceChoices.alterations.major,
    ];
    const p = document.createElement('p');
    p.textContent = `Alterations: ${chosen.join(', ')}`;
    container.appendChild(p);
  }
  if (pendingRaceChoices.size) {
    pendingRaceChoices.size.disabled = true;
  }

  pendingRaceChoices.skills = [];
  pendingRaceChoices.languages = [];
  pendingRaceChoices.spells = [];
  pendingRaceChoices.abilities = [];
  pendingRaceChoices.tools = [];
  pendingRaceChoices.size = null;
  pendingRaceChoices.alterations = { combo: null, minor: [], major: [] };
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
      CharacterState.system.traits.size = 'med';
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
      CharacterState.raceChoices.size = '';
      CharacterState.raceChoices.alterations = {};
    }
    selectedBaseRace = '';
    currentRaceData = null;
    pendingRaceChoices.subrace = '';
    pendingRaceChoices.skills = [];
    pendingRaceChoices.languages = [];
    pendingRaceChoices.spells = [];
    pendingRaceChoices.abilities = [];
    pendingRaceChoices.tools = [];
    pendingRaceChoices.size = null;
    pendingRaceChoices.alterations = { combo: null, minor: [], major: [] };
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
