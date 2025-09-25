/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import * as Step2 from '../src/step2.js';
import { updateChoiceSelectOptions, updateSkillSelectOptions } from '../src/choice-select-helpers.js';
import {
  CharacterState,
  DATA,
  MAX_CHARACTER_LEVEL,
  normalizeClassData,
} from '../src/data.js';
import { t } from '../src/i18n.js';
import * as uiHelpers from '../src/ui-helpers.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

describe('duplicate selection prevention', () => {
  beforeEach(() => {
    CharacterState.system.skills = [];
    CharacterState.system.spells.cantrips = [];
  });

  function createSelect(options) {
    const sel = document.createElement('select');
    const blank = document.createElement('option');
    blank.value = '';
    sel.appendChild(blank);
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    });
    return sel;
  }

  test('updateSkillSelectOptions disables taken skills', () => {
    const skillSelect1 = createSelect(['Acrobatics', 'Athletics']);
    const skillSelect2 = createSelect(['Acrobatics', 'Athletics']);
    const choiceSelect = createSelect(['Acrobatics', 'Athletics']);
    skillSelect1.value = 'Acrobatics';
    choiceSelect.value = 'Athletics';
    const skillSelects = [skillSelect1, skillSelect2];
    const choiceSkillSelects = [choiceSelect];

    updateSkillSelectOptions(skillSelects, choiceSkillSelects);

    expect(
      skillSelect2.querySelector("option[value='Acrobatics']").disabled
    ).toBe(true);
    expect(
      skillSelect2.querySelector("option[value='Athletics']").disabled
    ).toBe(true);
    expect(
      skillSelect1.querySelector("option[value='Athletics']").disabled
    ).toBe(true);
    expect(
      skillSelect1.querySelector("option[value='Acrobatics']").disabled
    ).toBe(false);
  });

  test('updateChoiceSelectOptions disables taken skills', () => {
    const skillSelect = createSelect(['Acrobatics', 'Athletics']);
    skillSelect.value = 'Athletics';
    const choiceSelect1 = createSelect(['Acrobatics', 'Athletics']);
    const choiceSelect2 = createSelect(['Acrobatics', 'Athletics']);
    choiceSelect1.value = 'Acrobatics';
    const skillSelects = [skillSelect];
    const choiceSelects = [choiceSelect1, choiceSelect2];

    updateChoiceSelectOptions(
      choiceSelects,
      'skills',
      skillSelects,
      choiceSelects
    );

    expect(
      choiceSelect2.querySelector("option[value='Acrobatics']").disabled
    ).toBe(true);
    expect(
      choiceSelect2.querySelector("option[value='Athletics']").disabled
    ).toBe(true);
    expect(
      choiceSelect1.querySelector("option[value='Athletics']").disabled
    ).toBe(true);
    expect(
      choiceSelect1.querySelector("option[value='Acrobatics']").disabled
    ).toBe(false);
  });

  test('selecting two different skills keeps both selections', () => {
    const skillSelect1 = createSelect(['Acrobatics', 'Athletics']);
    const skillSelect2 = createSelect(['Acrobatics', 'Athletics']);
    skillSelect1.value = 'Acrobatics';
    const skillSelects = [skillSelect1, skillSelect2];

    updateSkillSelectOptions(skillSelects);

    skillSelect2.value = 'Athletics';
    updateSkillSelectOptions(skillSelects);

    expect(skillSelect1.value).toBe('Acrobatics');
    expect(skillSelect2.value).toBe('Athletics');
  });

  test('selecting two different cantrips keeps both selections and disables them elsewhere', () => {
    CharacterState.system.spells.cantrips = ['Fire Bolt'];
    const cantripSelect1 = createSelect(['Fire Bolt', 'Light']);
    const cantripSelect2 = createSelect(['Fire Bolt', 'Light']);
    cantripSelect1.value = 'Fire Bolt';
    const selects = [cantripSelect1, cantripSelect2];

    updateChoiceSelectOptions(selects, 'cantrips');

    cantripSelect2.value = 'Light';
    updateChoiceSelectOptions(selects, 'cantrips');

    expect(cantripSelect1.value).toBe('Fire Bolt');
    expect(cantripSelect2.value).toBe('Light');
    expect(
      cantripSelect1.querySelector("option[value='Light']").disabled
    ).toBe(true);
    expect(
      cantripSelect2.querySelector("option[value='Fire Bolt']").disabled
    ).toBe(true);
  });
  test('selectClass prevents adding duplicate classes', async () => {
    CharacterState.classes = [{ name: 'Fighter', level: 1 }];
    const confirmMock = jest.fn().mockResolvedValue(true);
    uiHelpers.__setShowConfirmationImpl(confirmMock);
    await Step2.selectClass({ name: 'Fighter' });
    expect(CharacterState.classes).toHaveLength(1);
    expect(confirmMock).toHaveBeenCalled();
    uiHelpers.__setShowConfirmationImpl();
  });
});

