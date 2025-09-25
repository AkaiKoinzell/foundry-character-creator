import { CharacterState, updateSpellSlots, loadSpells } from './data.js';
import { t } from './i18n.js';
import { updateStep2Completion } from './step2.js';
import { createElement, createDetailsSection } from './ui-helpers.js';

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

export function renderSpellChoices(cls) {
  const container = document.createElement('div');
  const selects = [];
  const warning = document.createElement('p');
  warning.className = 'warning';

  let spells = [];
  const detailSection = createDetailsSection();
  detailSection.wrapper.classList.add('spell-details', 'hidden');

  function refreshDetails() {
    detailSection.content.innerHTML = '';
    const selected = selects.map(sel => sel.value).filter(Boolean);
    if (!selected.length) {
      detailSection.wrapper.classList.add('hidden');
      detailSection.setExpanded(false);
      return;
    }

    const seen = new Set();
    selected.forEach(name => {
      if (!name || seen.has(name)) return;
      seen.add(name);
      const block = document.createElement('div');
      block.className = 'spell-detail-block';
      block.appendChild(createElement('h4', name));

      const spell = spells.find(s => s.name === name);
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

      if (block.childElementCount === 1) {
        block.appendChild(createElement('p', t('noDetailsAvailable')));
      }

      detailSection.content.appendChild(block);
    });

    detailSection.wrapper.classList.remove('hidden');
  }

  function build() {
    updateSpellSlots();
    const spellState = CharacterState.system.spells || {};
    let maxLevel = 0;
    for (let i = 1; i <= 9; i++) {
      if (spellState[`spell${i}`]?.max > 0) maxLevel = i;
    }
    if (spellState.pact?.level > maxLevel) maxLevel = spellState.pact.level;

    const count = cls.spellcasting?.spellsPerLevel?.[cls.level] || 0;
    container.innerHTML = '';
    selects.length = 0;

    for (let i = 0; i < count; i++) {
      const sel = document.createElement('select');
      sel.replaceChildren(new Option(t('selectSpell'), ''));
      spells
        .filter(
          (s) =>
            (s.spell_list || []).includes(cls.name) &&
            s.level >= 1 &&
            s.level <= maxLevel
        )
        .forEach((spell) => {
          const opt = document.createElement('option');
          opt.value = spell.name;
          opt.textContent = `${spell.name} (Lv ${spell.level})`;
          sel.appendChild(opt);
        });
      sel.addEventListener('change', () => {
        updateSpellSelectOptions(selects);
        apply();
        updateWarning();
        refreshDetails();
        updateStep2Completion();
      });
      selects.push(sel);
      container.appendChild(sel);
    }

    const stored = CharacterState.knownSpells?.[cls.name] || {};
    const flat = Object.values(stored).flat();
    selects.forEach((sel, i) => {
      sel.value = flat[i] || '';
    });
    updateSpellSelectOptions(selects);
    apply();
    updateWarning();
    container.appendChild(detailSection.wrapper);
    container.appendChild(warning);
    refreshDetails();
  }

  function isComplete() {
    const values = selects.map((s) => s.value);
    if (values.some((v) => !v)) return false;
    const unique = new Set(values);
    return unique.size === values.length;
  }

  function updateWarning() {
    warning.textContent = isComplete() ? '' : t('selectSpellsWarning');
  }

  function apply() {
    const byLevel = {};
    selects.forEach((sel) => {
      const name = sel.value;
      if (!name) return;
      const spell = spells.find((s) => s.name === name);
      const lvl = spell?.level || 0;
      (byLevel[lvl] = byLevel[lvl] || []).push(name);
    });
    Object.keys(byLevel).forEach((lvl) => {
      byLevel[lvl] = Array.from(new Set(byLevel[lvl]));
    });
    CharacterState.knownSpells = CharacterState.knownSpells || {};
    CharacterState.knownSpells[cls.name] = byLevel;
    refreshDetails();
  }

  loadSpells().then((data) => {
    spells = data;
    build();
    updateStep2Completion();
  });

  return { element: container, isComplete, apply };
}
