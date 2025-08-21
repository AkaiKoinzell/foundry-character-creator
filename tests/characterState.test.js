
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
    _getStore: () => store,
  };
}

describe('character state', () => {
  let addProficiency;
  let removeProficiency;
  let resetState;
  let getState;
  let recordStep;
  let logSwap;
  let storage;

  beforeEach(async () => {
    jest.resetModules();
    storage = createSessionStorage();
    Object.defineProperty(window, 'sessionStorage', {
      value: storage,
      configurable: true,
    });
    ({
      addProficiency,
      removeProficiency,
      resetState,
      getState,
      recordStep,
      logSwap,
    } = await import('../js/characterState.js'));
  });

  test('addProficiency ignores calls without type or key', () => {
    addProficiency('', 'stealth');
    addProficiency('skill', null);
    expect(getState().proficiencies).toHaveLength(0);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('addProficiency merges sources without duplicates', () => {
    addProficiency('skill', 'stealth', 'class');
    addProficiency('skill', 'stealth', 'class');
    addProficiency('skill', 'stealth', 'background');
    expect(getState().proficiencies).toEqual([
      { type: 'skill', key: 'stealth', sources: ['class', 'background'] },
    ]);
  });

  test('removeProficiency removes specified source and deletes entry when last source gone', () => {
    addProficiency('skill', 'stealth', 'class');
    addProficiency('skill', 'stealth', 'background');
    removeProficiency('skill', 'stealth', 'class');
    expect(getState().proficiencies).toEqual([
      { type: 'skill', key: 'stealth', sources: ['background'] },
    ]);
    removeProficiency('skill', 'stealth', 'background');
    expect(getState().proficiencies).toHaveLength(0);
  });

  test('removeProficiency does nothing when entry is missing', () => {
    removeProficiency('skill', 'stealth');
    expect(getState().proficiencies).toHaveLength(0);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('resetState restores default structure', () => {
    addProficiency('skill', 'stealth', 'class');
    recordStep('step1');
    logSwap({ step: 'step1', conflicts: { foo: 'bar' } });
    expect(getState()).not.toEqual({
      proficiencies: [],
      stepsCompleted: [],
      swapLog: [],
    });
    resetState();
    expect(getState()).toEqual({
      proficiencies: [],
      stepsCompleted: [],
      swapLog: [],
    });
  });
});

