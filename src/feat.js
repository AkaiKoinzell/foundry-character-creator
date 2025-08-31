import {
  CharacterState,
  loadFeatDetails,
  DATA,
  loadSpells,
  loadOptionalFeatures,
} from './data.js';
import { t } from './i18n.js';
import { addUniqueProficiency } from './proficiency.js';
import { createElement, capitalize, appendEntries } from './ui-helpers.js';

function refreshAbility(ab) {
  const base = CharacterState.baseAbilities?.[ab];
  const bonus = CharacterState.bonusAbilities?.[ab] || 0;
  const finalVal = (base || 0) + bonus;
  const baseSpan = document.getElementById(`${ab}Points`);
  const bonusSpan = document.getElementById(`${ab}BonusModifier`);
  const finalCell = document.getElementById(`${ab}FinalScore`);
  if (baseSpan) baseSpan.textContent = base;
  if (bonusSpan) bonusSpan.textContent = bonus;
  if (finalCell) finalCell.textContent = finalVal;
}

export async function renderFeatChoices(featName, container, onChange = () => {}) {
  const feat = await loadFeatDetails(featName);
  const wrapper = createElement('div');
  container.appendChild(wrapper);
  if (feat.description) wrapper.appendChild(createElement('p', feat.description));
  appendEntries(wrapper, feat.entries);

  const abilitySelects = [];
  const skillSelects = [];
  const toolSelects = [];
  const languageSelects = [];
  const saveSelects = [];
  const fixedAbilityBonuses = {};

  if (Array.isArray(feat.ability)) {
    feat.ability.forEach((ab) => {
      if (ab.choose) {
        const amount = ab.choose.amount || ab.choose.count || 1;
        const from = ab.choose.from || [];
        for (let i = 0; i < amount; i++) {
          const sel = document.createElement('select');
          sel.innerHTML = `<option value=''>${t('selectAbilityForFeat')}</option>`;
          from.forEach((opt) => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt.toUpperCase();
            sel.appendChild(o);
          });
          wrapper.appendChild(sel);
          sel.addEventListener('change', onChange);
          abilitySelects.push(sel);
        }
      } else {
        Object.entries(ab).forEach(([code, val]) => {
          if (
            CharacterState.system.abilities[code] &&
            CharacterState.bonusAbilities[code] !== undefined
          ) {
            const base =
              CharacterState.baseAbilities?.[code] ??
              CharacterState.system.abilities[code].value -
                (CharacterState.bonusAbilities[code] || 0);
            CharacterState.bonusAbilities[code] += val;
            CharacterState.system.abilities[code].value =
              base + CharacterState.bonusAbilities[code];
            fixedAbilityBonuses[code] =
              (fixedAbilityBonuses[code] || 0) + val;
            refreshAbility(code);
          }
        });
      }
    });
  }

  const makeSelects = (arr, list, labelKey) => {
    arr.forEach((entry) => {
      if (entry.choose) {
        const amount = entry.choose.amount || entry.choose.count || 1;
        const from = entry.choose.from || entry.choose.options || [];
        for (let i = 0; i < amount; i++) {
          const sel = document.createElement('select');
          sel.innerHTML = `<option value=''>${t(labelKey)}</option>`;
          from.forEach((opt) => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            sel.appendChild(o);
          });
          wrapper.appendChild(sel);
          sel.addEventListener('change', onChange);
          list.push(sel);
        }
      }
    });
  };

  if (Array.isArray(feat.skillProficiencies)) {
    makeSelects(feat.skillProficiencies, skillSelects, 'selectSkillForFeat');
  }
  if (Array.isArray(feat.toolProficiencies)) {
    makeSelects(feat.toolProficiencies, toolSelects, 'selectToolForFeat');
  }
  if (Array.isArray(feat.languageProficiencies)) {
    makeSelects(feat.languageProficiencies, languageSelects, 'selectLanguageForFeat');
  }

  const weaponSelects = [];
  if (Array.isArray(feat.weaponProficiencies)) {
    feat.weaponProficiencies.forEach((entry) => {
      if (entry.choose?.fromFilter) {
        const opts = getWeaponsFromFilter(entry.choose.fromFilter);
        const count = entry.choose.count || entry.choose.amount || 1;
        const selects = [];
        for (let i = 0; i < count; i++) {
          const sel = document.createElement('select');
          sel.innerHTML = `<option value=''>${t('selectWeaponForFeat')}</option>`;
          wrapper.appendChild(sel);
          weaponSelects.push(sel);
          selects.push(sel);
          sel.addEventListener('change', () => {
            updateWeaponSelects(selects, opts);
            onChange();
          });
        }
        updateWeaponSelects(selects, opts);
      }
    });
  }

  if (Array.isArray(feat.savingThrowProficiencies)) {
    feat.savingThrowProficiencies.forEach((entry) => {
      if (entry.choose) {
        const amount = entry.choose.amount || entry.choose.count || 1;
        const from = entry.choose.from || [];
        for (let i = 0; i < amount; i++) {
          const sel = document.createElement('select');
          sel.dataset.opts = JSON.stringify(from);
          sel.innerHTML = `<option value=''>${t('selectSaveForFeat')}</option>`;
          from.forEach((opt) => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt.toUpperCase();
            sel.appendChild(o);
          });
          wrapper.appendChild(sel);
          saveSelects.push(sel);
          sel.addEventListener('change', () => {
            updateSaveSelects();
            onChange();
          });
        }
      }
    });
    updateSaveSelects();
  }

  const optionalFeatureSelects = [];
  if (Array.isArray(feat.optionalfeatureProgression)) {
    await loadOptionalFeatures();
    feat.optionalfeatureProgression.forEach((prog) => {
      const vals = Object.values(prog.progression || {}).map((v) => Number(v) || 0);
      const count = vals.length ? Math.max(...vals) : 0;
      const opts = (prog.featureType || [])
        .flatMap((t) => DATA.optionalFeatures?.[t] || []);
      const selects = [];
      for (let i = 0; i < count; i++) {
        const sel = document.createElement('select');
        sel.innerHTML = `<option value=''>${t('select')}</option>`;
        wrapper.appendChild(sel);
        optionalFeatureSelects.push(sel);
        selects.push(sel);
        sel.addEventListener('change', () => {
          updateOptionalSelects(selects, opts);
          onChange();
        });
      }
      updateOptionalSelects(selects, opts);
    });
  }

  function updateOptionalSelects(selects, opts) {
    const taken = new Set(selects.map((s) => s.value).filter(Boolean));
    selects.forEach((sel) => {
      const current = sel.value;
      sel.innerHTML = `<option value=''>${t('select')}</option>`;
      opts.forEach((o) => {
        if (o !== current && taken.has(o)) return;
        const opt = document.createElement('option');
        opt.value = o;
        opt.textContent = o;
        sel.appendChild(opt);
      });
      sel.value = current;
    });
  }

  function updateSaveSelects() {
    const taken = new Set(CharacterState.system.attributes?.saves || []);
    (CharacterState.feats || [])
      .filter((f) => f.name !== featName)
      .forEach((f) => {
        const arr = f.saves || f.system?.attributes?.saves;
        if (Array.isArray(arr)) arr.forEach((s) => taken.add(s));
      });
    saveSelects.forEach((sel) => {
      if (sel.value) taken.add(sel.value);
    });
    saveSelects.forEach((sel) => {
      const opts = JSON.parse(sel.dataset.opts || '[]');
      const current = sel.value;
      if (current) taken.delete(current);
      sel.innerHTML = `<option value=''>${t('selectSaveForFeat')}</option>`;
      opts.forEach((ab) => {
        if (ab !== current && taken.has(ab)) return;
        const o = document.createElement('option');
        o.value = ab;
        o.textContent = ab.toUpperCase();
        sel.appendChild(o);
      });
      sel.value = current;
      if (current) taken.add(current);
    });
  }

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

  function updateWeaponSelects(selects, opts) {
    const taken = new Set(selects.map((s) => s.value).filter(Boolean));
    selects.forEach((sel) => {
      const current = sel.value;
      sel.innerHTML = `<option value=''>${t('selectWeaponForFeat')}</option>`;
      opts.forEach((o) => {
        if (o !== current && taken.has(o)) return;
        const opt = document.createElement('option');
        opt.value = o;
        opt.textContent = o;
        sel.appendChild(opt);
      });
      sel.value = current;
    });
  }

  const spellSelects = [];
  const cantripSelects = [];
  let level1Select = null;
  let spellClassSelect = null;

  if (Array.isArray(feat.additionalSpells) && feat.additionalSpells.length) {
    const spellWrapper = document.createElement('div');
    spellClassSelect = document.createElement('select');
    spellClassSelect.innerHTML = `<option value=''>${t('select')}</option>`;
    feat.additionalSpells.forEach((opt, idx) => {
      const o = document.createElement('option');
      o.value = String(idx);
      o.textContent = opt.name || opt.class || opt.ability || `Option ${idx + 1}`;
      spellClassSelect.appendChild(o);
    });
    spellClassSelect.addEventListener('change', async () => {
      // Clear previous selects
      cantripSelects.splice(0).forEach((sel) => sel.remove());
      if (level1Select) {
        level1Select.remove();
        level1Select = null;
      }
      spellSelects.length = 1; // keep class select
      spellWrapper
        .querySelectorAll('.feat-spell-select')
        .forEach((n) => n.remove());

      const idx = spellClassSelect.value ? Number(spellClassSelect.value) : -1;
      if (idx >= 0) {
        const choice = feat.additionalSpells[idx];
        if (!DATA.spells) await loadSpells();
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

        const parseOpts = (str) =>
          (DATA.spells || [])
            .filter((sp) => {
              return str.split('|').every((cond) => {
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
                  return classes.some((c) => (sp.spell_list || []).includes(c));
                }
                return true;
              });
            })
            .map((sp) => sp.name);

        const createSelects = (opts, count, list) => {
          for (let i = 0; i < count; i++) {
            const sel = document.createElement('select');
            sel.className = 'feat-spell-select';
            sel.dataset.opts = JSON.stringify(opts);
            sel.innerHTML = `<option value=''>${t('select')}</option>`;
            sel.addEventListener('change', () => {
              updateSpellSelects();
              onChange();
            });
            spellWrapper.appendChild(sel);
            list.push(sel);
            spellSelects.push(sel);
          }
        };

        if (choice.known && choice.known._) {
          choice.known._.forEach((entry) => {
            if (entry.choose) {
              const cnt = entry.count || entry.choose.count || 1;
              const opts = parseOpts(entry.choose);
              createSelects(opts, cnt, cantripSelects);
            }
          });
        }

        if (choice.innate?._.daily) {
          const daily = choice.innate._.daily;
          const arr = daily['1'] || daily['1e'];
          if (Array.isArray(arr)) {
            const entry = arr.find(
              (e) => typeof e === 'object' && e.choose
            );
            if (entry) {
              const opts = parseOpts(entry.choose);
              const sel = document.createElement('select');
              sel.className = 'feat-spell-select';
              sel.dataset.opts = JSON.stringify(opts);
              sel.innerHTML = `<option value=''>${t('select')}</option>`;
              sel.addEventListener('change', () => {
                updateSpellSelects();
                onChange();
              });
              spellWrapper.appendChild(sel);
              level1Select = sel;
              spellSelects.push(sel);
            }
          }
        }
        updateSpellSelects();
      }
      onChange();
    });
    wrapper.appendChild(spellClassSelect);
    spellSelects.push(spellClassSelect);
    wrapper.appendChild(spellWrapper);
  }

  function updateSpellSelects() {
    const existing = new Set([
      ...(CharacterState.system.spells?.cantrips || []),
      ...(CharacterState.raceChoices?.spells || []),
    ]);
    (CharacterState.feats || []).forEach((f) => {
      const sp = f.spells || f.system?.spells;
      if (sp) {
        (sp.cantrips || []).forEach((c) => existing.add(c));
        if (sp.level1) existing.add(sp.level1);
      }
    });
    const all = [...cantripSelects];
    if (level1Select) all.push(level1Select);
    all.forEach((s) => {
      if (s.value) existing.add(s.value);
    });
    all.forEach((sel) => {
      const opts = JSON.parse(sel.dataset.opts || '[]');
      const current = sel.value;
      if (current) existing.delete(current);
      sel.innerHTML = `<option value=''>${t('select')}</option>`;
      opts.forEach((sp) => {
        if (sp !== current && existing.has(sp)) return;
        const o = document.createElement('option');
        o.value = sp;
        o.textContent = sp;
        sel.appendChild(o);
      });
      sel.value = current;
      if (current) existing.add(current);
    });
  }

  const isComplete = () =>
    abilitySelects.every((s) => s.value) &&
    skillSelects.every((s) => s.value) &&
    toolSelects.every((s) => s.value) &&
    languageSelects.every((s) => s.value) &&
    weaponSelects.every((s) => s.value) &&
    saveSelects.every((s) => s.value) &&
    spellSelects.every((s) => s.value) &&
    optionalFeatureSelects.every((s) => s.value);

  const apply = () => {
    const idx = (CharacterState.feats || []).findIndex(
      (f) => f.name === featName
    );
    const prevFeat = idx >= 0 ? CharacterState.feats[idx] : null;
    const featObj = { name: featName, system: {} };
    if (Object.keys(fixedAbilityBonuses).length) {
      featObj.ability = { ...fixedAbilityBonuses };
    }
    if (abilitySelects.length) {
      abilitySelects.forEach((sel) => {
        const code = sel.value;
        featObj.ability = featObj.ability || {};
        featObj.ability[code] = (featObj.ability[code] || 0) + 1;
        if (
          CharacterState.system.abilities[code] &&
          CharacterState.bonusAbilities[code] !== undefined
        ) {
          const base =
            CharacterState.baseAbilities?.[code] ??
            CharacterState.system.abilities[code].value -
              (CharacterState.bonusAbilities[code] || 0);
          CharacterState.bonusAbilities[code] += 1;
          CharacterState.system.abilities[code].value =
            base + CharacterState.bonusAbilities[code];
          refreshAbility(code);
        }
      });
    }
    if (skillSelects.length) {
      featObj.skills = [];
      skillSelects.forEach((sel) => {
        const val = capitalize(sel.value);
        featObj.skills.push(val);
        addUniqueProficiency('skills', val, container);
      });
    }
    if (toolSelects.length) {
      featObj.tools = [];
      toolSelects.forEach((sel) => {
        featObj.tools.push(sel.value);
        addUniqueProficiency('tools', sel.value, container);
      });
    }
    if (languageSelects.length) {
      featObj.languages = [];
      languageSelects.forEach((sel) => {
        featObj.languages.push(sel.value);
        addUniqueProficiency('languages', sel.value, container);
      });
    }
    if (weaponSelects.length) {
      featObj.weapons = weaponSelects.map((s) => s.value);
    }
    if (saveSelects.length) {
      featObj.saves = saveSelects.map((s) => s.value);
      CharacterState.system.attributes.saves =
        CharacterState.system.attributes.saves || [];
      if (prevFeat?.saves) {
        prevFeat.saves.forEach((sv) => {
          const i = CharacterState.system.attributes.saves.indexOf(sv);
          if (i >= 0) CharacterState.system.attributes.saves.splice(i, 1);
        });
      }
      featObj.saves.forEach((sv) => {
        if (!CharacterState.system.attributes.saves.includes(sv)) {
          CharacterState.system.attributes.saves.push(sv);
        }
      });
    }
    if (spellClassSelect && spellClassSelect.value) {
      const obj = {
        class: feat.additionalSpells[Number(spellClassSelect.value)].name || '',
        cantrips: cantripSelects.map((s) => s.value),
        level1: level1Select ? level1Select.value : '',
      };
      featObj.spells = obj;
    }
    if (optionalFeatureSelects.length) {
      featObj.optionalFeatures = optionalFeatureSelects.map((s) => s.value);
    }
    if (idx >= 0) CharacterState.feats[idx] = featObj;
    else {
      CharacterState.feats = CharacterState.feats || [];
      CharacterState.feats.push(featObj);
    }
  };

  return {
    abilitySelects,
    skillSelects,
    toolSelects,
    languageSelects,
    weaponSelects,
    saveSelects,
    spellSelects,
    optionalFeatureSelects,
    isComplete,
    apply,
  };
}
