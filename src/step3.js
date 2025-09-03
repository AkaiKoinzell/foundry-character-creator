import {
  DATA,
  CharacterState,
  fetchJsonWithRetry,
  loadRaces,
  logCharacterState,
  loadSpells
} from './data.js';
import { refreshBaseState, rebuildFromClasses } from './step2.js';
import { updateChoiceSelectOptions, filterDuplicateOptions } from './choice-select-helpers.js';
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
  markIncomplete,
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
  weapons: [],
  size: null,
  resist: null,
  alterations: { combo: null, minor: [], major: [] },
};

export function resetPendingRaceChoices() {
  pendingRaceChoices.subrace = '';
  pendingRaceChoices.skills = [];
  pendingRaceChoices.languages = [];
  pendingRaceChoices.spells = [];
  pendingRaceChoices.abilities = [];
  pendingRaceChoices.tools = [];
  pendingRaceChoices.weapons = [];
  pendingRaceChoices.size = null;
  pendingRaceChoices.resist = null;
  pendingRaceChoices.alterations = { combo: null, minor: [], major: [] };
}

let raceRenderSeq = 0;

function slugify(name = '') {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const choiceAccordions = {
  size: null,
  skills: null,
  languages: null,
  spells: null,
  abilities: null,
  tools: null,
  weapons: null,
  resist: null,
  alterations: null,
};

function validateRaceChoices() {
  const choiceSelects = [
    ...pendingRaceChoices.skills,
    ...pendingRaceChoices.languages,
    ...pendingRaceChoices.spells,
    ...pendingRaceChoices.abilities,
    ...pendingRaceChoices.tools,
    ...pendingRaceChoices.weapons,
    ...(pendingRaceChoices.alterations?.minor || []),
    ...(pendingRaceChoices.alterations?.major || []),
  ];
  const allSelects = [...choiceSelects];
  if (pendingRaceChoices.size) allSelects.push(pendingRaceChoices.size);
  if (pendingRaceChoices.resist) allSelects.push(pendingRaceChoices.resist);
  if (pendingRaceChoices.alterations?.combo)
    allSelects.push(pendingRaceChoices.alterations.combo);

  allSelects.forEach((sel) => sel.removeAttribute('title'));

  const missing = allSelects.filter((s) => !s.value);
  if (CharacterState.showHelp) {
    missing.forEach((s) => {
      s.title = t('selectionRequired');
    });
  }

  const isGroupValid = (arr) => arr.length === 0 || arr.every((s) => s.value);

  const skillValid = isGroupValid(pendingRaceChoices.skills);
  markIncomplete(choiceAccordions.skills, skillValid);

  const langValid = isGroupValid(pendingRaceChoices.languages);
  markIncomplete(choiceAccordions.languages, langValid);

  const spellValid = isGroupValid(pendingRaceChoices.spells);
  markIncomplete(choiceAccordions.spells, spellValid);

  const abilityValid = isGroupValid(pendingRaceChoices.abilities);
  markIncomplete(choiceAccordions.abilities, abilityValid);

  const toolValid = isGroupValid(pendingRaceChoices.tools);
  markIncomplete(choiceAccordions.tools, toolValid);

  const weaponValid = isGroupValid(pendingRaceChoices.weapons);
  markIncomplete(choiceAccordions.weapons, weaponValid);

  const sizeValid =
    !pendingRaceChoices.size || pendingRaceChoices.size.value;
  markIncomplete(choiceAccordions.size, sizeValid);

  const resistValid =
    !pendingRaceChoices.resist || pendingRaceChoices.resist.value;
  markIncomplete(choiceAccordions.resist, resistValid);

  const altComboValid =
    !pendingRaceChoices.alterations.combo ||
    pendingRaceChoices.alterations.combo.value;
  const altMinorValid = pendingRaceChoices.alterations.minor.every((s) => s.value);
  const altMajorValid = pendingRaceChoices.alterations.major.every((s) => s.value);
  const altValid = altComboValid && altMinorValid && altMajorValid;
  markIncomplete(choiceAccordions.alterations, altValid);

  const valid =
    skillValid &&
    langValid &&
    spellValid &&
    abilityValid &&
    toolValid &&
    weaponValid &&
    sizeValid &&
    resistValid &&
    altValid &&
    !!pendingRaceChoices.subrace;

  main.setCurrentStepComplete?.(valid);
  return valid;
}

function createRaceCard(
  race,
  onSelect,
  displayName = race.name,
  imageUrl = null
) {
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
    t('details') || 'Details',
    null,
    imageUrl
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
    const slug = slugify(base);
    const card = createRaceCard(
      race,
      () => selectBaseRace(base),
      `${base} (${subs.length})`,
      `assets/races/${slug}.png`
    );
    if (seq !== raceRenderSeq) return;
    container.appendChild(card);
  }
}

