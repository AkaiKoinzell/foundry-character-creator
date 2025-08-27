/**
 * @jest-environment jsdom
 */

import { updateSkillSelectOptions, updateChoiceSelectOptions } from '../src/step2.js';
import { CharacterState } from '../src/data.js';

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
});
