/**
 * @jest-environment jsdom
 */

import { loadStep5 } from '../src/step5.js';
import { CharacterState } from '../src/data.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('equipment rendering', () => {
  beforeEach(() => {
    const equipment = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'data', 'equipment.json'), 'utf-8')
    );
    global.fetch = (filePath) => {
      if (filePath === 'data/equipment.json') {
        return Promise.resolve({ json: () => Promise.resolve(equipment) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    };
    document.body.innerHTML = '<div id="equipmentSelections"></div><button id="confirmEquipment"></button>';
    CharacterState.classes = [{ name: 'Artificer', level: 1 }];
  });

  it('renders fixed and choice accordions', async () => {
    await loadStep5(true);
    const headers = Array.from(
      document.querySelectorAll('.accordion-item > .accordion-header')
    ).map((h) => h.textContent.trim());
    expect(headers).toEqual(
      expect.arrayContaining(['standardGear', 'fixedItems', 'Weapon', 'Armor'])
    );
  });
});