async function selectBaseRace(base) {
  selectedBaseRace = base;
  currentRaceData = null;
  resetPendingRaceChoices();
  for (const k in choiceAccordions) choiceAccordions[k] = null;
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
    const slug = slugify(race.name);
    const card = createRaceCard(
      race,
      async () => {
        currentRaceData = race;
        pendingRaceChoices.subrace = race.name;
        await renderSelectedRace();
        container.classList.add('hidden');
        document.getElementById('raceSearch')?.classList.add('hidden');
        const features = document.getElementById('raceFeatures');
        features?.classList.remove('hidden');
        validateRaceChoices();
      },
      race.name,
      `assets/races/${slug}.png`
    );
    if (seq !== raceRenderSeq) return;
    container.appendChild(card);
  }
}
async function renderSelectedRace() {
  const accordion = document.getElementById('raceFeatures');
  if (!currentRaceData || !accordion) return;
  accordion.innerHTML = '';
  resetPendingRaceChoices();

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
    const acc = createAccordionItem(t('size'), sizeContent, true);
    acc.classList.add('needs-selection');
    accordion.appendChild(acc);
    choiceAccordions.size = acc;
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
        sel.addEventListener('change', () => {
          updateChoiceSelectOptions(pendingRaceChoices.skills, 'skills');
          validateRaceChoices();
        });
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
          sel.addEventListener('change', () => {
            updateChoiceSelectOptions(pendingRaceChoices.skills, 'skills');
            validateRaceChoices();
          });
          skillContent.appendChild(sel);
          pendingRaceChoices.skills.push(sel);
        }
      });
      updateChoiceSelectOptions(pendingRaceChoices.skills, 'skills');
      const acc = createAccordionItem(
        `${t('skills')}`,
        skillContent,
        pendingRaceChoices.skills.length > 0
      );
      if (pendingRaceChoices.skills.length > 0) acc.classList.add('needs-selection');
      accordion.appendChild(acc);
      choiceAccordions.skills = acc;
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
        sel.addEventListener('change', () => {
          updateChoiceSelectOptions(pendingRaceChoices.tools, 'tools');
          validateRaceChoices();
        });
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
          sel.addEventListener('change', () => {
            updateChoiceSelectOptions(pendingRaceChoices.tools, 'tools');
            validateRaceChoices();
          });
          toolContent.appendChild(sel);
          pendingRaceChoices.tools.push(sel);
        }
      });
      updateChoiceSelectOptions(pendingRaceChoices.tools, 'tools');
      const acc = createAccordionItem(
        `${t('tools')}`,
        toolContent,
        pendingRaceChoices.tools.length > 0
      );
      if (pendingRaceChoices.tools.length > 0) acc.classList.add('needs-selection');
      accordion.appendChild(acc);
      choiceAccordions.tools = acc;
    }
  }
  if (currentRaceData.weaponProficiencies) {
    const raceWeapons = [];
    const chooseGroups = [];
    currentRaceData.weaponProficiencies.forEach((obj) => {
      if (obj.choose) {
        const from = obj.choose.from || obj.choose.options || [];
        const count = obj.choose.count || obj.choose.amount || 1;
        const fromFilter = obj.choose.fromFilter;
        chooseGroups.push({ from, fromFilter, count });
      } else {
        for (const k in obj) if (obj[k]) raceWeapons.push(capitalize(k.split('|')[0]));
      }
    });
    if (raceWeapons.length || chooseGroups.length) {
      const weaponContent = document.createElement('div');
      if (raceWeapons.length) {
        weaponContent.appendChild(createElement('p', raceWeapons.join(', ')));
      }
      const known = new Set([...(CharacterState.system.weapons || []), ...raceWeapons]);
      function getWeaponsFromFilter(filter) {
        if (!filter) return [];
        const items = Array.isArray(DATA.equipment) ? DATA.equipment : [];
        const groups = filter.split('|').map((g) => g.trim()).filter(Boolean);
        const matches = items.filter((item) =>
          groups.some((grp) => {
            const [key, vals] = grp.split('=');
            if (!key || vals === undefined) return false;
            const values = vals.split(';').map((v) => v.trim().toLowerCase());
            const itemVal = item[key.trim()];
            if (Array.isArray(itemVal)) {
              return itemVal
                .map((v) => String(v).toLowerCase())
                .some((v) => values.includes(v));
            }
            return values.includes(String(itemVal).toLowerCase());
          })
        );
        const seen = new Set();
        const names = [];
        matches.forEach((m) => {
          const nm = m.name || m;
          if (!seen.has(nm)) {
            seen.add(nm);
            names.push(nm);
          }
        });
        return names.sort();
      }
      chooseGroups.forEach((grp) => {
        let opts = (grp.from || []).map((s) => capitalize(s.split('|')[0]));
        if (grp.fromFilter) opts = getWeaponsFromFilter(grp.fromFilter);
        const count = grp.count || 1;
        for (let i = 0; i < count; i++) {
          const sel = document.createElement('select');
          sel.innerHTML = `<option value=''>${t('select')}</option>`;
          (opts || [])
            .filter((opt) => !known.has(opt))
            .forEach((opt) => {
              const o = document.createElement('option');
              o.value = opt;
              o.textContent = opt;
              sel.appendChild(o);
            });
          sel.dataset.type = 'choice';
          sel.dataset.choice = 'weapon';
          sel.addEventListener('change', () => {
            updateChoiceSelectOptions(pendingRaceChoices.weapons, 'weapons');
            validateRaceChoices();
          });
          weaponContent.appendChild(sel);
          pendingRaceChoices.weapons.push(sel);
        }
      });
      updateChoiceSelectOptions(pendingRaceChoices.weapons, 'weapons');
      const acc = createAccordionItem(
        t('weapons'),
        weaponContent,
        pendingRaceChoices.weapons.length > 0
      );
      if (pendingRaceChoices.weapons.length > 0) acc.classList.add('needs-selection');
      accordion.appendChild(acc);
      choiceAccordions.weapons = acc;
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
          sel.addEventListener('change', () => {
            updateChoiceSelectOptions(pendingRaceChoices.languages, 'languages');
            validateRaceChoices();
          });
          langContent.appendChild(sel);
          pendingRaceChoices.languages.push(sel);
        }
      }
      updateChoiceSelectOptions(pendingRaceChoices.languages, 'languages');
      const acc = createAccordionItem(t('languages'), langContent, pendingLang > 0);
      if (pendingLang > 0) acc.classList.add('needs-selection');
      accordion.appendChild(acc);
      choiceAccordions.languages = acc;
    }
  }

  if (Array.isArray(currentRaceData.resist) && currentRaceData.resist.length) {
    const fixed = [];
    let chooseOpts = null;
    currentRaceData.resist.forEach((r) => {
      if (typeof r === 'string') fixed.push(capitalize(r));
      else if (r.choose) chooseOpts = r.choose.from || [];
    });
    if (fixed.length || chooseOpts) {
      const resistContent = document.createElement('div');
      const resistEntry = Object.values(entryMap).find(
        (e) => e.name && /resist/i.test(e.name)
      );
      if (resistEntry) {
        if (resistEntry.description)
          resistContent.appendChild(createElement('p', resistEntry.description));
        appendEntries(resistContent, resistEntry.entries);
        usedEntries.add(resistEntry.name);
      }
      if (fixed.length) {
        resistContent.appendChild(createElement('p', fixed.join(', ')));
      }
      if (Array.isArray(chooseOpts) && chooseOpts.length) {
        const sel = document.createElement('select');
        sel.innerHTML = `<option value=''>${t('select')}</option>`;
        chooseOpts.forEach((opt) => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = capitalize(opt);
          sel.appendChild(o);
        });
        sel.dataset.type = 'choice';
        sel.dataset.choice = 'resist';
        sel.addEventListener('change', validateRaceChoices);
        resistContent.appendChild(sel);
        pendingRaceChoices.resist = sel;
      }
      const acc = createAccordionItem(
        t('damageResist'),
        resistContent,
        !!pendingRaceChoices.resist
      );
      if (pendingRaceChoices.resist) acc.classList.add('needs-selection');
      accordion.appendChild(acc);
      choiceAccordions.resist = acc;
    }
  }

  if (
    currentRaceData.minorAlterations?.options?.length ||
    currentRaceData.majorAlterations?.options?.length
  ) {
    const alterContent = document.createElement('div');
    const comboSel = document.createElement('select');
    comboSel.innerHTML = `<option value=''>${t('select')}</option>`;
    const minorAllowed = currentRaceData.minorAlterations?.allowed || [];
    const majorAllowed = currentRaceData.majorAlterations?.allowed || [];
    const combos = [];
    const len = Math.max(minorAllowed.length, majorAllowed.length);
    for (let i = 0; i < len; i++) {
      combos.push({
        minor: minorAllowed[i] || 0,
        major: majorAllowed[i] || 0,
      });
    }
    combos.forEach((combo, idx) => {
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
      const combo = combos[comboSel.value];
      if (!combo) {
        validateRaceChoices();
        return;
      }

      function updateAlterOptionLists() {
        const chosen = [
          ...pendingRaceChoices.alterations.minor,
          ...pendingRaceChoices.alterations.major,
        ]
          .map((s) => s.value)
          .filter(Boolean);

        const rebuild = (sel, opts) => {
          const current = sel.value;
          sel.innerHTML = `<option value=''>${t('select')}</option>`;
          (opts || []).forEach((opt) => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            if (chosen.includes(opt) && opt !== current) o.disabled = true;
            sel.appendChild(o);
          });
          if (current && (opts || []).includes(current)) sel.value = current;
        };

        pendingRaceChoices.alterations.minor.forEach((sel) =>
          rebuild(sel, currentRaceData.minorAlterations?.options || [])
        );
        pendingRaceChoices.alterations.major.forEach((sel) =>
          rebuild(sel, currentRaceData.majorAlterations?.options || [])
        );
      }

      for (let i = 0; i < (combo.minor || 0); i++) {
        const sel = document.createElement('select');
        sel.innerHTML = `<option value=''>${t('select')}</option>`;
        sel.dataset.type = 'choice';
        sel.addEventListener('change', () => {
          updateAlterOptionLists();
          validateRaceChoices();
        });
        comboSel.parentNode.appendChild(sel);
        pendingRaceChoices.alterations.minor.push(sel);
      }
      for (let i = 0; i < (combo.major || 0); i++) {
        const sel = document.createElement('select');
        sel.innerHTML = `<option value=''>${t('select')}</option>`;
        sel.dataset.type = 'choice';
        sel.addEventListener('change', () => {
          updateAlterOptionLists();
          validateRaceChoices();
        });
        comboSel.parentNode.appendChild(sel);
        pendingRaceChoices.alterations.major.push(sel);
      }
      updateAlterOptionLists();
      validateRaceChoices();
    }
    comboSel.addEventListener('change', renderAlterSelections);
    alterContent.appendChild(comboSel);
    pendingRaceChoices.alterations.combo = comboSel;
    const acc = createAccordionItem('Alterations', alterContent, true);
    acc.classList.add('needs-selection');
    accordion.appendChild(acc);
    choiceAccordions.alterations = acc;
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
      const acc = createAccordionItem(t('spellAbility'), abilityContent, true);
      acc.classList.add('needs-selection');
      accordion.appendChild(acc);
      choiceAccordions.abilities = acc;
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
            filterDuplicateOptions(
              pendingRaceChoices.spells,
              [
                ...(CharacterState.system.spells?.cantrips || []),
                ...(CharacterState.raceChoices?.spells || []),
              ],
            );
            validateRaceChoices();
          });
          sel.innerHTML = `<option value=''>${t('select')}</option>`;
          opts.forEach((sp) => {
            const o = document.createElement('option');
            o.value = sp;
            o.textContent = sp;
            sel.appendChild(o);
          });
          spellContent.appendChild(sel);
          pendingRaceChoices.spells.push(sel);
        }
      });
      filterDuplicateOptions(
        pendingRaceChoices.spells,
        [
          ...(CharacterState.system.spells?.cantrips || []),
          ...(CharacterState.raceChoices?.spells || []),
        ],
      );
      const acc = createAccordionItem(t('spells'), spellContent, true);
      acc.classList.add('needs-selection');
      accordion.appendChild(acc);
      choiceAccordions.spells = acc;
    }
  }

  const traitsDiv = document.createElement('div');
  traitsDiv.id = 'raceTraits';
  Object.values(entryMap).forEach(e => {
    if (!e.name || usedEntries.has(e.name)) return;
    const body = document.createElement('div');
    if (e.description)
      body.appendChild(createElement('p', e.description));
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
  CharacterState.raceFeatures = (currentRaceData.entries || [])
    .filter((e) => typeof e === 'object' && e.name)
    .map((e) => e.name);

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
  const weaponSummary = [];
  if (currentRaceData.skillProficiencies) {
    currentRaceData.skillProficiencies.forEach((obj) => {
      for (const k in obj) {
        if (k === 'choose' || k === 'any' || !obj[k]) continue;
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
          const sel = addUniqueProficiency(
            'tools',
            val,
            container,
            'Race'
          );
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
    const repl = addUniqueProficiency('tools', sel.value, container, 'Race');
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
  if (currentRaceData.weaponProficiencies) {
    currentRaceData.weaponProficiencies.forEach((obj) => {
      if (obj.choose) return;
      for (const k in obj)
        if (obj[k]) {
          const val = capitalize(k.split('|')[0]);
          const sel = addUniqueProficiency('weapons', val, container);
          if (sel) {
            sel.dataset.proftype = 'weapons';
            replacements.push(sel);
          } else {
            CharacterState.raceChoices.weapons =
              CharacterState.raceChoices.weapons || [];
            CharacterState.raceChoices.weapons.push(val);
            weaponSummary.push(val);
          }
        }
    });
  }
  pendingRaceChoices.weapons.forEach((sel) => {
    const repl = addUniqueProficiency('weapons', sel.value, container);
    if (repl) {
      repl.dataset.proftype = 'weapons';
      replacements.push(repl);
    }
    if (!CharacterState.system.weapons.includes(sel.value))
      CharacterState.system.weapons.push(sel.value);
    CharacterState.raceChoices.weapons =
      CharacterState.raceChoices.weapons || [];
    CharacterState.raceChoices.weapons.push(sel.value);
    weaponSummary.push(sel.value);
    sel.disabled = true;
  });
  if (weaponSummary.length) {
    const p = document.createElement('p');
    p.textContent = `Weapons: ${weaponSummary.join(', ')}`;
    container.appendChild(p);
  }
  if (currentRaceData.languageProficiencies) {
    currentRaceData.languageProficiencies.forEach((obj) => {
      for (const k in obj)
        if (k !== 'anyStandard' && obj[k]) {
          const val = capitalize(k);
          const sel = addUniqueProficiency(
            'languages',
            val,
            container,
            'Race'
          );
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
    const repl = addUniqueProficiency(
      'languages',
      sel.value,
      container,
      'Race'
    );
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
  if (Array.isArray(currentRaceData.resist)) {
    const resists = [];
    currentRaceData.resist.forEach((r) => {
      if (typeof r === 'string') resists.push(r);
    });
    if (pendingRaceChoices.resist && pendingRaceChoices.resist.value) {
      resists.push(pendingRaceChoices.resist.value);
      CharacterState.raceChoices.resist = pendingRaceChoices.resist.value;
      pendingRaceChoices.resist.disabled = true;
    } else {
      CharacterState.raceChoices.resist = '';
    }
    if (resists.length) {
      const set = new Set(CharacterState.system.traits.damageResist || []);
      resists.forEach((r) => set.add(r));
      CharacterState.system.traits.damageResist = Array.from(set);
    }
  }
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
    const featureContainer = pendingRaceChoices.alterations.combo
      ? pendingRaceChoices.alterations.combo.parentNode
      : null;
    if (featureContainer) {
      const pf = document.createElement('p');
      pf.textContent = `Alterations: ${chosen.join(', ')}`;
      featureContainer.appendChild(pf);
    }
  }
  if (pendingRaceChoices.size) {
    pendingRaceChoices.size.disabled = true;
  }
  resetPendingRaceChoices();
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
  main.invalidateStep(4);
  main.invalidateStep(5);
  main.invalidateStep(6);
  main.invalidateStepsFrom(4);
  return true;
}

export async function loadStep3(force = false) {
  if (force) resetPendingRaceChoices();
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
      (CharacterState.raceChoices.weapons || []).forEach((w) => {
        const idx = CharacterState.system.weapons.indexOf(w);
        if (idx >= 0) CharacterState.system.weapons.splice(idx, 1);
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
      CharacterState.raceChoices.weapons = [];
      CharacterState.raceChoices.languages = [];
      CharacterState.raceChoices.movement = {};
      CharacterState.raceChoices.spells = [];
      CharacterState.raceChoices.spellAbility = '';
      CharacterState.raceChoices.size = '';
      CharacterState.raceFeatures = [];
      const removeRes = [];
      (currentRaceData.resist || []).forEach((r) => {
        if (typeof r === 'string') removeRes.push(r);
      });
      if (CharacterState.raceChoices.resist)
        removeRes.push(CharacterState.raceChoices.resist);
      CharacterState.system.traits.damageResist =
        (CharacterState.system.traits.damageResist || []).filter(
          (r) => !removeRes.includes(r)
        );
      CharacterState.raceChoices.resist = '';
      CharacterState.raceChoices.alterations = {};
    }
    selectedBaseRace = '';
    currentRaceData = null;
    resetPendingRaceChoices();
    if (CharacterState.system?.details) {
      CharacterState.system.details.race = '';
      CharacterState.system.details.subrace = '';
    }
    refreshBaseState();
    rebuildFromClasses();
    main.invalidateStep(4);
    main.invalidateStep(5);
    main.invalidateStep(6);
    main.invalidateStepsFrom(4);
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
