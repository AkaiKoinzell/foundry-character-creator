let currentStep = 1;

function showStep(step) {
  for (let i = 1; i <= 7; i++) {
    const el = document.getElementById(`step${i}`);
    if (el) {
      el.style.display = i === step ? "block" : "none";
    }
  }
  const bar = document.getElementById("progressBar");
  if (bar) {
    bar.style.width = `${((step - 1) / 6) * 100}%`;
  }
  currentStep = step;
}

const DATA = {};

async function loadData() {
  const sources = {
    classes: "data/classes.json",
    races: "data/races.json",
    backgrounds: "data/backgrounds.json",
  };

  for (const [key, path] of Object.entries(sources)) {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(`Failed loading ${key}`);
    }
    const json = await res.json();
    DATA[key] = json.items;
  }
}

function populateSelect(id, dataKey) {
  const sel = document.getElementById(id);
  const entries = DATA[dataKey];
  if (!sel || !entries) return;
  for (const [name, value] of Object.entries(entries)) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = name;
    sel.appendChild(opt);
  }
}

function populateClassList() {
  populateSelect("classSelect", "classes");
}

function populateRaceList() {
  populateSelect("raceSelect", "races");
}

function populateBackgroundList() {
  populateSelect("backgroundSelect", "backgrounds");
}

document.addEventListener("DOMContentLoaded", () => {
  for (let i = 1; i <= 7; i++) {
    const btn = document.getElementById(`btnStep${i}`);
    if (btn) {
      btn.addEventListener("click", () => showStep(i));
    }
  }

  const resetBtn = document.getElementById("resetButton");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => location.reload());
  }

  showStep(currentStep);

  loadData()
    .then(() => {
      populateClassList();
      populateRaceList();
      populateBackgroundList();
    })
    .catch((err) => console.error(err));
});

export { showStep, loadData };
