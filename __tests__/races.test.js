import { DATA, loadRaces } from '../src/data.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('loadRaces', () => {
  beforeAll(() => {
    const read = (p) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', p), 'utf-8'));
    const files = {
      'data/races.json': {
        items: {
          'Dwarf (Hill)': 'data/races/dwarfhill.json',
          'Dwarf (Mountain)': 'data/races/dwarfmountain.json',
        },
      },
      'data/races/dwarfhill.json': read('data/races/dwarfhill.json'),
      'data/races/dwarfmountain.json': read('data/races/dwarfmountain.json'),
    };
    global.fetch = (filePath) =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(files[filePath]) });
    global.window = { confirm: () => false, alert: () => {} };
  });

  it('groups races by base race name', async () => {
    await loadRaces();
    expect(DATA.races.Dwarf).toBeDefined();
    const names = DATA.races.Dwarf.map((r) => r.name);
    expect(names).toContain('Dwarf (Hill)');
    expect(names).toContain('Dwarf (Mountain)');
  });
});
