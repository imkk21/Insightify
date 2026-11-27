const test = require('node:test');
const assert = require('node:assert');
const { collectActivity, templateStandup, templateWeekly, standupSince, toSlackMrkdwn } = require('./reportService');

const now = new Date('2026-11-25T10:00:00Z'); // a Wednesday
const ago = (h) => new Date(now - h * 3600e3).toISOString();

const gh = {
  weeklyContributions: 9, lastWeekContributions: 4, streak: { current: 3, longest: 10 },
  recentCommits: [
    { repo: 'api', message: 'Add auth', date: ago(2) },
    { repo: 'api', message: 'Fix tests', date: ago(5) },
    { repo: 'web', message: 'New header', date: ago(30) },   // outside standup window
    { repo: 'old', message: 'Ancient', date: ago(24 * 10) }, // outside week
  ],
  pullRequests: [{ title: 'Auth flow', url: 'https://github.com/x/api/pull/1', state: 'OPEN', createdAt: ago(3) }],
};
const tasks = [
  { title: 'Ship auth', status: 'done', updatedAt: ago(1) },
  { title: 'Write docs', status: 'in-progress', updatedAt: ago(50) },
  { title: 'Plan v3', status: 'todo', updatedAt: ago(50) },
];

test('standup window: 24h midweek, 72h on Monday', () => {
  assert.strictEqual(now - standupSince(now), 24 * 3600e3);
  const monday = new Date('2026-11-23T10:00:00Z');
  assert.strictEqual(monday - standupSince(monday), 72 * 3600e3);
});

test('collectActivity filters by window and groups by repo', () => {
  const a = collectActivity(gh, tasks, standupSince(now));
  assert.deepStrictEqual(Object.keys(a.byRepo), ['api']);
  assert.strictEqual(a.commits.length, 2);
  assert.strictEqual(a.prs.length, 1);
  assert.deepStrictEqual(a.done.map((t) => t.title), ['Ship auth']);
});

test('standup template has the three sections and real items', () => {
  const md = templateStandup(collectActivity(gh, tasks, standupSince(now)));
  assert.match(md, /## Yesterday\n- \*\*api\*\*: Add auth; Fix tests/);
  assert.match(md, /Finished: Ship auth/);
  assert.match(md, /## Today\n- Continue: Write docs/);
  assert.match(md, /## Blockers/);
});

test('weekly template counts and compares', () => {
  const md = templateWeekly(collectActivity(gh, tasks, new Date(now - 7 * 24 * 3600e3)), gh);
  assert.match(md, /9 contributions this week \(\+5 vs last week\)/);
  assert.match(md, /3 commits across 2 repositories/);
  assert.doesNotMatch(md, /Ancient/);
});

test('empty data still produces a valid report', () => {
  const md = templateStandup(collectActivity(null, [], standupSince(now)));
  assert.match(md, /- No tracked activity/);
});

test('toSlackMrkdwn converts headings, bold, links, bullets', () => {
  assert.strictEqual(
    toSlackMrkdwn('## Today\n- **api**: see [PR](https://x.io/1)'),
    '*Today*\n• *api*: see <https://x.io/1|PR>'
  );
});
