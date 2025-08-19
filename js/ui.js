export function showStep(stepId) {
  const steps = document.querySelectorAll('.step');
  steps.forEach(step => {
    if (step.id === stepId) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  });
}
