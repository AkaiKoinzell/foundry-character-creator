import { CharacterState } from './data.js';
import { getProficiencyList } from './proficiency.js';

export function filterDuplicateOptions(selects, existingValues = [], otherSelects = []) {
  const counts = new Map();
  const add = (val) => {
    if (!val) return;
    counts.set(val, (counts.get(val) || 0) + 1);
  };
  const subtract = (val) => {
    if (!val) return;
    const newCount = (counts.get(val) || 0) - 1;
    if (newCount <= 0) counts.delete(val);
    else counts.set(val, newCount);
  };

  existingValues.forEach(add);

  selects.forEach((sel) => subtract(sel.value));
  otherSelects.forEach((sel) => subtract(sel.value));

  selects.forEach((sel) => add(sel.value));
  otherSelects.forEach((sel) => add(sel.value));

  selects.forEach((sel) => {
    Array.from(sel.options).forEach((opt) => {
      if (!opt.value) return;
      const count = counts.get(opt.value) || 0;
      const isCurrent = sel.value === opt.value;
      opt.disabled = !isCurrent && count > 0;
    });

    const currentCount = counts.get(sel.value) || 0;
    if (sel.value && currentCount > 1) {
      sel.value = '';
      sel.dispatchEvent(new Event('change'));
    }
  });
}

export function updateChoiceSelectOptions(
  selects,
  type,
  skillSelectsList = [],
  allSkillChoiceSelects = [],
) {
  if (type === 'skills') {
    const otherSelects = [
      ...skillSelectsList,
      ...allSkillChoiceSelects.filter((sel) => !selects.includes(sel)),
    ];
    filterDuplicateOptions(selects, getProficiencyList('skills'), otherSelects);
  } else {
    filterDuplicateOptions(selects, getProficiencyList(type));
  }
}

export function updateSkillSelectOptions(skillSelectsList, choiceSkillSelectsList = []) {
  filterDuplicateOptions(
    skillSelectsList,
    CharacterState.system.skills,
    choiceSkillSelectsList,
  );
}
