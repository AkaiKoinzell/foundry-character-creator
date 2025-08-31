/**
 * @jest-environment jsdom
 */
import { parse5eLinks, appendEntries } from '../src/ui-helpers.js';

describe('parse5eLinks', () => {
  test('converts condition token to anchor', () => {
    const input = 'You are {@condition charmed}.';
    const result = parse5eLinks(input);
    expect(result).toBe(
      'You are <a href="https://5e.tools/#conditions:charmed" target="_blank" rel="noopener noreferrer">charmed</a>.'
    );
  });

  test('leaves unknown token unchanged', () => {
    const input = 'An {@unknown foo} token.';
    expect(parse5eLinks(input)).toBe(input);
  });
});

describe('appendEntries', () => {
  test('uses parse5eLinks for string entries', () => {
    document.body.innerHTML = '<div id="c"></div>';
    const container = document.getElementById('c');
    appendEntries(container, ['{@spell Fireball}']);

    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe(
      'https://5e.tools/#spells:fireball'
    );
    expect(link.textContent).toBe('Fireball');
  });
});

