const DEFAULT_ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const DEFAULT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const MIN_SCORE = 8;
const MAX_SCORE = 15;
const BONUS_SELECTORS = ['bonusSelect1', 'bonusSelect2', 'bonusSelect3'];

/**
 * Controller that wires the point-buy UI to an arbitrary ability data source.
 * Consumers provide getter/setter callbacks for base and bonus ability scores
 * so the controller can stay agnostic of the underlying state container.
 */
export class PointBuyController {
  /**
   * @param {Object} options
   * @param {HTMLElement|null} options.container Root element containing the UI
   * @param {(ability: string) => number} options.getBase Returns the base score
   * @param {(ability: string, value: number) => void} options.setBase Persists the base score
   * @param {(ability: string) => number} options.getBonus Returns current bonus value
   * @param {(ability: string, value: number) => void} options.setBonus Persists a bonus value
   * @param {() => Record<string, number>} [options.getAppliedBonusCounts] Returns the last applied bonus distribution (by ability)
   * @param {(counts: Record<string, number>) => void} [options.setAppliedBonusCounts] Persists the last applied bonus distribution (by ability)
   * @param {number} [options.maxPoints=27] Total points available to spend
   * @param {string[]} [options.abilities] Ability codes to manage
   * @param {(remaining: number) => void} [options.onRemainingChange] Callback invoked after recalculating remaining points
   * @param {(isValid: boolean) => void} [options.onValidityChange] Callback invoked whenever the validity state changes
   * @param {() => number} [options.getLevel] Returns the effective character level for validation
   * @param {(message: string) => Promise<void>|void} [options.showMessage] Async-friendly message presenter
   * @param {(key: string) => string} [options.translate] Optional i18n helper
   */
  constructor({
    container,
    getBase,
    setBase,
    getBonus,
    setBonus,
    getAppliedBonusCounts,
    setAppliedBonusCounts,
    maxPoints = 27,
    abilities = DEFAULT_ABILITIES,
    onRemainingChange,
    onValidityChange,
    getLevel,
    showMessage,
    translate,
  }) {
    this.container = container || null;
    this.getBase = getBase;
    this.setBase = setBase;
    this.getBonus = getBonus;
    this.setBonus = setBonus;
    // Persisted record of the most recently applied "bonus selection" counts
    // (e.g. { dex: 2, con: 1 }). If not provided, falls back to an internal
    // ephemeral store so the controller remains backward compatible.
    this.getAppliedBonusCounts =
      typeof getAppliedBonusCounts === 'function'
        ? getAppliedBonusCounts
        : () => this._appliedBonusCounts || {};
    this.setAppliedBonusCounts =
      typeof setAppliedBonusCounts === 'function'
        ? setAppliedBonusCounts
        : (counts) => {
            this._appliedBonusCounts = { ...(counts || {}) };
          };
    this.maxPoints = maxPoints;
    this.abilities = abilities;
    this.onRemainingChange = onRemainingChange;
    this.onValidityChange = onValidityChange;
    this.getLevel = getLevel;
    this.showMessage = showMessage;
    this.translate = translate;
    this.isValid = true;
    this.pointsRemainingEl = null;
  }

  /**
   * Binds DOM listeners and performs the initial UI sync.
   */
  init() {
    if (!this.container) return;

    this.pointsRemainingEl = this.container.querySelector('#pointsRemaining');
    this.#wireButtons();
    this.updateAll();
  }

  /**
   * Exposes the computed remaining points.
   * @returns {number}
   */
  getRemainingPoints() {
    return this.#calculateRemaining();
  }

  /**
   * Re-synchronises every row, remaining total, and validation state.
   */
  updateAll() {
    this.abilities.forEach((ab) => this.updateAbilityRow(ab));
    this.#updateRemaining();
    this.#validate();
  }

  /**
   * Synchronises the displayed values for a single ability row.
   * @param {string} ability
   */
  updateAbilityRow(ability) {
    const base = this.#coerceScore(this.getBase?.(ability));
    const bonus = this.#coerceScore(this.getBonus?.(ability));
    const finalVal = base + bonus;

    const baseSpan = this.container?.querySelector(`#${ability}Points`);
    const bonusSpan = this.container?.querySelector(`#${ability}BonusModifier`);
    const finalCell = this.container?.querySelector(`#${ability}FinalScore`);

    if (baseSpan) baseSpan.textContent = String(base);
    if (bonusSpan) bonusSpan.textContent = String(bonus);
    if (finalCell) finalCell.textContent = String(finalVal);
  }

  /**
   * Registers the confirm button so the controller can toggle its disabled
   * state alongside validation. The caller is responsible for wiring the
   * click handler.
   * @param {HTMLButtonElement|null} button
   */
  setConfirmButton(button) {
    this.confirmButton = button || null;
    this.#applyConfirmState();
  }

