const test = require('node:test');
const assert = require('node:assert');
const s = require('./briefingService');

const now = new Date('2026-11-25T03:00:00Z'); // Wed 08:30 IST
const IST = -330;
const ago = (h) => new Date(now - h * 3600e3).toISOString();

const gh = {
  weeklyContributions: 12, lastWeekContributions: 8, streak: { current: 5, longest: 9 },
  languages: [{ name: 'JavaScript', pct: 60 }, { name: 'Python', pct: 30 }],
  recentCommits: [
    { repo: 'api', message: 'Add auth', date: ago(10) },
    { repo: 'api', message: 'Fix tests', date: ago(20) },
    { repo: 'web', message: 'Header', date: ago(30) },  // Tue 02:30 IST: inside yesterday window
    { repo: 'old', message: 'Ancient', date: ago(24 * 5) },
  ],
  pullRequests: [{ title: 'Auth flow', state: 'OPEN', createdAt: ago(12) }],
};
const tasks = [
  { title: 'Ship auth', status: 'in-progress', updatedAt: ago(1) },
  { title: 'Write docs', status: 'todo', updatedAt: ago(1) },
];
const scan = {
  totals: { bySeverity: { CRITICAL: 1, HIGH: 2 } },
  findings: [
    { repo: 'api', package: 'minimist', version: '1.2.0', severity: 'HIGH', fixedIn: '1.2.6' },
    { repo: 'web', package: 'lodash', version: '4.17.20', severity: 'CRITICAL', fixedIn: '4.17.21' },
  ],
};
const weather = {
  city: 'Pune', current: { temp: 23.6, feelsLike: 24.2, description: 'clear sky' },
  forecast: [{ date: '2026-11-25T06:30:00Z', tempMax: 29, description: 'clear sky' }, { date: '2026-11-26T06:30:00Z', tempMax: 27, description: 'light rain' }],
};
const news = { articles: [
  { title: 'Apple ships new laptop - The Verge', source: 'The Verge' },
  { title: 'Node.js 24 released with faster startup - InfoQ', source: 'InfoQ' },
  { title: 'Google cuts prices', source: 'Reuters' },
] };
const full = { user: { displayName: 'Kunal Sharma' }, gh, tasks, weather, scan, news, now, tz: IST };

test('localInfo: local date, greeting and working-day window', () => {
  const i = s.localInfo(now, IST);
  assert.strictEqual(i.date, '2026-11-25');
  assert.strictEqual(i.greeting, 'Good morning');
  assert.strictEqual(i.since.toISOString(), '2026-11-23T18:30:00.000Z'); // Tue 00:00 IST
  assert.strictEqual(s.localInfo(new Date('2026-11-25T13:00:00Z'), IST).greeting, 'Good evening');
});

test('Monday window covers the weekend (since Friday 00:00 local)', () => {
  const mon = s.localInfo(new Date('2026-11-23T03:00:00Z'), IST);
  assert.ok(mon.isMonday);
  assert.strictEqual(mon.since.toISOString(), '2026-11-19T18:30:00.000Z'); // Fri 00:00 IST
  const weekend = { recentCommits: [{ repo: 'side', message: 'Sat hack', date: '2026-11-21T10:00:00Z' }] };
  const d = s.buildBriefingData({ gh: weekend, now: new Date('2026-11-23T03:00:00Z'), tz: IST });
  assert.strictEqual(d.activity.commits, 1);
  assert.match(s.templateSections(d)[0].text, /Since Friday, you pushed 1 commit to side\./);
});

test('parseTz clamps garbage to 0', () => {
  assert.strictEqual(s.parseTz('-330'), -330);
  assert.strictEqual(s.parseTz('abc'), 0);
  assert.strictEqual(s.parseTz(99999), 0);
});

test('buildBriefingData + template with full data', () => {
  const d = s.buildBriefingData(full);
  assert.strictEqual(d.firstName, 'Kunal');
  assert.strictEqual(d.activity.commits, 3);
  assert.deepStrictEqual(d.activity.repos, ['api', 'web']);
  assert.strictEqual(d.delta, 4);
  assert.strictEqual(d.security.top.package, 'lodash');
  assert.strictEqual(d.weather.tomorrow.description, 'light rain');
  assert.strictEqual(d.headlines[0].title, 'Node.js 24 released with faster startup');

  const sec = s.templateSections(d);
  assert.deepStrictEqual(sec.map((x) => x.id), ['yesterday', 'today', 'security', 'weather', 'news', 'closing']);
  const text = s.joinScript(sec);
  assert.match(text, /^Good morning, Kunal\./);
  assert.match(text, /3 commits to api and web/);
  assert.match(text, /lodash 4\.17\.20 in web, which is fixed in version 4\.17\.21/);
  assert.match(text, /24 degrees with clear sky/);
  assert.match(text, /5 day streak/);
  assert.doesNotMatch(text, /https?:|[*#]/);
});

test('template with no data still sounds complete', () => {
  const sec = s.templateSections(s.buildBriefingData({ now, tz: IST }));
  assert.deepStrictEqual(sec.map((x) => x.id), ['yesterday', 'today', 'security', 'closing']);
  assert.match(sec[0].text, /Good morning, there\. .*Connect GitHub/);
  assert.match(sec[2].text, /haven't run a dependency scan/);
  assert.match(sec[3].text, /clean slate/);
});

test('pickHeadlines: language keyword match, word boundaries, fallback', () => {
  assert.deepStrictEqual(s.pickHeadlines(news.articles, [{ name: 'JavaScript' }]).map((a) => a.source), ['InfoQ']);
  // "Go" must not match "Google"; falls back to the top headline
  assert.deepStrictEqual(s.pickHeadlines(news.articles, [{ name: 'Go' }]).map((a) => a.source), ['The Verge']);
  assert.deepStrictEqual(s.pickHeadlines([], [{ name: 'Go' }]), []);
  assert.strictEqual(s.pickHeadlines([{ title: 'C# 14 preview' }], [{ name: 'C#' }]).length, 1);
});

test('parseSections reads markers, strips Markdown/URLs, keeps canonical order', () => {
  const out = s.parseSections('Intro junk\n[today]\n**Focus** on auth.\n[yesterday]\nHi! See https://x.y/z now.\n[nope]');
  assert.deepStrictEqual(out.map((x) => x.id), ['yesterday', 'today']);
  assert.strictEqual(out[0].text, 'Hi! See now. [nope]');
  assert.strictEqual(out[1].text, 'Focus on auth.');
});

test('splitSentences keeps versions and decimals intact', () => {
  assert.deepStrictEqual(
    s.splitSentences('Update lodash to 4.17.21 today. It is 2.5 degrees! Ready? "Go."  Done'),
    ['Update lodash to 4.17.21 today.', 'It is 2.5 degrees!', 'Ready?', '"Go."', 'Done'],
  );
});

test('word count and duration estimate (150 wpm)', () => {
  assert.strictEqual(s.countWords(' one  two\nthree '), 3);
  assert.strictEqual(s.estimateSeconds(250), 100);
});

test('generateBriefing falls back to the template without an AI key', async () => {
  const saved = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const b = await s.generateBriefing(s.buildBriefingData(full));
    assert.strictEqual(b.model, 'fallback-template');
    assert.strictEqual(b.sections.length, 6);
    assert.strictEqual(b.wordCount, s.countWords(b.script));
    assert.strictEqual(b.estSeconds, s.estimateSeconds(b.wordCount));
  } finally {
    if (saved !== undefined) process.env.GEMINI_API_KEY = saved;
  }
});
