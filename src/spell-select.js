import { CharacterState, updateSpellSlots, loadSpells } from './data.js';
import { t } from './i18n.js';
import { updateStep2Completion } from './step2.js';
import { createElement, createDetailsSection } from './ui-helpers.js';

const ABILITY_TO_CODE = {
  Strength: 'str',
  Dexterity: 'dex',
  Constitution: 'con',
  Intelligence: 'int',
  Wisdom: 'wis',
  Charisma: 'cha',
};

// Disable duplicate selection of the same spell across all selects
export function updateSpellSelectOptions(selects) {
  const counts = new Map();
  selects.forEach((sel) => {
    const val = sel.value;
    if (!val) return;
    counts.set(val, (counts.get(val) || 0) + 1);
  });

  selects.forEach((sel) => {
    Array.from(sel.options).forEach((opt) => {
      if (!opt.value) return;
      const count = counts.get(opt.value) || 0;
      const isCurrent = sel.value === opt.value;
      opt.disabled = !isCurrent && count > 0;
    });

    const currentCount = (counts.get(sel.value) || 0) - 1;
    if (sel.value && currentCount > 0) {
      sel.value = '';
      sel.dispatchEvent(new Event('change'));
    }
  });
}

// Grouped spell selection by spell level with a global pick limit based on the
// class's "Spells Known" progression. This improves clarity without imposing
// artificial per-level quotas.
export function renderSpellChoices(cls) {
  const container = document.createElement('div');
  container.className = 'spell-choice-container';

  const summary = document.createElement('p');
  summary.className = 'spell-choice-summary';
  container.appendChild(summary);

  const groupsEl = document.createElement('div');
  groupsEl.className = 'spell-choice-groups';
  container.appendChild(groupsEl);

  const warning = document.createElement('p');
  warning.className = 'warning';
  container.appendChild(warning);

  let spells = [];
  const detailSection = createDetailsSection();
  detailSection.wrapper.classList.add('spell-details', 'hidden');
  container.appendChild(detailSection.wrapper);

  // Track all selects across groups for shared rules and de-duplication
  const allSelects = [];

  function getKnownLimit() {
    const base = Number(cls.spellcasting?.spellsPerLevel?.[cls.level]) || 0;
    if (base > 0) {
      // Subtract cantrips (chosen separately) so the limit reflects
      // only 1st–9th level spells for classes like Bard at level 1.
      const cantripCount = Array.isArray(CharacterState.system.spells?.cantrips)
        ? CharacterState.system.spells.cantrips.length
        : 0;
      return Math.max(0, base - cantripCount);
    }
    updateSpellSlots();
    const spellState = CharacterState.system.spells || {};
    const abilityName = cls.spellcasting?.ability;
    let abilityPrepared = 0;
    if (abilityName) {
      const code = ABILITY_TO_CODE[abilityName] || abilityName?.slice(0, 3)?.toLowerCase();
      const abilityScore = CharacterState.system.abilities?.[code]?.value;
      if (typeof abilityScore === 'number') {
        const abilityMod = Math.floor((abilityScore - 10) / 2);
        abilityPrepared = Math.max(1, (Number(cls.level) || 0) + abilityMod);
      }
    }
    let total = 0;
    for (let i = 1; i <= 9; i++) {
      total += Number(spellState[`spell${i}`]?.max) || 0;
    }
    if (spellState.pact) {
      total += Number(spellState.pact.max) || 0;
    }
    const levelFallback = Number(cls.level) || 1;
    return Math.max(abilityPrepared, total, levelFallback);
  }

  function selectedCount() {
    return allSelects.filter((s) => s.value).length;
  }

  function countByLevel() {
    const map = {};
    allSelects.forEach((s) => {
      const lvl = Number(s.dataset.level) || 0;
      if (!lvl) return;
      map[lvl] = (map[lvl] || 0) + 1;
    });
    return map;
  }

  function levelCaps() {
    // Use current slot table as a practical per-level cap for known spells at
    // that level. This mirrors the earlier behavior the user liked and keeps
    // choices intuitive at low levels (e.g., Bard 1: 2 first‑level spells).
    const caps = {};
    const spellState = CharacterState.system.spells || {};
    for (let i = 1; i <= 9; i++) {
      const slot = spellState[`spell${i}`];
      caps[i] = Math.max(0, Number(slot?.max) || 0);
    }
    return caps;
  }

  function maxSpellLevel() {
    updateSpellSlots();
    const spellState = CharacterState.system.spells || {};
    let maxLevel = 0;
    for (let i = 1; i <= 9; i++) if (spellState[`spell${i}`]?.max > 0) maxLevel = i;
    if (spellState.pact?.level > maxLevel) maxLevel = spellState.pact.level;
    return maxLevel;
  }

  function refreshSummary() {
    const limit = getKnownLimit();
    const used = selectedCount();
    const remaining = Math.max(0, limit - used);
    summary.textContent = `${t('spellsKnown') || 'Spells Known'}: ${used}/${limit}` +
      (remaining ? ` (${remaining} ${t('remaining') || 'remaining'})` : '');
  }

  function refreshDetails() {
    detailSection.content.innerHTML = '';
    const selected = allSelects.map((sel) => sel.value).filter(Boolean);
    if (!selected.length) {
      detailSection.wrapper.classList.add('hidden');
      detailSection.setExpanded(false);
      return;
    }
    const seen = new Set();
    selected.forEach((name) => {
      if (!name || seen.has(name)) return;
      seen.add(name);
      const block = document.createElement('div');
      block.className = 'spell-detail-block';
      block.appendChild(createElement('h4', name));
      const spell = spells.find((s) => s.name === name);
      if (spell) {
        if (typeof spell.level === 'number') {
          block.appendChild(createElement('p', `${t('level')} ${spell.level}`));
        }
        if (spell.school) {
          block.appendChild(createElement('p', `${t('spellSchool')}: ${spell.school}`));
        }
        if (Array.isArray(spell.spell_list) && spell.spell_list.length) {
          block.appendChild(
            createElement('p', `${t('spellAvailableTo')}: ${spell.spell_list.join(', ')}`)
          );
        }
        if (typeof spell.ritual === 'boolean') {
          block.appendChild(
            createElement('p', `${t('spellRitual')}: ${spell.ritual ? t('yes') : t('no')}`)
          );
        }
      }
      if (block.childElementCount === 1) block.appendChild(createElement('p', t('noDetailsAvailable')));
      detailSection.content.appendChild(block);
    });
    detailSection.wrapper.classList.remove('hidden');
  }

  function updateWarning() {
    const limit = getKnownLimit();
    const used = selectedCount();
    if (used < limit) warning.textContent = t('selectSpellsWarning');
    else if (allSelects.some((s) => !s.value)) warning.textContent = t('selectSpellsWarning');
    else warning.textContent = '';
  }

  function writeState() {
    const byLevel = {};
    allSelects.forEach((sel) => {
      const name = sel.value;
      const lvl = Number(sel.dataset.level) || 0;
      if (!name || !lvl) return;
      (byLevel[lvl] = byLevel[lvl] || []).push(name);
    });
    Object.keys(byLevel).forEach((lvl) => {
      byLevel[lvl] = Array.from(new Set(byLevel[lvl]));
    });
    CharacterState.knownSpells = CharacterState.knownSpells || {};
    CharacterState.knownSpells[cls.name] = byLevel;
  }

  function isComplete() {
    const limit = getKnownLimit();
    if (selectedCount() !== limit) return false;
    if (allSelects.some((s) => !s.value)) return false;
    const unique = new Set(allSelects.map((s) => s.value));
    return unique.size === allSelects.length;
  }

  function onAnyChange() {
    updateSpellSelectOptions(allSelects);
    refreshSummary();
    updateWarning();
    refreshDetails();
    writeState();
    updateStep2Completion();
  }

  function makeSelectForLevel(level) {
    const select = document.createElement('select');
    select.dataset.level = String(level);
    select.replaceChildren(new Option(t('selectSpell'), ''));
    spells
      .filter((s) => (s.spell_list || []).includes(cls.name) && s.level === level)
      .forEach((spell) => {
        const opt = document.createElement('option');
        opt.value = spell.name;
        opt.textContent = spell.name;
        select.appendChild(opt);
      });
    select.addEventListener('change', onAnyChange);
    return select;
  }

  function addSelect(level, into) {
    const limit = getKnownLimit();
    const caps = levelCaps();
    const current = countByLevel();
    if (allSelects.length >= limit) return;
    if (caps[level] && (current[level] || 0) >= caps[level]) return;
    const row = document.createElement('div');
    row.className = 'spell-choice-row';
    const sel = makeSelectForLevel(level);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-secondary btn-sm';
    remove.textContent = t('remove') || 'Remove';
    remove.addEventListener('click', () => {
      const idx = allSelects.indexOf(sel);
      if (idx >= 0) allSelects.splice(idx, 1);
      row.remove();
      onAnyChange();
      syncAddButtons();
    });
    row.appendChild(sel);
    row.appendChild(remove);
    into.appendChild(row);
    allSelects.push(sel);
    syncAddButtons();
    onAnyChange();
    return sel;
  }

  function syncAddButtons() {
    const limit = getKnownLimit();
    const used = allSelects.length;
    const caps = levelCaps();
    const current = countByLevel();
    groupsEl.querySelectorAll('button.spell-add').forEach((btn) => {
      const lvl = Number(btn.dataset.level) || 0;
      const atCap = caps[lvl] ? (current[lvl] || 0) >= caps[lvl] : false;
      btn.disabled = used >= limit || atCap;
    });
  }

  function build() {
    groupsEl.innerHTML = '';
    allSelects.length = 0;
    const maxLevel = maxSpellLevel();
    const stored = CharacterState.knownSpells?.[cls.name] || {};

    const caps = levelCaps();
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      const section = document.createElement('div');
      section.className = 'spell-level-group';
      const header = document.createElement('div');
      header.className = 'spell-level-header';
      const title = createElement('h4', `${t('level')} ${lvl}`);
      if (caps[lvl]) {
        const meta = document.createElement('small');
        meta.textContent = ` (${caps[lvl]} max)`;
        title.appendChild(meta);
      }
      header.appendChild(title);
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn btn-primary btn-sm spell-add';
      addBtn.textContent = t('add');
      addBtn.dataset.level = String(lvl);
      addBtn.addEventListener('click', () => addSelect(lvl, list));
      header.appendChild(addBtn);
      const list = document.createElement('div');
      list.className = 'spell-level-list';
      section.appendChild(header);
      section.appendChild(list);
      groupsEl.appendChild(section);

      const pre = Array.isArray(stored[lvl]) ? stored[lvl] : [];
      pre.forEach((name) => {
        const sel = addSelect(lvl, list);
        if (sel) sel.value = name;
      });
    }

    // If nothing stored, do not auto-add selects — let users pick where they want
    // to spend their known spell slots. They can add up to the limit via per-level buttons.
    refreshSummary();
    updateWarning();
    refreshDetails();
    syncAddButtons();
  }

  loadSpells().then((data) => {
    spells = data;
    build();
    updateStep2Completion();
  });

  return {
    element: container,
    isComplete,
    apply: writeState,
  };
}