  async applyBonusSelection() {
    if (!this.container) return false;
    const selections = BONUS_SELECTORS.map((id) =>
      this.container?.querySelector(`#${id}`)?.value?.trim() || ''
    );

    if (selections.some((val) => !val)) {
      await this.#showMessage('selectThreeAbilities');
      return false;
    }

    const counts = selections.reduce((acc, ability) => {
      acc[ability] = (acc[ability] || 0) + 1;
      return acc;
    }, {});

    const values = Object.values(counts);
    const isTwoPlusOne =
      Object.keys(counts).length === 2 && values.includes(2) && values.includes(1);
    const isThreeSingles =
      Object.keys(counts).length === 3 && values.every((val) => val === 1);

    if (!isTwoPlusOne && !isThreeSingles) {
      await this.#showMessage('invalidBonusDistribution');
      return false;
    }

    // Reset previously applied selection before applying the new one so
    // re-applying does not stack bonuses.
    const previous = this.getAppliedBonusCounts?.() || {};
    Object.entries(previous).forEach(([ability, prevInc]) => {
      const current = this.#coerceScore(this.getBonus?.(ability));
      const next = Math.max(0, current - (Number(prevInc) || 0));
      this.setBonus?.(ability, next);
    });

    // Apply new selection and persist as the latest applied distribution.
    Object.entries(counts).forEach(([ability, increment]) => {
      const current = this.#coerceScore(this.getBonus?.(ability));
      this.setBonus?.(ability, current + increment);
    });
    this.setAppliedBonusCounts?.(counts);

    this.updateAll();
    return true;
  }

  // Internal helpers -------------------------------------------------------

  #wireButtons() {
    this.abilities.forEach((ability) => {
      const incSelector = `[data-ability='${ability}'][data-action='increase']`;
      const decSelector = `[data-ability='${ability}'][data-action='decrease']`;

      const increase = this.#replaceButton(
        this.container?.querySelector(incSelector),
        () => this.#adjustAbility(ability, 1),
      );
      const decrease = this.#replaceButton(
        this.container?.querySelector(decSelector),
        () => this.#adjustAbility(ability, -1),
      );

      if (!increase && !decrease) {
        const baseSpan = this.container?.querySelector(`#${ability}Points`);
        const row = baseSpan?.closest('tr');
        if (!row) return;
        const rowButtons = row.querySelectorAll('button');
        if (rowButtons[0]) {
          this.#replaceButton(rowButtons[0], () => this.#adjustAbility(ability, 1));
        }
        if (rowButtons[1]) {
          this.#replaceButton(rowButtons[1], () => this.#adjustAbility(ability, -1));
        }
      }
    });

    const applyButton = this.container?.querySelector('#applyBonus');
    if (applyButton) {
      this.#replaceButton(applyButton, () => {
        void this.applyBonusSelection();
      });
    }
  }

  #replaceButton(button, handler) {
    if (!button) return null;
    const clone = button.cloneNode(true);
    clone.addEventListener('click', handler);
    button.replaceWith(clone);
    return clone;
  }

  #adjustAbility(ability, delta) {
    const current = this.#coerceScore(this.getBase?.(ability));
    const next = current + delta;
    if (Number.isNaN(current)) return;
    if (next < MIN_SCORE || next > MAX_SCORE) return;

    const costDiff = (DEFAULT_COST[next] || 0) - (DEFAULT_COST[current] || 0);
    const remaining = this.#calculateRemaining();
    if (delta > 0 && costDiff > remaining) return;

    this.setBase?.(ability, next);
    this.updateAbilityRow(ability);
    this.#updateRemaining();
    this.#validate();
  }

  #calculateRemaining() {
    return this.maxPoints - this.abilities.reduce((sum, ability) => {
      const base = this.#coerceScore(this.getBase?.(ability));
      return sum + (DEFAULT_COST[base] || 0);
    }, 0);
  }

  #updateRemaining() {
    const remaining = this.#calculateRemaining();
    if (this.pointsRemainingEl) {
      this.pointsRemainingEl.textContent = String(remaining);
    }
    this.onRemainingChange?.(remaining);
  }

  #validate() {
    const level = this.getLevel?.() ?? 1;
    const isLevelOne = level === 1;
    let invalid = false;

    this.abilities.forEach((ability) => {
      const finalCell = this.container?.querySelector(`#${ability}FinalScore`);
      const row = finalCell?.closest('tr');
      if (!row || !finalCell) return;

      let warning = finalCell.querySelector('small');
      if (!warning) {
        warning = document.createElement('small');
        warning.className = 'text-danger ms-2';
        finalCell.appendChild(warning);
      }

      const base = this.#coerceScore(this.getBase?.(ability));
      const bonus = this.#coerceScore(this.getBonus?.(ability));
      const total = base + bonus;

      if (isLevelOne && total > 17) {
        row.classList.add('incomplete');
        warning.textContent = this.#translate('maxScoreLevel1');
        invalid = true;
      } else {
        row.classList.remove('incomplete');
        warning.textContent = '';
      }
    });

    this.isValid = !invalid;
    this.#applyConfirmState();
    this.onValidityChange?.(!invalid);
  }

  #applyConfirmState() {
    if (this.confirmButton) {
      this.confirmButton.disabled = !this.isValid;
    }
  }

  #coerceScore(value) {
    const num = Number(value);
    if (Number.isNaN(num)) return MIN_SCORE;
    return num;
  }

  async #showMessage(key) {
    const message = this.#translate(key);
    if (typeof this.showMessage === 'function') {
      const maybePromise = this.showMessage(message, key);
      if (maybePromise && typeof maybePromise.then === 'function') {
        await maybePromise;
      }
    }
  }

  #translate(key) {
    if (typeof this.translate === 'function') {
      return this.translate(key);
    }
    return key;
  }
}

export const ABILITIES = DEFAULT_ABILITIES;
export const POINT_BUY_COST = DEFAULT_COST;
