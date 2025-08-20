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
