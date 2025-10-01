import { DATA, CharacterState, loadEquipment } from './data.js';
import { t } from './i18n.js';
import * as main from './main.js';
import { createAccordionItem, appendEntries } from './ui-helpers.js';
import { inlineWarning } from './validation.js';

let equipmentData;
let choiceBlocks = [];
let equipmentSelectionsValid = false;

function getSimpleWeapons() {
  return DATA.simpleWeapons?.length
    ? DATA.simpleWeapons
    : [
        'Club',
        'Dagger',
        'Greatclub',
        'Handaxe',
        'Javelin',
        'Light Hammer',
        'Mace',
        'Quarterstaff',
        'Sickle',
        'Spear',
        'Light Crossbow',
        'Dart',
        'Shortbow',
        'Sling',
      ];
}

export function resetEquipmentDataCache() {
  equipmentData = undefined;
}

export async function loadEquipmentData(forceReload = false) {
  if (!forceReload && equipmentData) return equipmentData;

  try {
    const data = await loadEquipment(forceReload);
    equipmentData = data;
    return equipmentData;
  } catch {
    const container = document.getElementById('equipmentSelections');
    if (container) container.textContent = t('equipmentLoadError');
    main.showErrorBanner?.(t('equipmentLoadError'));
    return undefined;
  }
}

function buildSimpleWeaponSelect(count = 1) {
  const selects = [];
  for (let i = 0; i < count; i++) {
    const sel = document.createElement('select');
    sel.replaceChildren(new Option(t('selectSimpleWeapon'), ''));
    getSimpleWeapons().forEach((w) => {
      const o = document.createElement('option');
      o.value = w;
      o.textContent = w;
      sel.appendChild(o);
    });
    sel.disabled = true;
    sel.addEventListener('change', validateEquipmentSelections);
    selects.push(sel);
  }
  return selects;
}

function buildChoiceBlock(choice, idx) {
  const wrapper = document.createElement('div');
  const inputs = [];

  if (choice?.description) {
    appendEntries(wrapper, [choice.description]);
  }
  if (Array.isArray(choice?.entries) && choice.entries.length) {
    appendEntries(wrapper, choice.entries);
  }

  if (choice.type === 'radio' || choice.type === 'checkbox') {
    choice.options.forEach((opt, i) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = choice.type;
      input.name = `equipChoice_${idx}`;
      input.value = opt.value;
      label.appendChild(input);
      label.appendChild(document.createTextNode(opt.label));

      let subSelects = null;
      if (/simple weapon/i.test(opt.value)) {
        const count = /two/i.test(opt.value) ? 2 : 1;
        subSelects = buildSimpleWeaponSelect(count);
        subSelects.forEach((sel) => label.appendChild(sel));
        input.addEventListener('change', () => {
          subSelects.forEach((sel) => {
            sel.disabled = !input.checked;
            if (!input.checked) sel.value = '';
          });
          validateEquipmentSelections();
        });
      } else {
        input.addEventListener('change', validateEquipmentSelections);
      }

      wrapper.appendChild(label);
      inputs.push({ input, subSelects });
    });

    const validator = () => {
      const selected = inputs.filter((i) => i.input.checked);
      if (choice.type === 'radio') {
        if (selected.length !== 1) return false;
      } else if (selected.length === 0) return false;
      for (const selInfo of selected) {
        if (selInfo.subSelects) {
          for (const sel of selInfo.subSelects) if (!sel.value) return false;
        }
      }
      return true;
    };

    const getValue = () => {
      const arr = [];
      inputs.forEach(({ input, subSelects }) => {
        if (input.checked) {
          if (subSelects) subSelects.forEach((sel) => arr.push(sel.value));
          else arr.push(input.value);
        }
      });
      return arr;
    };

    const accItem = createAccordionItem(choice.label, wrapper, true);
    accItem.classList.add('needs-selection');
    choiceBlocks.push({ element: accItem, validator, getValue });
    return accItem;
  }

  if (choice.type === 'dropdown' || choice.type === 'select') {
    const sel = document.createElement('select');
    sel.replaceChildren(new Option(t('select'), ''));
    (choice.options || []).forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      sel.appendChild(o);
    });
    sel.addEventListener('change', validateEquipmentSelections);
    wrapper.appendChild(sel);

    const validator = () => !!sel.value;
    const getValue = () => (sel.value ? [sel.value] : []);

    const accItem = createAccordionItem(choice.label, wrapper, true);
    accItem.classList.add('needs-selection');
    choiceBlocks.push({ element: accItem, validator, getValue });
    return accItem;
  }

  return null;
}

function getCurrentClass() {
  const sel = document.getElementById('classSelect');
  return sel?.value || CharacterState.classes[0]?.name || '';
}

