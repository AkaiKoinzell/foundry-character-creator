import { getTakenProficiencies, registerConflict, resolveConflict } from './script.js';

export function buildChoiceSelectors(container, count, options, className, changeHandler) {
  const selects = [];
  for (let i = 0; i < count; i++) {
    const sel = document.createElement('select');
    sel.className = className;
    sel.dataset.options = JSON.stringify(options);
    container.appendChild(sel);
    selects.push(sel);
  }

  const update = () => {
    const chosen = new Set(selects.map(s => s.value).filter(Boolean));
    selects.forEach(sel => {
      const opts = JSON.parse(sel.dataset.options);
      const current = sel.value;
      sel.innerHTML = `<option value="">Seleziona</option>` +
        opts.map(o => `<option value="${o}" ${chosen.has(o) && o !== current ? 'disabled' : ''}>${o}</option>`).join('');
      sel.value = current;
    });
    if (changeHandler) changeHandler();
  };

  selects.forEach(sel => sel.addEventListener('change', update));
  update();
  return selects;
}

export function renderProficiencyReplacements(
  type,
  fixedList,
  allOptions,
  container,
  {
    featureKey,
    label,
    selectedData = {},
    startIndex,
    selectClass = '',
    changeHandler,
    getTakenOptions = {},
    source,
    } = {}
) {
    if (!container || !Array.isArray(fixedList) || fixedList.length === 0) return [];
    const { owned, conflicts } = getTakenProficiencies(type, fixedList, getTakenOptions);
    if (!conflicts.length) return [];
    const base = fixedList.filter(s => !conflicts.some(c => c.key === s));
    let opts = conflicts[0]?.replacementPool || [];
    if (opts.length === 0) {
      const baseLower = base.map(b => b.toLowerCase());
      opts = allOptions.filter(o => !baseLower.includes(o.toLowerCase()));
    }
  const si =
    startIndex !== undefined
      ? startIndex
      : featureKey
      ? container.querySelectorAll(`select[data-feature="${featureKey}"]`).length
      : 0;
    const selects = [];
    const p = document.createElement('p');
    const descId = `${type}-conflict-desc-${Date.now()}`;
    p.id = descId;
    p.tabIndex = 0;
    p.innerHTML = `<strong>${label} duplicate, scegli sostituti:</strong>`;
    container.appendChild(p);
      conflicts.forEach((conflict, i) => {
        const lab = document.createElement('label');
        const sourceInfo = conflict.ownedFrom?.length ? ` (${conflict.ownedFrom.join(', ')})` : '';
        const selectId = `${type}-conflict-${si + i}`;
        lab.setAttribute('for', selectId);
        lab.textContent = `${conflict.key}${sourceInfo}: `;
        const sel = document.createElement('select');
        sel.id = selectId;
        sel.setAttribute('aria-describedby', descId);
        sel.tabIndex = 0;
        if (featureKey) {
          sel.dataset.feature = featureKey;
          sel.dataset.index = si + i;
        }
        const grantId = `${source || 'unknown'}:${type}:${conflict.key}:${i}`;
        sel.dataset.grantId = grantId;
        registerConflict(grantId, { ...conflict, type, source });
        if (selectClass) sel.className = selectClass;
        const def = document.createElement('option');
        def.value = '';
        def.textContent = 'Seleziona...';
        sel.appendChild(def);
        opts.forEach(o => {
          const option = document.createElement('option');
          option.value = o;
          option.textContent = o;
          sel.appendChild(option);
        });
        const saved = featureKey ? selectedData[featureKey]?.[si + i] || '' : '';
        if (saved) sel.value = saved;
        lab.appendChild(sel);
        container.appendChild(lab);
        selects.push(sel);
      });
  const update = () => {
    const chosen = new Set(selects.map(s => s.value).filter(Boolean));
    selects.forEach(sel => {
      const curr = sel.value;
      sel.innerHTML = '<option value="">Seleziona...</option>' +
        opts
          .map(
            o => `<option value="${o}" ${chosen.has(o) && o !== curr ? 'disabled' : ''}>${o}</option>`
          )
          .join('');
      sel.value = curr;
    });
    if (changeHandler) changeHandler(selects.map(s => s.value));
  };
  selects.forEach(sel =>
    sel.addEventListener('change', () => {
      const val = sel.value;
      if (val) {
        const resolved = resolveConflict(sel.dataset.grantId, val);
        sel.classList.toggle('resolved', resolved);
      } else {
        sel.classList.remove('resolved');
      }
      update();
    })
  );
  update();
  return selects;
}
