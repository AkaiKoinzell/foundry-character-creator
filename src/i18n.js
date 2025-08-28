export const config = {
  language: 'it',
};

let translations = {};

export async function loadTranslations(lang = config.language) {
  const res = await fetch(`src/i18n/${lang}.json`);
  if (!res.ok) throw new Error(`Missing translations for ${lang}`);
  translations = await res.json();
}

export async function initI18n() {
  await loadTranslations(config.language);
}

export function t(key, params = {}) {
  let str = translations[key] || key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replace(`{${k}}`, v);
  }
  return str;
}

export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key));
  });
}
