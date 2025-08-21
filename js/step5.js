import { getSelectedData, saveSelectedData } from './state.js';
import { convertDetailsToAccordion, initializeAccordion } from './script.js';
// Step 5: Equipment selection
const SIMPLE_WEAPONS = [
  'Club',
  'Crossbow, Light',
  'Dagger',
  'Dart',
  'Greatclub',
  'Handaxe',
  'Javelin',
  'Light Hammer',
  'Mace',
  'Quarterstaff',
  'Shortbow',
  'Sickle',
  'Sling',
  'Spear',
  'Yklwa'
];
let equipmentData = null;

function getSelectedClassName() {
  const sel = document.getElementById('classSelect');
  return sel && sel.selectedOptions.length
    ? sel.selectedOptions[0].text.trim().normalize('NFC')
    : '';
}

function renderEquipment() {
  if (!equipmentData) return;
  const saved = getSelectedData().equipment || { class: [], upgrades: [] };
  const className = getSelectedClassName();
  const level = parseInt(document.getElementById('levelSelect').value || '1', 10);
  const equipmentDiv = document.getElementById('equipmentSelections');
  if (!equipmentDiv) return;
  equipmentDiv.innerHTML = '';
  const confirmBtn = document.getElementById('confirmEquipment');
  if (confirmBtn) confirmBtn.style.display = 'inline-block';
  window.equipmentSelectionConfirmed = false;

  const standardDetail = document.createElement('details');
  standardDetail.className = 'feature-block';
  standardDetail.innerHTML = `<summary>Standard Equipment</summary><ul>${equipmentData.standard
    .map(item => `<li>${item}</li>`)
    .join('')}</ul>`;
  equipmentDiv.appendChild(standardDetail);

  const classInfo = equipmentData.classes[className];
  if (classInfo) {
    if (Array.isArray(classInfo.fixed) && classInfo.fixed.length > 0) {
      const fixedDetail = document.createElement('details');
      fixedDetail.className = 'feature-block';
      fixedDetail.innerHTML = `<summary>Fixed Equipment</summary><p>${classInfo.fixed.join(', ')}</p>`;
      equipmentDiv.appendChild(fixedDetail);
    }
    if (Array.isArray(classInfo.choices)) {
      classInfo.choices.forEach((choice, idx) => {
        const detail = document.createElement('details');
        detail.className = 'feature-block needs-selection incomplete';
        detail.innerHTML = `<summary>${choice.label || 'Choose'}</summary>`;
        const options = [];
        (choice.options || []).forEach(opt => {
          const text = typeof opt === 'string' ? opt : opt.label || opt.value;
          if (text.toLowerCase() === 'simple weapon') {
            options.push({ value: 'simple weapon', label: 'Simple weapon', simpleWeapon: true });
          } else {
            options.push(typeof opt === 'string' ? { value: opt, label: opt } : opt);
          }
        });

        const needsDropdown =
          choice.type === 'radio' &&
          (options.length > 5 || /tools|instrument/i.test(choice.label || '')) &&
          !options.some(o => o.simpleWeapon);

        if (needsDropdown) {
          const select = document.createElement('select');
          select.name = `equipChoice_${idx}`;
          select.id = `equipChoice_${idx}`;
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = '-- select --';
          select.appendChild(placeholder);
          options.forEach(opt => {
            const optEl = document.createElement('option');
            optEl.value = opt.value || opt;
            optEl.textContent = opt.label || opt;
            select.appendChild(optEl);
          });
          if (saved.class) {
            const savedOpt = options.find(o => saved.class.includes(o.value || o));
            if (savedOpt) select.value = savedOpt.value || savedOpt;
          }
          detail.appendChild(select);
          detail.appendChild(document.createElement('br'));
        } else {
          options.forEach((opt, oIdx) => {
            const id = `equipChoice_${idx}_${oIdx}`;
            if (opt.simpleWeapon) {
              const input = document.createElement('input');
              input.type = 'radio';
              input.name = `equipChoice_${idx}`;
              input.id = id;
              const savedSimple = (saved.class || []).find(v => SIMPLE_WEAPONS.includes(v));
              input.value = savedSimple || '';
              if (savedSimple) input.checked = true;
              const lab = document.createElement('label');
              lab.htmlFor = id;
              lab.textContent = opt.label;
              detail.appendChild(input);
              detail.appendChild(lab);
              const select = document.createElement('select');
              const placeholder = document.createElement('option');
              placeholder.value = '';
              placeholder.textContent = '-- select --';
              select.appendChild(placeholder);
              SIMPLE_WEAPONS.forEach(w => {
                const swOpt = document.createElement('option');
                swOpt.value = w;
                swOpt.textContent = w;
                select.appendChild(swOpt);
              });
              if (savedSimple) select.value = savedSimple;
              select.addEventListener('change', () => {
                input.value = select.value;
                input.checked = true;
              });
              detail.appendChild(select);
              detail.appendChild(document.createElement('br'));
            } else {
              const input = document.createElement('input');
              input.type = choice.type === 'checkbox' ? 'checkbox' : 'radio';
              input.name = `equipChoice_${idx}`;
              input.id = id;
              input.value = opt.value || opt;
              if (saved.class && saved.class.includes(input.value)) {
                input.checked = true;
              }
              const lab = document.createElement('label');
              lab.htmlFor = id;
              lab.textContent = opt.label || opt;
              detail.appendChild(input);
              detail.appendChild(lab);
              detail.appendChild(document.createElement('br'));
            }
          });
        }
        equipmentDiv.appendChild(detail);
      });
    }
  } else {
    const p = document.createElement('p');
    p.textContent = 'No specific equipment for this class.';
    equipmentDiv.appendChild(p);
  }

  if (equipmentData.upgrades && level >= (equipmentData.upgrades.minLevel || 0)) {
    const up = equipmentData.upgrades;
    const upDetail = document.createElement('details');
    upDetail.className = 'feature-block';
    upDetail.innerHTML = '<summary>Advanced Options</summary>';
    if (Array.isArray(up.armor)) {
      const armorLabel = document.createElement('p');
      armorLabel.innerHTML = '<strong>Armor:</strong>';
      upDetail.appendChild(armorLabel);
      up.armor.forEach((armor, idx) => {
        const id = `upgradeArmor_${idx}`;
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'upgradeArmor';
        input.id = id;
        input.value = armor;
        if (saved.upgrades && saved.upgrades.includes(input.value)) {
          input.checked = true;
        }
        const lab = document.createElement('label');
        lab.htmlFor = id;
        lab.textContent = armor;
        upDetail.appendChild(input);
        upDetail.appendChild(lab);
        upDetail.appendChild(document.createElement('br'));
      });
    }
    if (up.weapon) {
      const id = 'upgradeWeapon';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.value = up.weapon;
      if (saved.upgrades && saved.upgrades.includes(input.value)) {
        input.checked = true;
      }
      const lab = document.createElement('label');
      lab.htmlFor = id;
      lab.textContent = up.weapon;
      upDetail.appendChild(input);
      upDetail.appendChild(lab);
    }
    equipmentDiv.appendChild(upDetail);
  }

  convertDetailsToAccordion(equipmentDiv);
  equipmentDiv.classList.add('accordion');
  initializeAccordion(equipmentDiv);

  equipmentDiv.querySelectorAll('.accordion-item.needs-selection').forEach(block => {
    const update = () => {
      const anyChecked =
        block.querySelectorAll('input:checked').length > 0 ||
        Array.from(block.querySelectorAll('select')).some(sel => sel.value);
      block.classList.toggle('incomplete', !anyChecked);
    };
    block.querySelectorAll('input, select').forEach(inp => inp.addEventListener('change', update));
    update();
    block.querySelectorAll('input:checked, select').forEach(inp =>
      inp.dispatchEvent(new Event('change'))
    );
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const step = document.getElementById('step5');
  if (!step) return;

  try {
    const res = await fetch('data/equipment.json');
    if (!res.ok) throw new Error('Failed to load equipment data');
    const data = await res.json();
    equipmentData = data;
    renderEquipment();
    const classSel = document.getElementById('classSelect');
    const levelSel = document.getElementById('levelSelect');
    if (classSel) classSel.addEventListener('change', renderEquipment);
    if (levelSel) levelSel.addEventListener('change', renderEquipment);
  } catch (err) {
    console.error('Error loading equipment:', err);
  }

  const confirmBtn = document.getElementById('confirmEquipment');
  const equipmentDiv = document.getElementById('equipmentSelections');
  if (confirmBtn && equipmentDiv) {
    confirmBtn.addEventListener('click', () => {
      const className = getSelectedClassName();
      const classInfo = equipmentData.classes[className] || { fixed: [] };
      const chosen = [];
      if (Array.isArray(classInfo.fixed)) chosen.push(...classInfo.fixed);
      const upgrades = [];
      equipmentDiv.querySelectorAll('input:checked').forEach(el => {
        if (el.name && el.name.startsWith('equipChoice_')) {
          chosen.push(el.value);
        } else {
          upgrades.push(el.value);
        }
      });
      equipmentDiv.querySelectorAll('select').forEach(sel => {
        if (sel.name && sel.name.startsWith('equipChoice_')) {
          if (sel.value) chosen.push(sel.value);
        } else if (sel.value) {
          upgrades.push(sel.value);
        }
      });
      if (equipmentDiv.querySelector('.needs-selection.incomplete')) {
        alert('⚠️ Seleziona tutte le opzioni di equipaggiamento prima di procedere!');
        return;
      }
      const selectedData = getSelectedData();
      selectedData.equipment = {
        standard: equipmentData.standard,
        class: chosen,
        upgrades: upgrades
      };
      saveSelectedData();
      window.equipmentSelectionConfirmed = true;
      confirmBtn.style.display = 'none';
    });
  }
});
