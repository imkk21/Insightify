const test = require('node:test');
const assert = require('node:assert');
const { local, deepWorkBlocks, shares, bestWindow, analyzeFlow, burnoutRisk, scoreTracks, trailingStreak } = require('./flowService');

const NOW = Date.parse('2026-11-27T12:00:00Z'); // Friday
const DAY = 864e5;
const at = (iso) => ({ date: iso });
// `n` consecutive calendar days ending at NOW, counts from fn(i) (i=0 oldest)
const cal = (n, fn) => Array.from({ length: n }, (_, i) => ({
  date: new Date(NOW - (n - 1 - i) * DAY).toISOString().slice(0, 10), count: fn(i),
}));

test('local: timezone offset shifts hour, weekday and day', () => {
  // 2026-11-27 20:00Z is Sat 01:30 in IST (+330)
  assert.deepStrictEqual(local('2026-11-27T20:00:00Z', 330), { hour: 1, weekday: 6, day: '2026-11-28' });
  assert.deepStrictEqual(local('2026-11-27T02:00:00Z', -300), { hour: 21, weekday: 4, day: '2026-11-26' });
});

test('deepWorkBlocks: ≥3 commits within 3h form a block; sparse commits do not', () => {
  const commits = [
    at('2026-11-20T09:00:00Z'), at('2026-11-20T10:00:00Z'), at('2026-11-20T11:59:00Z'), // block (3 in <3h)
    at('2026-11-20T15:00:00Z'), at('2026-11-20T19:00:00Z'),                              // scattered
    at('2026-11-21T10:00:00Z'), at('2026-11-21T10:10:00Z'), at('2026-11-21T10:20:00Z'), at('2026-11-21T12:30:00Z'), // block of 4
  ];
  const blocks = deepWorkBlocks(commits.reverse()); // order-independent
  assert.deepStrictEqual(blocks.map((b) => b.commits), [3, 4]);
  assert.strictEqual(deepWorkBlocks([at('2026-11-20T09:00:00Z'), at('2026-11-20T12:01:00Z'), at('2026-11-20T12:02:00Z')]).length, 0);
});

test('shares: late-night and weekend depend on timezone', () => {
  const commits = [at('2026-11-27T18:00:00Z'), at('2026-11-27T10:00:00Z')]; // Fri
  assert.deepStrictEqual(shares(commits, 0), { total: 2, lateNight: 0, weekend: 0 });
  // IST: 23:30 Fri (late) and 15:30 Fri
  assert.strictEqual(shares(commits, 330).lateNight, 0.5);
  // UTC+14: Sat 08:00 and Sat 00:00 (late, weekend)
  assert.deepStrictEqual(shares(commits, 840), { total: 2, lateNight: 0.5, weekend: 1 });
});

test('bestWindow wraps midnight', () => {
  const hours = Array(24).fill(0);
  hours[22] = 5; hours[23] = 5; hours[0] = 5; hours[10] = 4;
  assert.deepStrictEqual(bestWindow(hours), { start: 22, end: 1, width: 3, share: 15 / 19, label: '10pm–1am' });
});

test('analyzeFlow: score and weekly series stay within 0–100', () => {
  const empty = analyzeFlow({ calendar: cal(60, () => 0), commits: [], now: NOW });
  assert.strictEqual(empty.score, 20); // only recovery (rested) counts
  assert.strictEqual(empty.weekly.length, 8);

  const commits = [];
  for (let d = 0; d < 7; d++) for (let h = 0; h < 4; h++) commits.push(at(new Date(NOW - d * DAY - 2 * 3600e3 - h * 1800e3).toISOString()));
  const busy = analyzeFlow({ calendar: cal(60, (i) => (i % 7 === 3 ? 0 : 6)), commits, now: NOW });
  for (const w of [busy, ...busy.weekly]) assert.ok(w.score >= 0 && w.score <= 100, `score ${w.score}`);
  assert.ok(busy.score > 80, `busy, regular week should score high, got ${busy.score}`);
  assert.strictEqual(busy.subscores.deepWork, 100);
  assert.strictEqual(busy.subscores.rhythm, 100);
  assert.ok(busy.weekly.slice(0, 6).every((w) => w.estimated), 'old weeks have no commit sample');
});

test('burnoutRisk: calm baseline → low; late nights + no rest + spike → high', () => {
  const calm = burnoutRisk({ calendar: cal(60, (i) => (i % 7 < 5 ? 3 : 0)), commits: [], now: NOW });
  assert.strictEqual(calm.risk, 'low');
  assert.strictEqual(calm.signals.length, 0);
  assert.ok(calm.suggestions.length >= 1);

  const commits = [];
  for (let d = 15; d < 50; d += 2) commits.push(at(new Date(NOW - d * DAY).toISOString().slice(0, 10) + 'T14:00:00Z'));
  for (let d = 0; d < 14; d++) commits.push(at(new Date(NOW - d * DAY).toISOString().slice(0, 10) + 'T23:30:00Z'));
  const calendar = cal(60, (i) => (i >= 46 ? (i < 53 ? 20 : 4) : i % 7 < 5 ? 2 : 0)); // 14 active days, spike then drop
  const hot = burnoutRisk({ calendar, commits, now: NOW });
  assert.strictEqual(hot.risk, 'high');
  assert.deepStrictEqual(hot.signals.map((s) => s.id).sort(), ['late', 'streak', 'volatility']);
  assert.match(hot.signals.find((s) => s.id === 'late').text, /rose from 0% to 100%/);
  assert.ok(hot.suggestions.length <= 3);

  const elevated = burnoutRisk({ calendar: cal(60, (i) => (i % 7 < 5 ? 3 : 0)), commits, now: NOW });
  assert.strictEqual(elevated.risk, 'elevated');
});

test('trailingStreak ignores an empty today', () => {
  assert.strictEqual(trailingStreak([{ count: 0 }, { count: 1 }, { count: 2 }, { count: 0 }]), 2);
  assert.strictEqual(trailingStreak([{ count: 1 }, { count: 0 }, { count: 2 }]), 1);
});

test('scoreTracks: commits within ±45 min, deep-work commits count double', () => {
  const track = (id) => ({ id, uri: `spotify:track:${id}`, name: id, artists: [{ name: 'A' }], album: { images: [{ url: 'x' }] } });
  const commits = [
    at('2026-11-27T10:00:00Z'), at('2026-11-27T10:20:00Z'), at('2026-11-27T10:40:00Z'), // deep-work block
    at('2026-11-27T18:00:00Z'),                                                          // lone commit
  ];
  const plays = [
    { played_at: '2026-11-27T10:15:00Z', track: track('deep') },  // 3 block commits → 6
    { played_at: '2026-11-27T18:30:00Z', track: track('lone') },  // 1 commit → 1
    { played_at: '2026-11-27T18:40:00Z', track: track('lone') },  // +1 → 2
    { played_at: '2026-11-27T14:00:00Z', track: track('none') },  // nothing nearby
    { played_at: 'garbage', track: track('bad') },
  ];
  const ranked = scoreTracks(plays, commits);
  assert.deepStrictEqual(ranked.map((t) => [t.id, t.score, t.plays, t.match]), [['deep', 6, 1, 100], ['lone', 2, 2, 33]]);
  assert.strictEqual(ranked[0].image, 'x');
  assert.deepStrictEqual(scoreTracks(plays, []), []);
});
