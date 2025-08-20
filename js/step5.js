import { getSelectedData, saveSelectedData } from './state.js';
// Step 5: Equipment selection
let equipmentData = null;

function getSelectedClassName() {
  const sel = document.getElementById('classSelect');
  return sel && sel.selectedOptions.length
    ? sel.selectedOptions[0].text.trim().normalize('NFC')
    : '';
}

function renderEquipment() {
  if (!equipmentData) return;
  const className = getSelectedClassName();
  const level = parseInt(document.getElementById('levelSelect').value || '1', 10);
  const standardDiv = document.getElementById('standardEquipment');
  const classDiv = document.getElementById('classEquipmentChoices');
  const upgradeDiv = document.getElementById('equipmentUpgrades');

  const standardDetail = document.createElement('details');
  standardDetail.className = 'feature-block';
  standardDetail.innerHTML = `<summary>Equipaggiamento Standard</summary><ul>${equipmentData.standard
    .map(item => `<li>${item}</li>`)
    .join('')}</ul>`;
  standardDiv.innerHTML = '';
  standardDiv.appendChild(standardDetail);

  classDiv.innerHTML = '';
  upgradeDiv.innerHTML = '';

  const classInfo = equipmentData.classes[className];
  if (classInfo) {
    if (Array.isArray(classInfo.fixed) && classInfo.fixed.length > 0) {
      const fixedDetail = document.createElement('details');
      fixedDetail.className = 'feature-block';
      fixedDetail.innerHTML = `<summary>Equipaggiamento fisso</summary><p>${classInfo.fixed.join(', ')}</p>`;
      classDiv.appendChild(fixedDetail);
    }
    if (Array.isArray(classInfo.choices)) {
      classInfo.choices.forEach((choice, idx) => {
        const detail = document.createElement('details');
        detail.className = 'feature-block needs-selection incomplete';
        detail.innerHTML = `<summary>${choice.label || 'Scegli'}</summary>`;
        choice.options.forEach((opt, oIdx) => {
          const id = `equipChoice_${idx}_${oIdx}`;
          const input = document.createElement('input');
          input.type = choice.type === 'checkbox' ? 'checkbox' : 'radio';
          input.name = `equipChoice_${idx}`;
          input.id = id;
          input.value = opt.value || opt;
          const lab = document.createElement('label');
          lab.htmlFor = id;
          lab.textContent = opt.label || opt;
          detail.appendChild(input);
          detail.appendChild(lab);
          detail.appendChild(document.createElement('br'));
        });
        const update = () => {
          const anyChecked = detail.querySelectorAll('input:checked').length > 0;
          detail.classList.toggle('incomplete', !anyChecked);
        };
        detail.querySelectorAll('input').forEach(inp => inp.addEventListener('change', update));
        classDiv.appendChild(detail);
        update();
      });
    }
  } else {
    classDiv.innerHTML = '<p>Nessun equipaggiamento specifico per questa classe.</p>';
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
      const lab = document.createElement('label');
      lab.htmlFor = id;
      lab.textContent = up.weapon;
      upDetail.appendChild(input);
      upDetail.appendChild(lab);
    }
    upgradeDiv.appendChild(upDetail);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const step = document.getElementById('step5');
  if (!step) return;

  fetch('data/equipment.json')
    .then(r => r.json())
    .then(data => {
      equipmentData = data;
      renderEquipment();
      const classSel = document.getElementById('classSelect');
      const levelSel = document.getElementById('levelSelect');
      if (classSel) classSel.addEventListener('change', renderEquipment);
      if (levelSel) levelSel.addEventListener('change', renderEquipment);
    });

  const confirmBtn = document.getElementById('confirmEquipment');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const className = getSelectedClassName();
      const classInfo = equipmentData.classes[className] || { fixed: [] };
      const chosen = [];
      if (Array.isArray(classInfo.fixed)) chosen.push(...classInfo.fixed);
      document
        .querySelectorAll('#classEquipmentChoices input:checked')
        .forEach(el => chosen.push(el.value));
      const upgrades = [];
      document
        .querySelectorAll('#equipmentUpgrades input:checked')
        .forEach(el => upgrades.push(el.value));
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