describe('level cap messaging', () => {
  test('validateTotalLevel shows toast when exceeding cap', () => {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();
    const result = Step2.validateTotalLevel({
      level: MAX_CHARACTER_LEVEL + 1,
    });
    expect(result).toBe(false);
    const toast = document.getElementById('toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toBe(
      t('levelCap', { max: MAX_CHARACTER_LEVEL })
    );
  });

  test('validateTotalLevel permits reaching max level', () => {
    CharacterState.classes = [{ level: 1 }];
    const existing = document.getElementById('toast');
    if (existing) existing.remove();
    const result = Step2.validateTotalLevel({
      level: MAX_CHARACTER_LEVEL - 1,
    });
    expect(result).toBe(true);
    const toast = document.getElementById('toast');
    expect(toast).toBeNull();
  });
});

describe('feature descriptions', () => {
  test('Fighting Style and Second Wind descriptions render', () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const fighterRaw = JSON.parse(
      readFileSync(path.join(__dirname, '../data/classes/fighter.json'), 'utf8')
    );
    DATA.classes = [normalizeClassData(fighterRaw)];
    CharacterState.showHelp = false;
    const cls = {
      name: 'Fighter',
      level: 1,
      fixed_proficiencies: [],
      skill_choices: [],
      spellcasting: {},
      skills: [],
      choiceSelections: {},
      expertise: [],
    };
    const card = Step2.renderClassEditor(cls, 0);
    const items = Array.from(card.querySelectorAll('.accordion-item'));
    const fsItem = items.find(item =>
      item.querySelector('.accordion-header').textContent.includes('Fighting Style')
    );
    expect(fsItem).toBeTruthy();
    const fsBody = fsItem.querySelector('.accordion-content');
    expect(fsBody.textContent).toContain(
      'You adopt a particular style of fighting as your specialty.'
    );
    expect(fsBody.querySelector('select')).not.toBeNull();

    const swItem = items.find(item =>
      item.querySelector('.accordion-header').textContent.includes('Second Wind')
    );
    expect(swItem).toBeTruthy();
    const swBody = swItem.querySelector('.accordion-content');
    expect(swBody.textContent).toContain(
      'On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level.'
    );
  });
});

describe('optional class choices', () => {
  test('unselected optional choices do not block completion', () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const barbarianData = JSON.parse(
      readFileSync(path.join(__dirname, '../data/classes/barbarian.json'), 'utf8')
    );
    const prevClasses = DATA.classes;
    DATA.classes = [barbarianData];
    CharacterState.classes = [
      {
        name: 'Barbarian',
        level: 10,
        skills: ['Athletics', 'Survival'],
        choiceSelections: {},
        expertise: [],
        subclass: 'Berserker',
      },
    ];
    const complete = Step2.isStepComplete();
    expect(complete).toBe(true);
    DATA.classes = prevClasses;
    CharacterState.classes = [];
  });
});
