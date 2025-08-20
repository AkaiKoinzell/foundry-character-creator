let extraSelections = [];
let currentSelectionIndex = 0;
let extraModalContext = '';

export function getExtraSelections() {
  return extraSelections;
}

export function setExtraSelections(selections) {
  extraSelections = selections;
}

export function getCurrentSelectionIndex() {
  return currentSelectionIndex;
}

export function setCurrentSelectionIndex(index) {
  currentSelectionIndex = index;
}

export function getExtraModalContext() {
  return extraModalContext;
}

export function setExtraModalContext(context) {
  extraModalContext = context;
}
