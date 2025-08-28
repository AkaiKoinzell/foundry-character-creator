export function createElement(tag, text) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  return el;
}

export function createAccordionItem(title, content, isChoice = false, description = '') {
  const item = document.createElement('div');
  item.className = 'accordion-item' + (isChoice ? ' user-choice' : '');

  const header = document.createElement('button');
  header.className = 'accordion-header';

  if (description) {
    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    const descSpan = document.createElement('small');
    descSpan.textContent = ` - ${description}`;
    header.append(titleSpan, descSpan);
  } else {
    header.textContent = title;
  }

  const body = document.createElement('div');
  body.className = 'accordion-content';
  if (typeof content === 'string') body.textContent = content;
  else body.appendChild(content);

  header.addEventListener('click', () => {
    header.classList.toggle('active');
    body.classList.toggle('show');
  });

  item.append(header, body);
  return item;
}

export function initNextStepWarning() {
  const nextBtn = document.getElementById('nextStep');
  if (!nextBtn) return;

  const warn = document.createElement('div');
  warn.id = 'nextStepWarning';
  warn.className = 'next-step-warning hidden';
  nextBtn.insertAdjacentElement('afterend', warn);

  const messages = {
    step2: 'Select a class to proceed.',
    step3: 'Select a race to proceed.',
    step4: 'Select a background to proceed.',
    step5: 'Choose your equipment to proceed.',
    step6: 'Assign all ability points to proceed.',
  };

  const updateWarning = () => {
    const active = document.querySelector('.step:not(.hidden)');
    const msg = active ? messages[active.id] : null;
    if (nextBtn.disabled && msg) {
      warn.textContent = msg;
      warn.classList.remove('hidden');
    } else {
      warn.classList.add('hidden');
    }
  };

  new MutationObserver(updateWarning).observe(nextBtn, {
    attributes: true,
    attributeFilter: ['disabled'],
  });

  const stepContainer = document.getElementById('stepContainer');
  if (stepContainer) {
    new MutationObserver(updateWarning).observe(stepContainer, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class'],
    });
  }

  updateWarning();
}

document.addEventListener('DOMContentLoaded', initNextStepWarning);
