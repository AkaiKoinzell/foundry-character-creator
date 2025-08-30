import { t } from '../src/i18n.js';

describe('i18n replacements', () => {
  test('replaces all occurrences of a key', () => {
    expect(t('Hello {name}, {name}!', { name: 'Alice' })).toBe(
      'Hello Alice, Alice!'
    );
  });
});

