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

  const standardDetail = document.createElement('details');
  standardDetail.className = 'feature-block';
  standardDetail.innerHTML = `<summary>Equipaggiamento Standard</summary><ul>${equipmentData.standard
    .map(item => `<li>${item}</li>`)
    .join('')}</ul>`;
  equipmentDiv.appendChild(standardDetail);

  const classInfo = equipmentData.classes[className];
  if (classInfo) {
    if (Array.isArray(classInfo.fixed) && classInfo.fixed.length > 0) {
      const fixedDetail = document.createElement('details');
      fixedDetail.className = 'feature-block';
      fixedDetail.innerHTML = `<summary>Equipaggiamento fisso</summary><p>${classInfo.fixed.join(', ')}</p>`;
      equipmentDiv.appendChild(fixedDetail);
    }
    if (Array.isArray(classInfo.choices)) {
      classInfo.choices.forEach((choice, idx) => {
        const detail = document.createElement('details');
        detail.className = 'feature-block needs-selection incomplete';
        detail.innerHTML = `<summary>${choice.label || 'Scegli'}</summary>`;
        const options = [];
        (choice.options || []).forEach(opt => {
          const text = typeof opt === 'string' ? opt : opt.label || opt.value;
          if (text === 'Arma semplice') {
            SIMPLE_WEAPONS.forEach(w => options.push({ value: w, label: w }));
          } else {
            options.push(opt);
          }
        });
        options.forEach((opt, oIdx) => {
          const id = `equipChoice_${idx}_${oIdx}`;
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
        });
        equipmentDiv.appendChild(detail);
      });
    }
  } else {
    const p = document.createElement('p');
    p.textContent = 'Nessun equipaggiamento specifico per questa classe.';
    equipmentDiv.appendChild(p);
  }

  if (equipmentData.upgrades && level >= (equipmentData.upgrades.minLevel || 0)) {
    const up = equipmentData.upgrades;
    const upDetail = document.createElement('details');
    upDetail.className = 'feature-block';
    upDetail.innerHTML = '<summary>Opzioni Avanzate</summary>';
    if (Array.isArray(up.armor)) {
      const armorLabel = document.createElement('p');
      armorLabel.innerHTML = '<strong>Armatura:</strong>';
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
      const anyChecked = block.querySelectorAll('input:checked').length > 0;
      block.classList.toggle('incomplete', !anyChecked);
    };
    block.querySelectorAll('input').forEach(inp => inp.addEventListener('change', update));
    update();
    block.querySelectorAll('input:checked').forEach(inp => inp.dispatchEvent(new Event('change')));
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
      const selectedData = getSelectedData();
      selectedData.equipment = {
        standard: equipmentData.standard,
        class: chosen,
        upgrades: upgrades
      };
      saveSelectedData();
    });
  }
});
