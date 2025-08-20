export function convertDetailsToAccordion(container) {
  if (!container) return;
  container.querySelectorAll('details').forEach(det => {
    const summary = det.querySelector('summary');
    const contentNodes = Array.from(det.childNodes).filter(n => n !== summary);
    const item = document.createElement('div');
    const classes = ['accordion-item', 'feature-block', ...det.classList];
    item.className = classes.join(' ');
    if (det.id) item.id = det.id;

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'accordion-header';
    header.innerHTML = summary ? summary.innerHTML : '';
    item.appendChild(header);

    const content = document.createElement('div');
    content.className = 'accordion-content';
    contentNodes.forEach(n => content.appendChild(n));
    item.appendChild(content);

    det.replaceWith(item);
  });
}

export function initializeAccordion(root) {
  if (!root) return;

  root.querySelectorAll('.accordion-header').forEach((header, index) => {
    const content = header.nextElementSibling;

    // Apply ARIA roles and relationships
    header.setAttribute('role', 'button');
    if (!header.hasAttribute('tabindex')) header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'false');

    if (content) {
      const headerId = header.id || `accordion-header-${index}`;
      header.id = headerId;
      content.setAttribute('role', 'region');
      content.setAttribute('aria-labelledby', headerId);
    }

    const toggleAccordion = () => {
      const expanded = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', String(!expanded));
      header.classList.toggle('active', !expanded);
      if (content) {
        content.classList.toggle('show', !expanded);
      }
      header.focus();
    };

    header.addEventListener('click', toggleAccordion);
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleAccordion();
      }
    });
  });
}
