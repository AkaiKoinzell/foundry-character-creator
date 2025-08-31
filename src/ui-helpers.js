import { t } from './i18n.js';

export function capitalize(str) {
  return str.replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}

export function createElement(tag, text) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  return el;
}

export function parse5eLinks(str) {
  const TOKEN_URLS = {
    spell: 'spells',
    condition: 'conditions',
    item: 'items',
    class: 'classes',
    skill: 'skills',
    feat: 'feats',
    race: 'races',
    background: 'backgrounds',
    monster: 'bestiary',
  };

  return (str || '').replace(/\{@(\w+)\s([^}|]+)(?:\|[^}]+)?}/g, (match, type, name) => {
    const base = TOKEN_URLS[type.toLowerCase()];
    if (!base) return match;
    const slug = encodeURIComponent(name.trim().toLowerCase());
    return `<a href="https://5e.tools/#${base}:${slug}" target="_blank" rel="noopener noreferrer">${name}</a>`;
  });
}

export function appendEntries(container, entries) {
  (entries || []).forEach(e => {
    if (!e) return;
    if (typeof e === 'string') {
      const p = document.createElement('p');
      p.innerHTML = parse5eLinks(e);
      container.appendChild(p);
    } else if (typeof e === 'object') {
      if (e.description) {
        const p = document.createElement('p');
        p.innerHTML = parse5eLinks(e.description);
        container.appendChild(p);
      }
      if (typeof e.entry === 'string') {
        const p = document.createElement('p');
        p.innerHTML = parse5eLinks(e.entry);
        container.appendChild(p);
      }
      if (Array.isArray(e.entries)) appendEntries(container, e.entries);
      else if (e.name && !e.entry && !e.entries && !e.description) {
        const p = document.createElement('p');
        p.innerHTML = parse5eLinks(e.name);
        container.appendChild(p);
      }
    }
  });
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

export function createSelectableCard(
  title,
  description,
  details = null,
  onClick = null,
  detailsButtonText = t('details'),
  onDetailsClick = null
) {
  const card = document.createElement('div');
  card.className = 'class-card';
  if (onClick) card.addEventListener('click', onClick);

  if (title) card.appendChild(createElement('h3', title));
  if (description) card.appendChild(createElement('p', description));

  const detailItems = Array.isArray(details)
    ? details.filter(Boolean)
    : details
    ? [details]
    : [];
  let detailContainer = null;
  if (detailItems.length) {
    detailContainer = document.createElement('div');
    detailContainer.className = 'race-details hidden';
    detailItems.forEach(d => {
      if (typeof d === 'string') detailContainer.appendChild(createElement('p', d));
      else detailContainer.appendChild(d);
    });
    card.appendChild(detailContainer);
  }

  if (detailItems.length || onDetailsClick) {
    const btn = createElement('button', detailsButtonText);
    btn.className = 'btn btn-primary';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (onDetailsClick) onDetailsClick(e);
      else if (detailContainer) detailContainer.classList.toggle('hidden');
    });
    card.appendChild(btn);
  }

  return card;
}

export function markIncomplete(section, isValid) {
  if (!section) return;
  section.classList.add('needs-selection');
  section.classList.toggle('incomplete', !isValid);
}

export function initNextStepWarning() {
  const nextBtn = document.getElementById('nextStep');
  if (!nextBtn) return;

  const warn = document.createElement('div');
  warn.id = 'nextStepWarning';
  warn.className = 'next-step-warning hidden';
  nextBtn.insertAdjacentElement('afterend', warn);

  const messages = {
    step3: t('selectRaceToProceed'),
    step4: t('selectBackgroundToProceed'),
    step5: t('chooseEquipmentToProceed'),
    step6: t('assignAbilityPointsToProceed'),
  };

  const updateWarning = () => {
    const active = document.querySelector('.step:not(.hidden)');
    let msg = active ? messages[active.id] : null;

    if (active?.id === 'step2' && nextBtn.disabled) {
      const hasClass = (globalThis.CharacterState?.classes || []).length > 0;
      if (!hasClass) {
        msg = t('selectClassToProceed');
      } else if (document.querySelector('#step2 .needs-selection.incomplete')) {
        msg = t('completeClassChoicesToProceed');
      }
    }

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
      childList: true,
      subtree: true,
      attributeFilter: ['class'],
    });
  }

  updateWarning();
}

document.addEventListener('DOMContentLoaded', initNextStepWarning);
