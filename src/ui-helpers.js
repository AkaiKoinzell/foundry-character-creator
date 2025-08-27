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
    header.appendChild(titleSpan);
    header.appendChild(descSpan);
  } else {
    header.textContent = title;
  }

  const body = document.createElement('div');
  body.className = 'accordion-content';
  if (typeof content === 'string') {
    body.textContent = content;
  } else {
    body.appendChild(content);
  }
  header.addEventListener('click', () => {
    header.classList.toggle('active');
    body.classList.toggle('show');
  });

  item.appendChild(header);
  item.appendChild(body);
  return item;
}

