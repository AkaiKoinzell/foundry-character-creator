/**
 * @jest-environment jsdom
 */
import { initNextStepWarning } from '../src/ui-helpers.js';

describe('initNextStepWarning', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="stepNav">
        <button id="prevStep"></button>
        <div id="stepContainer">
          <div id="step3" class="step"></div>
        </div>
        <button id="nextStep" disabled></button>
      </div>
    `;
    global.t = (key) => key;
    global.CharacterState = { classes: [] };
  });

  test('warning appended after stepNav and toggles visibility without affecting nav structure', async () => {
    initNextStepWarning();
    const stepNav = document.getElementById('stepNav');
    expect(stepNav.childElementCount).toBe(3);

    const warning = document.getElementById('nextStepWarning');
    expect(warning).not.toBeNull();
    expect(stepNav.nextElementSibling).toBe(warning);

    const nextBtn = document.getElementById('nextStep');
    expect(warning.classList.contains('hidden')).toBe(false);

    nextBtn.disabled = false;
    await new Promise((r) => setTimeout(r, 0));

    expect(warning.classList.contains('hidden')).toBe(true);
    expect(stepNav.childElementCount).toBe(3);
    expect(nextBtn.nextElementSibling).toBeNull();
  });
});
