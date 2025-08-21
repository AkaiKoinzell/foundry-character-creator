import { jest } from '@jest/globals';

describe('applyStep', () => {
  let applyStep;
  let getState;
  let saveState;
  let recordStep;
  let mockState;

  beforeEach(async () => {
    jest.resetModules();
    mockState = { proficiencies: [] };
    await jest.unstable_mockModule('../js/characterState.js', () => ({
      getState: jest.fn(() => mockState),
      saveState: jest.fn(),
      recordStep: jest.fn(),
    }));
    ({ applyStep } = await import('../js/stepEngine.js'));
    ({ getState, saveState, recordStep } = await import('../js/characterState.js'));
  });

  test('reports conflicts when proficiency granted by multiple steps', () => {
    mockState.proficiencies.push({
      type: 'skill',
      key: 'stealth',
      sources: ['step1'],
    });

    const { conflicts } = applyStep('step2', {
      proficiencies: { skill: ['stealth'] },
    });

    expect(conflicts).toEqual({ skill: ['stealth'] });
    expect(mockState.proficiencies).toEqual([
      { type: 'skill', key: 'stealth', sources: ['step1', 'step2'] },
    ]);
    expect(saveState).toHaveBeenCalledTimes(1);
    expect(recordStep).toHaveBeenCalledWith('step2', { proficiencies: { skill: ['stealth'] } }, {});
  });

  test('reapplying same step replaces previous grants without conflict', () => {
    mockState.proficiencies.push({
      type: 'skill',
      key: 'stealth',
      sources: ['step2'],
    });

    const { conflicts } = applyStep('step2', {
      proficiencies: { skill: ['acrobatics'] },
    });

    expect(conflicts).toEqual({});
    expect(mockState.proficiencies).toEqual([
      { type: 'skill', key: 'acrobatics', sources: ['step2'] },
    ]);
    expect(saveState).toHaveBeenCalledTimes(1);
  });
});

