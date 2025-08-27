export function createAccordionItem(title, content, isChoice = false, description = '') {
  const item = document.createElement('div');
  item.className = 'accordion-item' + (isChoice ? ' user-choice' : '');

  const header = document.createElement('button');
  header.className = 'accordion-header';
  header.textContent = title;

  const desc = description ? document.createElement('div') : null;
  if (desc) {
    desc.className = 'accordion-description';
    desc.textContent = description;
  }

  const body = document.createElement('div');
  body.className = 'accordion-content';
  if (typeof content === 'string') body.textContent = content;
  else body.appendChild(content);

  header.addEventListener('click', () => {
    header.classList.toggle('active');
    body.classList.toggle('show');
  });

  item.appendChild(header);
  if (desc) item.appendChild(desc);
  item.appendChild(body);
  return item;
}
