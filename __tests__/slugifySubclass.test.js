let slugifySubclass;

beforeAll(async () => {
  global.document = { addEventListener: () => {} };
  ({ slugifySubclass } = await import('../src/step2.js'));
});

describe('slugifySubclass', () => {
  test.each([
    ['Path of the Ancestral Guardian', 'ancestral_guardian'],
    ['Circle of the Land (Desert)', 'desert'],
    ['Circle of the Land', 'land'],
    ['Purple Dragon Knight (Banneret)', 'purple_dragon_knight_banneret'],
    ['The Undying', 'undying'],
    ['The Order of the Awakened', 'awakened'],
  ])('%s -> %s', (input, expected) => {
    expect(slugifySubclass(input)).toBe(expected);
  });
});
