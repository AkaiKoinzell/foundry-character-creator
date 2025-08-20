export function showStep(stepId) {
  // Salva i dati correnti prima di cambiare step
  saveFormData();

  const steps = document.querySelectorAll('.step');
  steps.forEach(step => {
    const isTarget = step.id === stepId;
    step.classList.toggle('active', isTarget);
    step.classList.toggle('hidden', !isTarget);
  });

  updateProgress(stepId);
  localStorage.setItem('currentStep', stepId);
}

function updateProgress(stepId) {
  const progressBar = document.getElementById('progressBar');
  if (!progressBar) return;
  const steps = Array.from(document.querySelectorAll('.step'));
  const index = steps.findIndex(step => step.id === stepId);
  const percent = ((index + 1) / steps.length) * 100;
  progressBar.style.width = `${percent}%`;
}

function saveFormData() {
  const fields = document.querySelectorAll('input, select, textarea');
  fields.forEach(field => {
    if (!field.id) return;
    if (field.type === 'checkbox' || field.type === 'radio') {
      localStorage.setItem(field.id, field.checked);
    } else {
      localStorage.setItem(field.id, field.value);
    }
  });
}

export function loadFormData() {
  const fields = document.querySelectorAll('input, select, textarea');
  fields.forEach(field => {
    if (!field.id) return;
    const stored = localStorage.getItem(field.id);
    if (stored !== null) {
      if (field.type === 'checkbox' || field.type === 'radio') {
        field.checked = stored === 'true';
      } else {
        field.value = stored;
      }
    }
  });
  return localStorage.getItem('currentStep');
}

export function resetForm() {
  if (!confirm('Reset all character data?')) return;
  localStorage.clear();
  const fields = document.querySelectorAll('input, select, textarea');
  fields.forEach(field => {
    if (field.type === 'checkbox' || field.type === 'radio') {
      field.checked = false;
    } else if (field.tagName.toLowerCase() === 'select') {
      field.selectedIndex = 0;
    } else {
      field.value = '';
    }
  });
  const steps = document.querySelectorAll('.step');
  steps.forEach((step, index) => {
    const show = index === 0;
    step.classList.toggle('active', show);
    step.classList.toggle('hidden', !show);
  });
  const progressBar = document.getElementById('progressBar');
  if (progressBar) progressBar.style.width = '0%';
}

window.resetForm = resetForm;
