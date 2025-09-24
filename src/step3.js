import {
  DATA,
  CharacterState,
  fetchJsonWithRetry,
  loadRaces,
  logCharacterState,
  loadSpells
} from './data.js';
import { loadEquipmentData } from './step5.js';
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
} from './ui-helpers.js';
import { inlineWarning } from './validation.js';

let selectedBaseRace = '';
let currentRaceData = null;
let preRaceState = null;
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
  variants: [],
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
  pendingRaceChoices.variants = [];
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
  const check = (arr, container) =>
    inlineWarning(container, arr.length === 0 || arr.every((s) => s.value), arr);

  const skillValid = check(pendingRaceChoices.skills, choiceAccordions.skills);
  const langValid = check(pendingRaceChoices.languages, choiceAccordions.languages);
  const spellValid = check(pendingRaceChoices.spells, choiceAccordions.spells);
  const abilityValid = check(pendingRaceChoices.abilities, choiceAccordions.abilities);
  const toolValid = check(pendingRaceChoices.tools, choiceAccordions.tools);
  const weaponValid = check(pendingRaceChoices.weapons, choiceAccordions.weapons);

  const sizeValid = inlineWarning(
    choiceAccordions.size,
    !pendingRaceChoices.size || pendingRaceChoices.size.value,
    pendingRaceChoices.size
  );

  const resistValid = inlineWarning(
    choiceAccordions.resist,
    !pendingRaceChoices.resist || pendingRaceChoices.resist.value,
    pendingRaceChoices.resist
  );

  const altFields = [
    pendingRaceChoices.alterations.combo,
    ...pendingRaceChoices.alterations.minor,
    ...pendingRaceChoices.alterations.major,
  ].filter(Boolean);
  const altValid =
    (!pendingRaceChoices.alterations.combo ||
      pendingRaceChoices.alterations.combo.value) &&
    pendingRaceChoices.alterations.minor.every((s) => s.value) &&
    pendingRaceChoices.alterations.major.every((s) => s.value);
  inlineWarning(choiceAccordions.alterations, altValid, altFields);

  const variantValid = pendingRaceChoices.variants.every((v) => {
    const chosen = v.radios.some((r) => r.checked);
    inlineWarning(v.container, chosen, v.radios);
    return chosen;
  });

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
    variantValid &&
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
  pendingRaceChoices.subrace = currentRaceData.name;

  const header = document.createElement('h3');
  header.textContent = currentRaceData.name;
  accordion.appendChild(header);

  const entryMap = {};
  const entryList = (currentRaceData.entries || []).filter(
    (e) => e && typeof e === 'object'
  );
  entryList.forEach((e) => {
    if (e.name) entryMap[e.name] = e;
  });
  const usedEntryNames = new Set();
  const entryContainsText = (entry, regex) => {
    const queue = Array.isArray(entry.entries) ? [...entry.entries] : [];
    while (queue.length) {
      const sub = queue.shift();
      if (typeof sub === 'string') {
        if (regex.test(sub)) return true;
      } else if (sub && typeof sub === 'object') {
        if (sub.name && regex.test(sub.name)) return true;
        if (Array.isArray(sub.entries)) queue.push(...sub.entries);
      }
    }
    return false;
  };
  const entryContainsAllText = (entry, patterns) =>
    patterns.every((pat) => entryContainsText(entry, pat));
  const entryNameMatches = (entry, regex) =>
    Boolean(entry.name && regex.test(entry.name));
  const consumeEntry = (predicate) => {
    const entry = entryList.find(
      (e) => predicate(e) && (!e.name || !usedEntryNames.has(e.name))
    );
    if (entry && entry.name) usedEntryNames.add(entry.name);
    return entry || null;
  };
  const spellEntry = Object.values(entryMap).find(e =>
    Array.isArray(e.entries) &&
    e.entries.some(sub => typeof sub === 'string' && /@spell|spell/i.test(sub))
  );
  let spellEntryUsed = false;

  (currentRaceData.entries || []).forEach((entry) => {
    if (!entry.data?.overwrite || !Array.isArray(entry.entries)) return;
    const variantContent = document.createElement('div');
    const group = [];
    const dataMap = {};
    const optMap = {};
    (entry.entries || []).forEach((opt, idx) => {
      const id = `var-${slugify(opt.name)}-${idx}`;
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `var-${slugify(entry.data.overwrite)}`;
      radio.id = id;
      radio.value = opt.name;
      radio.dataset.type = 'choice';
      radio.addEventListener('change', () => {
        const variant = dataMap[radio.value];
        if (variant?.skillProficiencies === null) {
          pendingRaceChoices.skills = [];
          choiceAccordions.skills?.remove();
          choiceAccordions.skills = null;
        }
        validateRaceChoices();
      });
      label.appendChild(radio);
      label.appendChild(document.createTextNode(opt.name));
      variantContent.appendChild(label);
      if (opt.entries) appendEntries(variantContent, opt.entries);
      group.push(radio);
      optMap[opt.name] = opt;
      const ver = (currentRaceData._versions || []).find((v) =>
        v.name.split(';').pop().trim() === opt.name
      );
      if (ver) dataMap[opt.name] = ver;
    });
    const acc = createAccordionItem(entry.name, variantContent, true);
    acc.classList.add('needs-selection');
    accordion.appendChild(acc);
    pendingRaceChoices.variants.push({ radios: group, dataMap, optMap, container: acc, overwrite: entry.name });
    if (entry.name) usedEntryNames.add(entry.name);
  });

  if (
    Array.isArray(currentRaceData.size) &&
    currentRaceData.size.length > 1
  ) {
    const sizeContent = document.createElement('div');
    const sel = document.createElement('select');
    sel.replaceChildren(new Option(t('select'), ''));
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
    const sizeEntry = consumeEntry((e) => entryNameMatches(e, /^size$/i));
    if (sizeEntry) {
      if (sizeEntry.description)
        sizeContent.appendChild(createElement('p', sizeEntry.description));
      appendEntries(sizeContent, sizeEntry.entries);
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
      const skillEntry = consumeEntry(
        (e) =>
          entryNameMatches(e, /skill/i) ||
          entryContainsAllText(e, [/skill/i, /proficien/i])
      );
      if (skillEntry) {
        if (skillEntry.description)
          skillContent.appendChild(createElement('p', skillEntry.description));
        appendEntries(skillContent, skillEntry.entries);
      }
      if (raceSkills.length) {
        const p = document.createElement('p');
        p.textContent = raceSkills.join(', ');
        skillContent.appendChild(p);
      }
      const known = new Set([...CharacterState.system.skills, ...raceSkills]);
      for (let i = 0; i < pendingAny; i++) {
        const sel = document.createElement('select');
        sel.replaceChildren(new Option(t('select'), ''));
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
          sel.replaceChildren(new Option(t('select'), ''));
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
      const toolEntry = consumeEntry(
        (e) =>
          entryNameMatches(e, /tool|artisan|specialized|maker/i) ||
          entryContainsAllText(e, [/tool/i, /proficien/i])
      );
      if (toolEntry) {
        if (toolEntry.description)
          toolContent.appendChild(createElement('p', toolEntry.description));
        appendEntries(toolContent, toolEntry.entries);
      }
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
        sel.replaceChildren(new Option(t('select'), ''));
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
          sel.replaceChildren(new Option(t('select'), ''));
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
    await loadEquipmentData();
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
      const weaponEntry = consumeEntry(
        (e) =>
          entryNameMatches(e, /weapon|combat/i) ||
          entryContainsAllText(e, [/weapon/i, /proficien/i])
      );
      if (weaponEntry) {
        if (weaponEntry.description)
          weaponContent.appendChild(createElement('p', weaponEntry.description));
        appendEntries(weaponContent, weaponEntry.entries);
      }
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
          sel.replaceChildren(new Option(t('select'), ''));
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
      const langEntry = consumeEntry((e) => entryNameMatches(e, /languages?/i));
      if (langEntry) {
        if (langEntry.description)
          langContent.appendChild(createElement('p', langEntry.description));
        appendEntries(langContent, langEntry.entries);
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
          sel.replaceChildren(new Option(t('select'), ''));
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
      const resistEntry = consumeEntry(
        (e) =>
          entryNameMatches(e, /resist|resil|ancestry/i) ||
          entryContainsText(e, /resist/i)
      );
      if (resistEntry) {
        if (resistEntry.description)
          resistContent.appendChild(createElement('p', resistEntry.description));
        appendEntries(resistContent, resistEntry.entries);
      }
      if (fixed.length) {
        resistContent.appendChild(createElement('p', fixed.join(', ')));
      }
      if (Array.isArray(chooseOpts) && chooseOpts.length) {
        const sel = document.createElement('select');
        sel.replaceChildren(new Option(t('select'), ''));
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
    comboSel.replaceChildren(new Option(t('select'), ''));
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
          sel.replaceChildren(new Option(t('select'), ''));
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
        sel.replaceChildren(new Option(t('select'), ''));
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
        sel.replaceChildren(new Option(t('select'), ''));
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
        usedEntryNames.add(spellEntry.name);
        spellEntryUsed = true;
      }
      const sel = document.createElement('select');
      sel.replaceChildren(new Option(t('select'), ''));
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
        usedEntryNames.add(spellEntry.name);
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
          sel.replaceChildren(new Option(t('select'), ''));
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
    if (!e.name || usedEntryNames.has(e.name)) return;
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
  details.textContent = '';
  const header = document.createElement('h2');
  header.textContent = race.name;
  details.appendChild(header);
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

  let raceData = JSON.parse(JSON.stringify(currentRaceData));
  let variantInfo = null;
  pendingRaceChoices.variants.forEach((v) => {
    const sel = v.radios.find((r) => r.checked);
    if (sel) {
      variantInfo = {
        version: v.dataMap[sel.value],
        entry: v.optMap[sel.value],
        overwrite: v.overwrite,
      };
      sel.disabled = true;
    }
  });
  if (variantInfo) {
    raceData.entries = (raceData.entries || []).filter(
      (e) => e.name !== variantInfo.overwrite
    );
    if (variantInfo.entry) raceData.entries.push(variantInfo.entry);
    const ver = variantInfo.version || {};
    Object.entries(ver).forEach(([k, val]) => {
      if (['name', 'source', '_mod'].includes(k)) return;
      if (val === null) delete raceData[k];
      else raceData[k] = val;
    });
  }

  const draft = JSON.parse(JSON.stringify(CharacterState));
  draft.raceChoices = {
    spells: [],
    spellAbility: '',
    size: '',
    alterations: {},
    resist: '',
    tools: [],
    weapons: [],
    languages: [],
    skills: [],
    movement: {},
  };
  draft.raceFeatures = [];

  draft.system.details.race = selectedBaseRace;
  draft.system.details.subrace = raceData.name;
  draft.raceFeatures = (raceData.entries || [])
    .filter((e) => typeof e === 'object' && e.name)
    .map((e) => e.name);

  const sizeMap = { T: 'tiny', S: 'sm', M: 'med', L: 'lg', H: 'huge', G: 'grg' };
  if (raceData.size) {
    let sz;
    if (Array.isArray(raceData.size)) {
      sz = pendingRaceChoices.size?.value || raceData.size[0];
    } else {
      sz = raceData.size;
    }
    draft.system.traits.size = sizeMap[sz] || draft.system.traits.size;
    draft.raceChoices.size = sizeMap[sz] || '';
  }

  const move = { ...(draft.system.attributes.movement || {}) };
  const speed = raceData.speed;
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
  draft.system.attributes.movement = {
    ...draft.system.attributes.movement,
    ...move,
  };
  draft.raceChoices.movement = move;

  if (raceData.darkvision)
    draft.system.traits.senses.darkvision = raceData.darkvision;
  if (raceData.traitTags)
    draft.system.traits.traitTags = [...raceData.traitTags];

  const replacements = [];
  const weaponSummary = [];
  if (raceData.skillProficiencies) {
    raceData.skillProficiencies.forEach((obj) => {
      for (const k in obj) {
        if (k === 'choose' || k === 'any' || !obj[k]) continue;
        const val = capitalize(k);
        const sel = addUniqueProficiency('skills', val, container, '', draft);
        if (sel) {
          sel.dataset.proftype = 'skills';
          replacements.push(sel);
        } else {
          draft.raceChoices.skills = draft.raceChoices.skills || [];
          draft.raceChoices.skills.push(val);
        }
      }
    });
  }
  pendingRaceChoices.skills.forEach((sel) => {
    const repl = addUniqueProficiency('skills', sel.value, container, '', draft);
    if (repl) {
      repl.dataset.proftype = 'skills';
      replacements.push(repl);
    }
    if (!draft.system.skills.includes(sel.value)) draft.system.skills.push(sel.value);
    draft.raceChoices.skills = draft.raceChoices.skills || [];
    draft.raceChoices.skills.push(sel.value);
    sel.disabled = true;
  });
  if (raceData.toolProficiencies) {
    raceData.toolProficiencies.forEach((obj) => {
      for (const k in obj)
        if (k !== 'any' && k !== 'choose' && obj[k]) {
          const val = capitalize(k);
          const sel = addUniqueProficiency('tools', val, container, 'Race', draft);
          if (sel) {
            sel.dataset.proftype = 'tools';
            replacements.push(sel);
          } else {
            draft.raceChoices.tools = draft.raceChoices.tools || [];
            draft.raceChoices.tools.push(val);
          }
        }
    });
  }
  pendingRaceChoices.tools.forEach((sel) => {
    const repl = addUniqueProficiency('tools', sel.value, container, 'Race', draft);
    if (repl) {
      repl.dataset.proftype = 'tools';
      replacements.push(repl);
    }
    if (!draft.system.tools.includes(sel.value)) draft.system.tools.push(sel.value);
    draft.raceChoices.tools = draft.raceChoices.tools || [];
    draft.raceChoices.tools.push(sel.value);
    sel.disabled = true;
  });
  if (raceData.weaponProficiencies) {
    raceData.weaponProficiencies.forEach((obj) => {
      if (obj.choose) return;
      for (const k in obj)
        if (obj[k]) {
          const val = capitalize(k.split('|')[0]);
          const sel = addUniqueProficiency('weapons', val, container, '', draft);
          if (sel) {
            sel.dataset.proftype = 'weapons';
            replacements.push(sel);
          } else {
            draft.raceChoices.weapons = draft.raceChoices.weapons || [];
            draft.raceChoices.weapons.push(val);
            weaponSummary.push(val);
          }
        }
    });
  }
  pendingRaceChoices.weapons.forEach((sel) => {
    const repl = addUniqueProficiency('weapons', sel.value, container, '', draft);
    if (repl) {
      repl.dataset.proftype = 'weapons';
      replacements.push(repl);
    }
    if (!draft.system.weapons.includes(sel.value)) draft.system.weapons.push(sel.value);
    draft.raceChoices.weapons = draft.raceChoices.weapons || [];
    draft.raceChoices.weapons.push(sel.value);
    weaponSummary.push(sel.value);
    sel.disabled = true;
  });
  if (weaponSummary.length) {
    const p = document.createElement('p');
    p.textContent = `Weapons: ${weaponSummary.join(', ')}`;
    container.appendChild(p);
  }
  if (raceData.languageProficiencies) {
    raceData.languageProficiencies.forEach((obj) => {
      for (const k in obj)
        if (k !== 'anyStandard' && obj[k]) {
          const val = capitalize(k);
          const sel = addUniqueProficiency('languages', val, container, 'Race', draft);
          if (sel) {
            sel.dataset.proftype = 'languages';
            replacements.push(sel);
          } else {
            draft.raceChoices.languages = draft.raceChoices.languages || [];
            draft.raceChoices.languages.push(val);
          }
        }
    });
  }
  pendingRaceChoices.languages.forEach((sel) => {
    const repl = addUniqueProficiency('languages', sel.value, container, 'Race', draft);
    if (repl) {
      repl.dataset.proftype = 'languages';
      replacements.push(repl);
    }
    if (!draft.system.traits.languages.value.includes(sel.value))
      draft.system.traits.languages.value.push(sel.value);
    draft.raceChoices.languages = draft.raceChoices.languages || [];
    draft.raceChoices.languages.push(sel.value);
    sel.disabled = true;
  });
  if (Array.isArray(raceData.resist)) {
    const resists = [];
    raceData.resist.forEach((r) => {
      if (typeof r === 'string') resists.push(r);
    });
    if (pendingRaceChoices.resist && pendingRaceChoices.resist.value) {
      resists.push(pendingRaceChoices.resist.value);
      draft.raceChoices.resist = pendingRaceChoices.resist.value;
      pendingRaceChoices.resist.disabled = true;
    } else {
      draft.raceChoices.resist = '';
    }
    if (resists.length) {
      const set = new Set(draft.system.traits.damageResist || []);
      resists.forEach((r) => set.add(r));
      draft.system.traits.damageResist = Array.from(set);
    }
  }
  pendingRaceChoices.spells.forEach((sel) => {
    const repl = addUniqueProficiency('cantrips', sel.value, container, '', draft);
    if (repl) replacements.push(repl);
    draft.raceChoices.spells.push(sel.value);
    sel.disabled = true;
  });
  pendingRaceChoices.abilities.forEach((sel) => {
    draft.raceChoices.spellAbility = sel.value;
    sel.disabled = true;
  });
  if (
    pendingRaceChoices.alterations.minor.length ||
    pendingRaceChoices.alterations.major.length
  ) {
    draft.raceChoices.alterations = { minor: [], major: [] };
    pendingRaceChoices.alterations.minor.forEach((sel) => {
      draft.raceChoices.alterations.minor.push(sel.value);
      sel.disabled = true;
    });
    pendingRaceChoices.alterations.major.forEach((sel) => {
      draft.raceChoices.alterations.major.push(sel.value);
      sel.disabled = true;
    });
    if (pendingRaceChoices.alterations.combo)
      pendingRaceChoices.alterations.combo.disabled = true;
    const chosen = [
      ...draft.raceChoices.alterations.minor,
      ...draft.raceChoices.alterations.major,
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

  preRaceState = JSON.parse(JSON.stringify(CharacterState));
  Object.assign(CharacterState, draft);
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
  main.invalidateStep(main.TOTAL_STEPS - 1);
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

  let changeBtn = document.getElementById('changeRace');
  if (changeBtn) {
    const newBtn = changeBtn.cloneNode(true);
    changeBtn.parentNode.replaceChild(newBtn, changeBtn);
    changeBtn = newBtn;
    changeBtn.addEventListener('click', async () => {
      selectedBaseRace = '';
      currentRaceData = null;
      resetPendingRaceChoices();
      if (preRaceState) {
        Object.assign(CharacterState, JSON.parse(JSON.stringify(preRaceState)));
        CharacterState.system.attributes.movement =
          CharacterState.system.attributes.movement || {};
        preRaceState = null;
        refreshBaseState();
        rebuildFromClasses();
        main.invalidateStep(4);
        main.invalidateStep(5);
        main.invalidateStep(main.TOTAL_STEPS - 1);
        main.invalidateStepsFrom(4);
      }
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
}

export function isStepComplete() {
  return !!CharacterState.system.details.race && pendingReplacements() === 0;
}

export function confirmStep() {
  if (isStepComplete()) return true;
  return confirmRaceSelection();
}

export { renderBaseRaces, selectBaseRace };
