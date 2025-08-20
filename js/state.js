let selectedData = sessionStorage.getItem('selectedData')
  ? JSON.parse(sessionStorage.getItem('selectedData'))
  : {};

export function getSelectedData() {
  return selectedData;
}

export function setSelectedData(data) {
  selectedData = data;
  saveSelectedData();
}

export function saveSelectedData() {
  sessionStorage.setItem('selectedData', JSON.stringify(selectedData));
}

export function resetSelectedData() {
  selectedData = {};
  saveSelectedData();
}
