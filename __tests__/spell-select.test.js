/**
 * @jest-environment jsdom
 */

import { updateSpellSelectOptions } from '../src/spell-select.js';

describe('spell select duplicate prevention', () => {
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

  test('updateSpellSelectOptions disables chosen spells', () => {
    const select1 = createSelect(['Magic Missile', 'Shield']);
    const select2 = createSelect(['Magic Missile', 'Shield']);
    select1.value = 'Magic Missile';
    const selects = [select1, select2];

    updateSpellSelectOptions(selects);

    expect(
      select2.querySelector("option[value='Magic Missile']").disabled
    ).toBe(true);
    expect(select2.querySelector("option[value='Shield']").disabled).toBe(
      false
    );

    select2.value = 'Magic Missile';
    updateSpellSelectOptions(selects);
    expect(select2.value).toBe('');
  });
});
