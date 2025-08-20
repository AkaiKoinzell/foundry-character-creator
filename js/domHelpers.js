export function createHeader(text, level = 3) {
  const header = document.createElement(`h${level}`);
  header.textContent = text;
  return header;
}

export function createParagraph(text) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

export function createList(items, ordered = false) {
  const list = document.createElement(ordered ? 'ol' : 'ul');
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
  return list;
}
