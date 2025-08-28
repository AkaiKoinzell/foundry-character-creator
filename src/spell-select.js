import { CharacterState } from './data.js';
import { t } from './i18n.js';

let spellCache;

async function loadSpells() {
  if (!spellCache) {
    const res = await fetch('data/spells.json');
    spellCache = await res.json();
  }
  return spellCache;
}

export function renderSpellChoices(cls) {
  const container = document.createElement('div');
  const selects = [];
  const warning = document.createElement('p');
  warning.className = 'warning';

  let spells = [];

  function build() {
    const count = cls.spellcasting?.spellsPerLevel?.[cls.level] || 0;
    container.innerHTML = '';
    selects.length = 0;

    for (let i = 0; i < count; i++) {
      const sel = document.createElement('select');
      sel.innerHTML = `<option value=''>${t('selectSpell')}</option>`;
      spells
        .filter((s) => (s.spell_list || []).includes(cls.name))
        .forEach((spell) => {
          const opt = document.createElement('option');
          opt.value = spell.name;
          opt.textContent = `${spell.name} (Lv ${spell.level})`;
          sel.appendChild(opt);
        });
      sel.addEventListener('change', () => {
        apply();
        updateWarning();
        globalThis.updateStep2Completion?.();
      });
      selects.push(sel);
      container.appendChild(sel);
    }

    const stored = CharacterState.knownSpells?.[cls.name] || {};
    const flat = Object.values(stored).flat();
    selects.forEach((sel, i) => {
      sel.value = flat[i] || '';
    });
    apply();
    updateWarning();
    container.appendChild(warning);
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
    CharacterState.knownSpells = CharacterState.knownSpells || {};
    CharacterState.knownSpells[cls.name] = byLevel;
  }

  loadSpells().then((data) => {
    spells = data;
    build();
    globalThis.updateStep2Completion?.();
  });

  return { element: container, isComplete, apply };
}
