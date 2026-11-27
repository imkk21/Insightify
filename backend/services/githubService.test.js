const test = require('node:test');
const assert = require('node:assert');
const { computeStreaks, sumDays, languageShares } = require('./githubService');

const days = (...counts) => counts.map((count, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, count }));

test('streaks: current run ending today', () => {
  assert.deepStrictEqual(computeStreaks(days(1, 0, 2, 3, 1)), { current: 3, longest: 3 });
});

test('streaks: zero today does not break current streak', () => {
  assert.deepStrictEqual(computeStreaks(days(1, 1, 0, 4, 2, 0)), { current: 2, longest: 2 });
});

test('streaks: zero yesterday and today ends it', () => {
  assert.deepStrictEqual(computeStreaks(days(5, 5, 5, 0, 0)), { current: 0, longest: 3 });
});

test('streaks: empty calendar', () => {
  assert.deepStrictEqual(computeStreaks([]), { current: 0, longest: 0 });
});

test('sumDays: this week and last week', () => {
  const d = days(...Array(14).fill(0).map((_, i) => i + 1)); // 1..14
  assert.strictEqual(sumDays(d, 7), 8 + 9 + 10 + 11 + 12 + 13 + 14);
  assert.strictEqual(sumDays(d, 7, 7), 1 + 2 + 3 + 4 + 5 + 6 + 7);
});

test('languageShares: aggregates bytes across repos', () => {
  const repos = [
    { languages: { edges: [{ size: 300, node: { name: 'JS' } }, { size: 100, node: { name: 'CSS' } }] } },
    { languages: { edges: [{ size: 600, node: { name: 'JS' } }] } },
    { languages: null },
  ];
  assert.deepStrictEqual(languageShares(repos), [{ name: 'JS', pct: 90 }, { name: 'CSS', pct: 10 }]);
});
