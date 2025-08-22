import { jest } from '@jest/globals';

function createSessionStorage() {
  let store = {};
  return {
    getItem: jest.fn(key => (key in store ? store[key] : null)),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
}

describe('character creation flow', () => {
  let applyStep;
  let getState;
  let resetState;
  let setSelectedData;
  let getSelectedData;
  let filterSpells;
  let getTakenProficiencies;
  let gatherExtraSelections;
  let renderProficiencyReplacements;
  let ALL_SKILLS;
  let storage;

  beforeEach(async () => {
    jest.resetModules();
    storage = createSessionStorage();
    Object.defineProperty(window, 'sessionStorage', {
      value: storage,
      configurable: true,
    });
    await jest.unstable_mockModule('jspdf', () => ({ jsPDF: jest.fn() }));
    await jest.unstable_mockModule('html2canvas', () => ({ default: jest.fn() }));
    ({ applyStep } = await import('../js/stepEngine.js'));
    ({ getState, resetState } = await import('../js/characterState.js'));
    ({ setSelectedData, getSelectedData } = await import('../js/state.js'));
    ({ filterSpells } = await import('../js/spellcasting.js'));
    ({ getTakenProficiencies, gatherExtraSelections } = await import('../js/script.js'));
    ({ renderProficiencyReplacements } = await import('../js/selectionUtils.js'));
    ({ ALL_SKILLS } = await import('../js/data/proficiencies.js'));
    resetState();
    setSelectedData({});
  });

  test('complete selection without duplicates', () => {
    const mergeSelectedData = update => setSelectedData({ ...getSelectedData(), ...update });

    // Class step: skills and cantrips
    applyStep('class', { proficiencies: { skills: ['History', 'Medicine'] } });
    mergeSelectedData({
      'Skill Proficiency': ['History', 'Medicine'],
      Cantrips: ['Ray of Frost', 'Fire Bolt'],
    });

    // Race step: languages and racial cantrip
    applyStep('race', { proficiencies: { languages: ['Common', 'Elvish', 'Dwarvish'] } });
    mergeSelectedData({ Languages: ['Common', 'Elvish', 'Dwarvish'] });
    const spells = [
      { name: 'Ray of Frost', level: 0, spell_list: ['Wizard'] },
      { name: 'Fire Bolt', level: 0, spell_list: ['Wizard'] },
      { name: 'Light', level: 0, spell_list: ['Wizard'] },
    ];
    const takenCantrips = new Set(
      getSelectedData().Cantrips.map(c => c.toLowerCase())
    );
    const available = filterSpells(spells, 'level=0|class=Wizard').filter(
      s => !takenCantrips.has(s.name.toLowerCase())
    );
    expect(available.map(s => s.name)).toEqual(['Light']);
    mergeSelectedData({ Cantrips: [...getSelectedData().Cantrips, 'Light'] });

    // Background step: handle duplicate history and choose replacement
    const baseSkills = ['Arcana', 'History'];
    const { conflicts } = getTakenProficiencies('skills', baseSkills);
    expect(conflicts.map(c => c.key)).toEqual(['History']);
    const container = document.createElement('div');
    const chosen = [];
    const selects = renderProficiencyReplacements(
      'skills',
      baseSkills,
      ALL_SKILLS,
      container,
      {
        label: 'Skill',
        source: 'background',
        changeHandler: vals => {
          chosen.splice(0, chosen.length, ...vals.filter(Boolean));
        },
      }
    );
    expect(selects).toHaveLength(1);
    selects[0].value = 'Religion';
    selects[0].dispatchEvent(new Event('change'));
    const finalSkills = ['Arcana', ...chosen];
    applyStep('background', { proficiencies: { skills: finalSkills } });
    mergeSelectedData({
      'Skill Proficiency': ['History', 'Medicine', ...finalSkills],
    });

    // Final state and selections
    const state = getState();
    const expected = [
      { type: 'skills', key: 'History', sources: ['class'] },
      { type: 'skills', key: 'Medicine', sources: ['class'] },
      { type: 'languages', key: 'Common', sources: ['race'] },
      { type: 'languages', key: 'Elvish', sources: ['race'] },
      { type: 'languages', key: 'Dwarvish', sources: ['race'] },
      { type: 'skills', key: 'Arcana', sources: ['background'] },
      { type: 'skills', key: 'Religion', sources: ['background'] },
    ];
    expected.forEach(p => expect(state.proficiencies).toContainEqual(p));
    expect(state.proficiencies).toHaveLength(expected.length);

    const finalData = getSelectedData();
    expect(finalData).toEqual({
      Cantrips: ['Ray of Frost', 'Fire Bolt', 'Light'],
      Languages: ['Common', 'Elvish', 'Dwarvish'],
      'Skill Proficiency': ['History', 'Medicine', 'Arcana', 'Religion'],
    });
    expect(new Set(finalData.Cantrips).size).toBe(finalData.Cantrips.length);
    expect(new Set(finalData.Languages).size).toBe(finalData.Languages.length);
    expect(new Set(finalData['Skill Proficiency']).size).toBe(
      finalData['Skill Proficiency'].length
    );
  });
  test('class selections retain chosen skills after confirmation', () => {
    // Confirm class with History and Nature
    applyStep('class', { proficiencies: { skills: ['History', 'Nature'] } });
    setSelectedData({ 'Skill Proficiency': ['History', 'Nature'] });

    // Gather selections for class again and ensure choices include taken skills
    const data = {
      choices: [
        {
          name: 'Skill Proficiency',
          selection: ['Arcana', 'History', 'Nature', 'Medicine'],
          count: 2,
        },
      ],
    };

    const selections = gatherExtraSelections(data, 'class', 1);
    const skillChoice = selections.find(c => c.name === 'Skill Proficiency');
    expect(skillChoice.selection).toEqual(
      expect.arrayContaining(['History', 'Nature'])
    );
  });

  test('class choices ignore race/background proficiencies', () => {
    // Start with class selections
    applyStep('class', { proficiencies: { skills: ['History', 'Nature'] } });
    setSelectedData({ 'Skill Proficiency': ['History', 'Nature'] });

    // Background grants History which should not remove it from class options
    applyStep('background', { proficiencies: { skills: ['History'] } });

    const data = {
      choices: [
        {
          name: 'Skill Proficiency',
          selection: ['Arcana', 'History', 'Nature', 'Medicine'],
          count: 2,
        },
      ],
    };

    const selections = gatherExtraSelections(data, 'class', 1);
    const skillChoice = selections.find(c => c.name === 'Skill Proficiency');
    expect(skillChoice.selection).toEqual(
      expect.arrayContaining(['History', 'Nature'])
    );
  });

  test('class choices omit class fixed proficiencies', () => {
    window.currentClassData = {
      skill_proficiencies: { fixed: ['Perception'] },
    };
    const data = {
      choices: [
        {
          name: 'Skill Proficiency',
          selection: ['Perception', 'Stealth', 'Athletics'],
          count: 1,
        },
      ],
    };
    const selections = gatherExtraSelections(data, 'class', 1);
    const skillChoice = selections.find(c => c.name === 'Skill Proficiency');
    expect(skillChoice.selection).toEqual(
      expect.arrayContaining(['Stealth', 'Athletics'])
    );
    expect(skillChoice.selection).not.toContain('Perception');
  });

  test('class selection includes skills granted by race/background', () => {
    applyStep('race', { proficiencies: { skills: ['Stealth'] } });
    applyStep('background', { proficiencies: { skills: ['History'] } });

    window.currentClassData = {
      skill_proficiencies: { fixed: ['Perception'] },
    };

    const data = {
      choices: [
        {
          name: 'Skill Proficiency',
          selection: ['Stealth', 'History', 'Nature', 'Arcana', 'Perception'],
          count: 2,
        },
      ],
    };

    const selections = gatherExtraSelections(data, 'class', 1);
    const skillChoice = selections.find(c => c.name === 'Skill Proficiency');
    expect(skillChoice.selection).toEqual(
      expect.arrayContaining(['Stealth', 'History', 'Nature', 'Arcana'])
    );
    expect(skillChoice.selection).not.toContain('Perception');
  });

  test('race filters out previously known proficiencies', () => {
    applyStep('class', { proficiencies: { languages: ['Common', 'Elvish'] } });
    const raceData = {
      languages: { fixed: [], choice: 1, options: ['Common', 'Dwarvish', 'Giant'] },
    };
    const selections = gatherExtraSelections(raceData, 'race');
    const langChoice = selections.find(c => c.name === 'Languages');
    expect(langChoice.selection).toEqual(
      expect.arrayContaining(['Dwarvish', 'Giant'])
    );
    expect(langChoice.selection).not.toContain('Common');
    expect(langChoice.selection).not.toContain('Elvish');
  });

  test('background swaps use only allowed pool', () => {
    applyStep('class', { proficiencies: { skills: ['History'] } });
    const container = document.createElement('div');
    const selects = renderProficiencyReplacements(
      'skills',
      ['History'],
      ['Arcana', 'Religion'],
      container,
      {
        label: 'Skill',
        source: 'background',
        getTakenOptions: { allowed: ['Arcana', 'Religion'] },
      }
    );
    const opts = Array.from(selects[0].options).map(o => o.value);
    expect(opts).toEqual(expect.arrayContaining(['Arcana', 'Religion']));
    expect(opts).not.toContain('Athletics');
  });

  test('class duplicates only block against class fixed', () => {
    // Race already grants Stealth
    applyStep('race', { proficiencies: { skills: ['Stealth'] } });
    const classFixed = new Set(['perception']);
    const { conflicts } = getTakenProficiencies(
      'skills',
      ['Stealth', 'Perception'],
      {},
      'class',
      { classFixed }
    );
    expect(conflicts.map(c => c.key)).toEqual(['Perception']);
  });

  test('class duplicates only block against class fixed', () => {
    // Race already grants Stealth
    applyStep('race', { proficiencies: { skills: ['Stealth'] } });
    const classFixed = new Set(['perception']);
    const { conflicts } = getTakenProficiencies(
      'skills',
      ['Stealth', 'Perception'],
      {},
      'class',
      { classFixed }
    );
    expect(conflicts.map(c => c.key)).toEqual(['Perception']);
  });
});