const test = require('node:test');
const assert = require('node:assert');
const r = require('./roomsService');

const NOW = Date.parse('2026-11-27T12:00:00Z'); // a Friday

test('invite codes: 8 unambiguous chars, valid, unique-ish', () => {
  const codes = new Set(Array.from({ length: 500 }, () => r.generateCode()));
  assert.ok(codes.size > 495);
  for (const c of codes) {
    assert.match(c, /^[A-Z2-9]{8}$/);
    assert.doesNotMatch(c, /[01ILO]/);
    assert.ok(r.isValidCode(c));
  }
  for (const bad of ['abcdefgh', 'ABCDEFG', 'ABCDEFGHJ', 'ABCDEF0H', 'ABCDEFIH', 'ABCD EFG', null, 12345678]) {
    assert.strictEqual(r.isValidCode(bad), false, String(bad));
  }
});

test('cleanText: trims, collapses whitespace, enforces length', () => {
  assert.strictEqual(r.cleanText('  hi \n there ', 40), 'hi there');
  assert.strictEqual(r.cleanText('x'.repeat(41), 40), null);
  assert.strictEqual(r.cleanText('x'.repeat(40), 40), 'x'.repeat(40));
  assert.strictEqual(r.cleanText('   ', 40), null);
  assert.strictEqual(r.cleanText('', 80, { allowEmpty: true }), '');
  assert.strictEqual(r.cleanText(42, 40), null);
  assert.strictEqual(r.cleanText({ $gt: '' }, 40), null);
});

test('presence: focusing > online (<45s) > offline', () => {
  const ago = (s) => new Date(NOW - s * 1000);
  assert.strictEqual(r.presenceOf({ lastSeen: ago(10) }, NOW), 'online');
  assert.strictEqual(r.presenceOf({ lastSeen: ago(44) }, NOW), 'online');
  assert.strictEqual(r.presenceOf({ lastSeen: ago(46) }, NOW), 'offline');
  assert.strictEqual(r.presenceOf({}, NOW), 'offline');
  assert.strictEqual(r.presenceOf({ lastSeen: ago(3600), focusUntil: new Date(NOW + 60000) }, NOW), 'focusing');
  assert.strictEqual(r.presenceOf({ lastSeen: ago(5), focusUntil: new Date(NOW - 1) }, NOW), 'online');
});

test('heartbeat throttle: ignore within 10s', () => {
  assert.strictEqual(r.heartbeatThrottled(new Date(NOW - 5000), NOW), true);
  assert.strictEqual(r.heartbeatThrottled(new Date(NOW - 11000), NOW), false);
  assert.strictEqual(r.heartbeatThrottled(null, NOW), false);
});

test('timer remaining', () => {
  const t = { startedAt: new Date(NOW - 5 * 60000), minutes: 25 };
  assert.strictEqual(r.timerRemaining(t, NOW), 20 * 60000);
  assert.strictEqual(r.timerRemaining({ startedAt: new Date(NOW - 60 * 60000), minutes: 50 }, NOW), 0);
  assert.strictEqual(r.timerRemaining(null, NOW), null);
  assert.strictEqual(r.timerEnd(t).getTime(), NOW + 20 * 60000);
});

const cal = [
  { date: '2026-11-01', count: 3 },
  { date: '2026-11-02', count: 1 },
  { date: '2026-11-03', count: 0 },
  { date: '2026-11-04', count: 2 },
  { date: '2026-11-05', count: 5 },
  { date: '2026-11-06', count: 1 },
  { date: '2026-11-08', count: 4 }, // 11-07 missing → breaks the run
  { date: '2026-11-09', count: 0 },
];

test('metricValue: each metric respects the window', () => {
  assert.strictEqual(r.metricValue(cal, 'contributions', '2026-11-01', '2026-11-30'), 16);
  assert.strictEqual(r.metricValue(cal, 'contributions', '2026-11-02', '2026-11-05'), 8);
  assert.strictEqual(r.metricValue(cal, 'activeDays', '2026-11-01', '2026-11-30'), 6);
  assert.strictEqual(r.metricValue(cal, 'activeDays', '2026-11-03', '2026-11-04'), 1);
  assert.strictEqual(r.metricValue(cal, 'streak', '2026-11-01', '2026-11-30'), 3);
  assert.strictEqual(r.metricValue(cal, 'streak', '2026-11-05', '2026-11-30'), 2);
  assert.strictEqual(r.metricValue(cal, 'streak', '2026-11-08', '2026-11-08'), 1);
  assert.strictEqual(r.metricValue([], 'streak', '2026-11-01', '2026-11-30'), 0);
  // unsorted input still works
  assert.strictEqual(r.metricValue([...cal].reverse(), 'streak', '2026-11-01', '2026-11-30'), 3);
});

test('leaderboard: sorted, ties share rank, completion, missing data', () => {
  const rows = [
    { uid: 'a', name: 'Ann', calendar: cal },
    { uid: 'b', name: 'Bob', calendar: [{ date: '2026-11-02', count: 16 }] },
    { uid: 'c', name: 'Cat', calendar: null },
    { uid: 'd', name: 'Dan', calendar: [{ date: '2026-11-02', count: 2 }] },
  ];
  const lb = r.leaderboard(rows, 'contributions', '2026-11-01', '2026-11-30', 10);
  assert.deepStrictEqual(lb.map((x) => [x.uid, x.value, x.rank, x.completed]), [
    ['a', 16, 1, true], ['b', 16, 1, true], ['d', 2, 3, false], ['c', 0, 4, false],
  ]);
  assert.strictEqual(lb[3].noData, true);
  assert.ok(!('calendar' in lb[0]));
});