function renderEquipmentForClass() {
  const container = document.getElementById('equipmentSelections');
  if (!container) return;
  const existingAcc = container.querySelector('.accordion');
  if (existingAcc) existingAcc.remove();
  choiceBlocks = [];

  const className = getCurrentClass();

  const accordion = document.createElement('div');
  accordion.className = 'accordion';

  // Standard gear
  const stdList = document.createElement('ul');
  (equipmentData.standard || []).forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    stdList.appendChild(li);
  });
  accordion.appendChild(createAccordionItem(t('standardGear'), stdList));

  const clsData = equipmentData.classes?.[className];
  if (!clsData) {
    console.warn(`Missing equipment mapping for class: ${className}`);
    const msg = document.createElement('div');
    msg.textContent = t('missingEquipmentMapping', { class: className });
    accordion.appendChild(msg);
    container.appendChild(accordion);
    validateEquipmentSelections();
    return;
  }

  if (clsData.fixed && clsData.fixed.length) {
    const fxList = document.createElement('ul');
    clsData.fixed.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      fxList.appendChild(li);
    });
    accordion.appendChild(createAccordionItem(t('fixedItems'), fxList));
  }

  (clsData.choices || []).forEach((choice, idx) => {
    const block = buildChoiceBlock(choice, idx);
    if (block) accordion.appendChild(block);
  });

  const totalLvl = (CharacterState.classes || []).reduce(
    (sum, c) => sum + (c.level || 0),
    0
  );
  const up = equipmentData.upgrades;
  if (up && totalLvl >= (up.minLevel || 0)) {
    const wrap = document.createElement('div');
    const inputs = [];
    (up.armor || []).forEach((item) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = item;
      label.appendChild(input);
      label.appendChild(document.createTextNode(item));
      wrap.appendChild(label);
      inputs.push(input);
    });
    if (up.weapon) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = up.weapon;
      label.appendChild(input);
      label.appendChild(document.createTextNode(up.weapon));
      wrap.appendChild(label);
      inputs.push(input);
    }
    const accItem = createAccordionItem(t('upgradeOptions'), wrap, true);
    const getValue = () => inputs.filter((i) => i.checked).map((i) => i.value);
    choiceBlocks.push({ element: accItem, validator: () => true, getValue });
    accordion.appendChild(accItem);
  }

  container.appendChild(accordion);
  validateEquipmentSelections();
}

function validateEquipmentSelections() {
  let allValid = true;
  choiceBlocks.forEach((b) => {
    const ok = b.validator();
    inlineWarning(b.element, ok);
    if (!ok) allValid = false;
  });
  equipmentSelectionsValid = allValid;
  const btn = document.getElementById('confirmEquipment');
  if (btn) btn.disabled = !equipmentSelectionsValid;
  main.setCurrentStepComplete?.(equipmentSelectionsValid);
  return equipmentSelectionsValid;
}

function confirmEquipment() {
  validateEquipmentSelections();
  if (!equipmentSelectionsValid) return;
  const selections = [];
  (equipmentData.standard || []).forEach((item) => {
    selections.push({ name: item });
  });
  const clsData = equipmentData.classes?.[getCurrentClass()] || {};
  if (clsData.fixed) {
    clsData.fixed.forEach((item) => {
      selections.push({ name: item });
    });
  }
  choiceBlocks.forEach((b) => {
    b.getValue().forEach((item) => {
      selections.push({ name: item });
    });
  });
  CharacterState.equipment = selections;
  main.showStep(main.TOTAL_STEPS - 1);
}

export async function loadStep5(force = false) {
  const container = document.getElementById('equipmentSelections');
  let confirmBtn = document.getElementById('confirmEquipment');
  if (!container || !confirmBtn) return;
  confirmBtn.textContent = t('confirmEquipment');
  confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  confirmBtn = document.getElementById('confirmEquipment');

  const data = await loadEquipmentData(force);
  if (!data) return;

  if (force) container.innerHTML = '';
  if (!force && container.querySelector('.accordion')) return;

  const initialClass = CharacterState.classes[0]?.name || '';
  if (!initialClass) return;

  if ((CharacterState.classes || []).length > 1) {
    const sel = document.createElement('select');
    sel.id = 'classSelect';
    (CharacterState.classes || []).forEach((cls) => {
      const opt = document.createElement('option');
      opt.value = cls.name;
      opt.textContent = cls.name;
      sel.appendChild(opt);
    });
    sel.value = initialClass;
    sel.addEventListener('change', () => {
      renderEquipmentForClass();
    });
    container.appendChild(sel);
  }

  renderEquipmentForClass();
  confirmBtn.addEventListener('click', confirmEquipment);
}

export function isStepComplete() {
  return equipmentSelectionsValid;
}
