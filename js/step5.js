// Step 5: Equipment selection
let equipmentData = null;

function renderEquipment() {
  if (!equipmentData) return;
  const className = document.getElementById('classSelect').value;
  const level = parseInt(document.getElementById('levelSelect').value || '1', 10);
  const standardDiv = document.getElementById('standardEquipment');
  const classDiv = document.getElementById('classEquipmentChoices');
  const upgradeDiv = document.getElementById('equipmentUpgrades');

  standardDiv.innerHTML = `<h3>Equipaggiamento Standard</h3><ul>${equipmentData.standard
    .map(item => `<li>${item}</li>`)
    .join('')}</ul>`;

  classDiv.innerHTML = '';
  upgradeDiv.innerHTML = '';

  const classInfo = equipmentData.classes[className];
  if (classInfo) {
    if (Array.isArray(classInfo.fixed) && classInfo.fixed.length > 0) {
      const fixedP = document.createElement('p');
      fixedP.innerHTML = `<strong>Equipaggiamento fisso:</strong> ${classInfo.fixed.join(', ')}`;
      classDiv.appendChild(fixedP);
    }
    if (Array.isArray(classInfo.choices)) {
      classInfo.choices.forEach((choice, idx) => {
        const group = document.createElement('div');
        const lbl = document.createElement('p');
        lbl.innerHTML = `<strong>${choice.label || 'Scegli'}:</strong>`;
        group.appendChild(lbl);
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
          group.appendChild(input);
          group.appendChild(lab);
          group.appendChild(document.createElement('br'));
        });
        classDiv.appendChild(group);
      });
    }
  } else {
    classDiv.innerHTML = '<p>Nessun equipaggiamento specifico per questa classe.</p>';
  }

  if (equipmentData.upgrades && level >= (equipmentData.upgrades.minLevel || 0)) {
    const up = equipmentData.upgrades;
    const head = document.createElement('h3');
    head.textContent = 'Opzioni Avanzate';
    upgradeDiv.appendChild(head);
    if (Array.isArray(up.armor)) {
      const armorLabel = document.createElement('p');
      armorLabel.innerHTML = '<strong>Armatura:</strong>';
      upgradeDiv.appendChild(armorLabel);
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
        upgradeDiv.appendChild(input);
        upgradeDiv.appendChild(lab);
        upgradeDiv.appendChild(document.createElement('br'));
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
      upgradeDiv.appendChild(input);
      upgradeDiv.appendChild(lab);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const step = document.getElementById('step5');
  if (!step) return;

  if (!window.selectedData) {
    window.selectedData = {};
  }

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
      const className = document.getElementById('classSelect').value;
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
      window.selectedData.equipment = {
        standard: equipmentData.standard,
        class: chosen,
        upgrades: upgrades
      };
      sessionStorage.setItem('selectedData', JSON.stringify(window.selectedData));
    });
  }
});