test('weekWindow: Monday → today (UTC)', () => {
  assert.deepStrictEqual(r.weekWindow(NOW), { start: '2026-11-23', end: '2026-11-27' });
  assert.deepStrictEqual(r.weekWindow(Date.parse('2026-11-23T00:30:00Z')), { start: '2026-11-23', end: '2026-11-23' });
  assert.deepStrictEqual(r.weekWindow(Date.parse('2026-11-29T23:00:00Z')), { start: '2026-11-23', end: '2026-11-29' });
});

test('challengeStatus', () => {
  assert.strictEqual(r.challengeStatus({ startDate: '2026-11-28', endDate: '2026-12-05' }, NOW), 'upcoming');
  assert.strictEqual(r.challengeStatus({ startDate: '2026-11-20', endDate: '2026-11-27' }, NOW), 'active');
  assert.strictEqual(r.challengeStatus({ startDate: '2026-11-01', endDate: '2026-11-26' }, NOW), 'ended');
});

test('validateChallenge', () => {
  const ok = { title: ' Ship it ', metric: 'streak', target: '7', startDate: '2026-11-01', endDate: '2026-11-30' };
  assert.deepStrictEqual(r.validateChallenge(ok).value, { title: 'Ship it', metric: 'streak', target: 7, startDate: '2026-11-01', endDate: '2026-11-30' });
  assert.ok(r.validateChallenge({ ...ok, title: 'x'.repeat(61) }).error);
  assert.ok(r.validateChallenge({ ...ok, metric: 'loc' }).error);
  assert.ok(r.validateChallenge({ ...ok, target: 0 }).error);
  assert.ok(r.validateChallenge({ ...ok, target: 2.5 }).error);
  assert.ok(r.validateChallenge({ ...ok, startDate: '2026-02-30' }).error);
  assert.ok(r.validateChallenge({ ...ok, startDate: '2026-12-01' }).error);
  assert.ok(r.validateChallenge({ ...ok, endDate: '2028-01-01' }).error);
  assert.ok(r.validateChallenge(undefined).error);
});

test('validatePlaylist + isGithubUrl', () => {
  assert.deepStrictEqual(r.validatePlaylist({ id: '37i9dQZF1DX', name: 'Lofi', image: 'https://i.scdn.co/x.jpg' }).value,
    { id: '37i9dQZF1DX', name: 'Lofi', image: 'https://i.scdn.co/x.jpg' });
  assert.strictEqual(r.validatePlaylist({ id: 'abc', name: 'x', image: 'javascript:alert(1)' }).value.image, '');
  assert.ok(r.validatePlaylist({ id: '../x', name: 'x' }).error);
  assert.deepStrictEqual(r.validatePlaylist(null), { value: null });
  assert.ok(r.isGithubUrl('https://github.com/o/r/commit/abc'));
  assert.ok(!r.isGithubUrl('https://evil.com/github.com'));
  assert.ok(!r.isGithubUrl('http://github.com/o/r'));
});

test('buildFeed: last 7 days, merged, deduped, kudos', () => {
  const members = [{ uid: 'a', name: 'Ann' }, { uid: 'b', name: 'Bob' }];
  const day = (n) => new Date(NOW - n * 86400000).toISOString();
  const stats = {
    a: {
      recentCommits: [
        { repo: 'a/x', message: 'fix bug\n\nbody', sha: '1', date: day(1), url: 'https://github.com/a/x/commit/1' },
        { repo: 'a/x', message: 'old', sha: '2', date: day(9), url: 'https://github.com/a/x/commit/2' },
      ],
      pullRequests: [{ title: 'PR', url: 'https://github.com/a/x/pull/1', state: 'OPEN', createdAt: day(0.5), repo: 'a/x' }],
    },
    b: { recentCommits: [{ repo: 'a/x', message: 'dup', sha: '1', date: day(1), url: 'https://github.com/a/x/commit/1' }] },
  };
  const kudos = [
    { itemUrl: 'https://github.com/a/x/pull/1', fromUid: 'b' },
    { itemUrl: 'https://github.com/a/x/pull/1', fromUid: 'gone' },
  ];
  const feed = r.buildFeed(members, stats, kudos, 'b', NOW);
  assert.deepStrictEqual(feed.map((i) => i.type), ['pr', 'commit']);
  assert.strictEqual(feed[1].title, 'fix bug');
  assert.deepStrictEqual(feed[0].kudos, { count: 2, mine: true, from: ['Bob', 'Former member'] });
  assert.deepStrictEqual(feed[1].kudos, { count: 0, mine: false, from: [] });
});

test('publicRoom: presence attached, no stray fields', () => {
  const room = {
    code: 'ABCDEFGH', name: 'R', emoji: '🚀', color: 'accent', ownerUid: 'a', createdAt: new Date(NOW), timer: {}, playlist: {},
    members: [{ uid: 'a', name: 'Ann', email: 'leak@x.com', lastSeen: new Date(NOW) }],
  };
  const p = r.publicRoom(room, NOW);
  assert.strictEqual(p.timer, null);
  assert.strictEqual(p.playlist, null);
  assert.strictEqual(p.members[0].presence, 'online');
  assert.ok(!('email' in p.members[0]));
});
