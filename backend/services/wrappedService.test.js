const test = require('node:test');
const assert = require('node:assert');
const { wrappedStats } = require('./wrappedService');

test('wrappedStats: totals, busiest day/month, favourite weekday', () => {
  const gh = {
    calendar: [
      { date: '2026-01-05', count: 2 },  // Monday
      { date: '2026-01-06', count: 0 },
      { date: '2026-02-02', count: 9 },  // Monday
      { date: '2026-02-03', count: 1 },  // Tuesday
    ],
    streak: { longest: 4 },
    languages: [{ name: 'Go', pct: 70 }],
    totals: { commitsYear: 10, prsYear: 2, reviewsYear: 1 },
  };
  assert.deepStrictEqual(wrappedStats(gh), {
    from: '2026-01-05', to: '2026-02-03',
    contributions: 12, activeDays: 3,
    busiestDay: { date: '2026-02-02', count: 9 },
    busiestMonth: { month: 'Feb 2026', count: 10 },
    favoriteWeekday: 'Monday',
    longestStreak: 4, topLanguage: 'Go', commits: 10, pullRequests: 2, reviews: 1,
  });
});

test('wrappedStats: empty year has no "busiest" anything', () => {
  const w = wrappedStats({ calendar: [{ date: '2026-01-01', count: 0 }] });
  assert.strictEqual(w.contributions, 0);
  assert.strictEqual(w.busiestDay, null);
  assert.strictEqual(w.busiestMonth, null);
  assert.strictEqual(w.favoriteWeekday, null);
});
