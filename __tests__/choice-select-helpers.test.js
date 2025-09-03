/**
 * @jest-environment jsdom
 */
import { CharacterState } from '../src/data.js';
import { updateChoiceSelectOptions } from '../src/choice-select-helpers.js';

describe('updateChoiceSelectOptions duplicate prevention', () => {
  beforeEach(() => {
    CharacterState.system = {
      skills: [],
      tools: [],
      weapons: [],
      traits: { languages: { value: [] } },
      spells: { cantrips: [] },
    };
  });

  function createSelect(options) {
    const sel = document.createElement('select');
    const blank = document.createElement('option');
    blank.value = '';
    sel.appendChild(blank);
    options.forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    });
    return sel;
  }

  test('prevents duplicate race languages', () => {
    const sel1 = createSelect(['Elvish', 'Dwarvish']);
    const sel2 = createSelect(['Elvish', 'Dwarvish']);
    sel1.value = 'Elvish';
    const selects = [sel1, sel2];
    updateChoiceSelectOptions(selects, 'languages');
    expect(sel2.querySelector("option[value='Elvish']").disabled).toBe(true);
    expect(sel1.querySelector("option[value='Dwarvish']").disabled).toBe(false);
  });

  test('prevents duplicate background tools', () => {
    const sel1 = createSelect(["Smith's Tools", "Cobbler's Tools"]);
    const sel2 = createSelect(["Smith's Tools", "Cobbler's Tools"]);
    sel1.value = "Smith's Tools";
    const selects = [sel1, sel2];
    updateChoiceSelectOptions(selects, 'tools');
    expect(sel2.querySelector("option[value=\"Smith's Tools\"]").disabled).toBe(true);
    expect(sel1.querySelector("option[value=\"Cobbler's Tools\"]").disabled).toBe(false);
  });

  test('prevents duplicate class skills', () => {
    const sel1 = createSelect(['Acrobatics', 'Athletics']);
    const sel2 = createSelect(['Acrobatics', 'Athletics']);
    sel1.value = 'Acrobatics';
    const selects = [sel1, sel2];
    updateChoiceSelectOptions(selects, 'skills');
    expect(sel2.querySelector("option[value='Acrobatics']").disabled).toBe(true);
    expect(sel1.querySelector("option[value='Athletics']").disabled).toBe(false);
  });
});
