/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { updateSpellSelectOptions } from '../src/spell-select.js';
import { loadSpells, DATA } from '../src/data.js';

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

describe('loadSpells', () => {
  test('merges level files and caches result', async () => {
    const dataByLevel = Array.from({ length: 10 }, (_, i) => [
      { name: `spell${i}`, level: i },
    ]);
    const originalFetch = global.fetch;
    const fetchMock = jest.fn((url) => {
      const match = /level(\d)\.json$/.exec(url);
      const idx = match ? Number(match[1]) : 0;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(dataByLevel[idx]),
      });
    });
    global.fetch = fetchMock;

    const first = await loadSpells();
    expect(first).toHaveLength(10);
    expect(fetchMock).toHaveBeenCalledTimes(10);

    const second = await loadSpells();
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(10);

    global.fetch = originalFetch;
    DATA.spells = undefined;
  });
});
