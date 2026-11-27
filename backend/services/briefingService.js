const { askGemini } = require('./insightService');
const { collectActivity } = require('./reportService');

const DAY = 24 * 60 * 60 * 1000;
const SECTION_IDS = ['yesterday', 'today', 'security', 'weather', 'news', 'closing'];
const TITLES = { yesterday: 'Yesterday', today: 'Today', security: 'Security', weather: 'Weather', news: 'Headlines', closing: 'Sign-off' };
const SEVERITY = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WPM = 150;

// Extra news keywords per language; the language name itself always counts.
const LANG_KEYWORDS = {
  javascript: ['js', 'node', 'nodejs', 'react', 'npm', 'deno', 'bun', 'next.js', 'vue', 'web'],
  typescript: ['ts', 'react', 'node', 'angular', 'deno'],
  python: ['django', 'pip', 'pytorch', 'ai', 'ml', 'pandas'],
  go: ['golang', 'kubernetes', 'docker'],
  rust: ['cargo', 'wasm', 'webassembly'],
  java: ['jvm', 'spring', 'android', 'kotlin'],
  kotlin: ['android', 'jvm'],
  swift: ['ios', 'apple', 'xcode'],
  'c#': ['.net', 'dotnet', 'microsoft'],
  'c++': ['llvm'],
  html: ['web', 'browser', 'chrome'],
  css: ['web', 'browser'],
};

/** Clamp a client tz offset (minutes, as Date#getTimezoneOffset returns) to a sane range. */
const parseTz = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && Math.abs(n) <= 14 * 60 ? n : 0;
};

/** Local calendar info for `now` in the client's timezone. Use getUTC* on `local`. */
const localInfo = (now, tz) => {
  const local = new Date(now.getTime() - tz * 60000);
  const startOfDay = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + tz * 60000; // as real UTC instant
  const day = local.getUTCDay();
  const hour = local.getUTCHours();
  return {
    date: local.toISOString().slice(0, 10),
    weekday: WEEKDAYS[day],
    isMonday: day === 1,
    greeting: hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening',
    // Last working day: yesterday, or since Friday on a Monday (covers the weekend)
    since: new Date(startOfDay - (day === 1 ? 3 : 1) * DAY),
  };
};

const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const joinList = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const cleanTitle = (t = '') => t.replace(/\s+[-|–]\s+[^-|–]+$/, '').trim(); // drop NewsAPI " - Source" suffix
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Pick 1–2 headlines matching the user's top languages; fall back to the top headline. */
const pickHeadlines = (articles = [], languages = [], max = 2) => {
  const keywords = languages.slice(0, 3).flatMap((l) => {
    const name = String(l.name || '').toLowerCase();
    return name ? [name, ...(LANG_KEYWORDS[name] || [])] : [];
  });
  const patterns = [...new Set(keywords)].map((k) => new RegExp(`(?<![\\w.#+])${escapeRe(k)}(?![\\w#+])`, 'i'));
  const scored = articles
    .filter((a) => a?.title)
    .map((a, i) => ({ a, i, score: patterns.filter((p) => p.test(`${a.title} ${a.description || ''}`)).length }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || x.i - y.i)
    .slice(0, max)
    .map((x) => x.a);
  return scored.length ? scored : articles.filter((a) => a?.title).slice(0, 1);
};

/** The most urgent finding: worst severity, preferring ones with a fix available. */
const mostUrgent = (findings = []) =>
  [...findings].sort((a, b) => {
    const s = (x) => { const i = SEVERITY.indexOf(String(x.severity).toUpperCase()); return i < 0 ? 9 : i; };
    return s(a) - s(b) || Number(!a.fixedIn) - Number(!b.fixedIn);
  })[0] || null;

const encouragement = ({ streak, delta, commits, topRepo }) => {
  if (streak >= 3) return `You're on a ${streak} day streak. One meaningful commit today makes it ${streak + 1}.`;
  if (delta > 0) return `You're already ${plural(delta, 'contribution')} ahead of last week's pace, so keep that momentum going.`;
  if (commits > 0 && topRepo) return `Your recent work on ${topRepo} gives you a strong place to pick up from.`;
  return 'Fresh day, clean slate. Pick one small thing and ship it.';
};

/** Gather plain facts for the script. All inputs may be null. Pure. */
const buildBriefingData = ({ user, gh, tasks = [], weather, scan, news, now = new Date(), tz = 0 }) => {
  const info = localInfo(now, tz);
  const act = collectActivity(gh, tasks, info.since);
  const repos = Object.entries(act.byRepo).sort((a, b) => b[1].length - a[1].length).map(([r]) => r);
  const weekly = gh?.weeklyContributions ?? 0;
  const lastWeek = gh?.lastWeekContributions ?? 0;
  const streak = gh?.streak?.current ?? 0;
  const bySev = scan?.totals?.bySeverity || {};
  const top = mostUrgent((scan?.findings || []).filter((f) => ['CRITICAL', 'HIGH'].includes(String(f.severity).toUpperCase())));
  const forecast = weather?.forecast || [];
  const tomorrow = forecast.find((f) => new Date(f.date).toISOString().slice(0, 10) > info.date);

  return {
    ...info,
    firstName: String(user?.displayName || '').trim().split(/\s+/)[0] || 'there',
    github: !!gh,
    activity: {
      commits: act.commits.length,
      repos,
      messages: act.commits.slice(0, 6).map((c) => `${c.repo}: ${String(c.message).split('\n')[0]}`),
      prs: act.prs.map((p) => p.title),
      done: act.done.map((t) => t.title),
    },
    streak, weekly, lastWeek, delta: weekly - lastWeek,
    plan: { inProgress: act.inProgress.slice(0, 3).map((t) => t.title), todo: act.todo.slice(0, 3).map((t) => t.title) },
    security: scan ? {
      critical: bySev.CRITICAL || 0,
      high: bySev.HIGH || 0,
      top: top && { package: top.package, version: top.version, repo: top.repo, severity: String(top.severity).toLowerCase(), fixedIn: top.fixedIn || null },
    } : null,
    weather: weather?.current ? {
      city: weather.city,
      temp: Math.round(weather.current.temp),
      feelsLike: Math.round(weather.current.feelsLike ?? weather.current.temp),
      description: weather.current.description,
      tomorrow: tomorrow && { description: tomorrow.description, tempMax: Math.round(tomorrow.tempMax) },
    } : null,
    headlines: pickHeadlines(news?.articles, gh?.languages).map((a) => ({ title: cleanTitle(a.title), source: a.source })),
    topLanguage: gh?.languages?.[0]?.name || null,
    encouragement: encouragement({ streak, delta: weekly - lastWeek, commits: act.commits.length, topRepo: repos[0] }),
  };
};

/** Deterministic, spoken-style sections. Sections without data are omitted. */
const templateSections = (d) => {
  const a = d.activity;
  const period = d.isMonday ? 'Since Friday' : 'Yesterday';
  const yesterday = [`${d.greeting}, ${d.firstName}. Here's your briefing for ${d.weekday}.`];
  if (a.commits) yesterday.push(`${period}, you pushed ${plural(a.commits, 'commit')} to ${joinList(a.repos.slice(0, 3))}.`);
  else yesterday.push(d.github ? `${period} was quiet, with no commits on record.` : 'Connect GitHub to hear about your recent commits here.');
  if (a.prs.length) yesterday.push(`You opened ${plural(a.prs.length, 'pull request')}, including ${a.prs[0]}.`);
  if (a.done.length) yesterday.push(`You also closed out ${plural(a.done.length, 'task')}.`);
  if (d.github) {
    const trend = d.delta === 0 ? 'level with last week' : `${Math.abs(d.delta)} ${d.delta > 0 ? 'more' : 'fewer'} than last week`;
    yesterday.push(`Your streak is at ${plural(d.streak, 'day')}, and you have ${plural(d.weekly, 'contribution')} this week, ${trend}.`);
  }

  const today = [];
  if (d.plan.inProgress.length) today.push(`On today's plan, you're in the middle of ${joinList(d.plan.inProgress)}.`);
  if (d.plan.todo.length) today.push(`Next up: ${joinList(d.plan.todo)}.`);
  if (!today.length) today.push('Your task list is clear, so it is a good moment to decide what matters most today.');

  let security = null;
  if (!d.security) security = "You haven't run a dependency scan yet. It's worth doing one today.";
  else if (!d.security.critical && !d.security.high) security = 'Security looks calm. Your last scan found no critical or high severity issues.';
  else {
    const counts = joinList([d.security.critical && `${d.security.critical} critical`, d.security.high && `${d.security.high} high`].filter(Boolean));
    const t = d.security.top;
    security = `Security needs a look. Your last scan found ${counts} severity ${d.security.critical + d.security.high === 1 ? 'issue' : 'issues'}.`;
    if (t) security += ` The most urgent is ${[t.package, t.version].filter(Boolean).join(' ')}${t.repo ? ` in ${t.repo}` : ''}, ${t.fixedIn ? `which is fixed in version ${t.fixedIn}` : 'with no fix released yet'}.`;
  }

  const w = d.weather;
  const weather = w && [
    `In ${w.city}, it's ${w.temp} degrees with ${w.description}${w.feelsLike !== w.temp ? `, feeling like ${w.feelsLike}` : ''}.`,
    w.tomorrow && `Tomorrow looks like ${w.tomorrow.description}, with a high around ${w.tomorrow.tempMax}.`,
  ].filter(Boolean).join(' ');

  const h = d.headlines;
  const news = h.length ? [
    `In tech news: ${h[0].title}${h[0].source ? `, from ${h[0].source}` : ''}.`,
    h[1] && `Also worth a look: ${h[1].title}.`,
  ].filter(Boolean).join(' ') : null;

  const closing = `${d.encouragement} Have a great ${d.weekday}.`;
  const text = { yesterday: yesterday.join(' '), today: today.join(' '), security, weather, news, closing };
  return SECTION_IDS.filter((id) => text[id]).map((id) => ({ id, title: TITLES[id], text: text[id] }));
};

/** Make AI text safe to speak: no Markdown, URLs or emoji, collapsed whitespace. */
const speakable = (s) => String(s)
  .replace(/https?:\/\/\S+/g, '')
  .replace(/[*_#`>~|]/g, '')
  .replace(/\p{Extended_Pictographic}/gu, '')
  .replace(/\s+/g, ' ')
  .trim();

/** Parse "[id]\ntext" markers into sections, in canonical order. */
const parseSections = (content) => {
  const parts = String(content).split(/\[(yesterday|today|security|weather|news|closing)\]/i);
  const byId = {};
  for (let i = 1; i < parts.length; i += 2) {
    const text = speakable(parts[i + 1] || '');
    if (text) byId[parts[i].toLowerCase()] = text;
  }
  return SECTION_IDS.filter((id) => byId[id]).map((id) => ({ id, title: TITLES[id], text: byId[id] }));
};

// Split on sentence-ending punctuation followed by whitespace, so "4.17.21" and "2.5" stay intact.
const splitSentences = (text) => String(text).split(/(?<=[.!?]["')\]]?)\s+/).map((s) => s.trim()).filter(Boolean);
const countWords = (text) => (String(text).match(/\S+/g) || []).length;
const estimateSeconds = (words) => Math.round((words / WPM) * 60);

const joinScript = (sections) => sections.map((s) => s.text).join('\n\n');
const toMarkers = (sections) => sections.map((s) => `[${s.id}]\n${s.text}`).join('\n\n');

const factsText = (d) => [
  `Name: ${d.firstName}. Greeting: ${d.greeting}. Today is ${d.weekday}.`,
  `Work window: ${d.isMonday ? 'since Friday (covers the weekend)' : 'yesterday'}. ${d.github ? '' : 'GitHub not connected.'}`,
  `Commits: ${d.activity.commits} in ${d.activity.repos.join(', ') || 'no repos'}.`,
  d.activity.messages.length && `Commit messages:\n${d.activity.messages.map((m) => `- ${m}`).join('\n')}`,
  d.activity.prs.length && `Pull requests opened: ${d.activity.prs.join('; ')}.`,
  d.activity.done.length && `Tasks finished: ${d.activity.done.join('; ')}.`,
  d.github && `Streak: ${d.streak} days. Contributions this week: ${d.weekly}, last week: ${d.lastWeek}.`,
  `In progress: ${d.plan.inProgress.join('; ') || 'nothing'}. Todo: ${d.plan.todo.join('; ') || 'nothing'}.`,
  d.security ? `Security: ${d.security.critical} critical, ${d.security.high} high.${d.security.top ? ` Most urgent: ${d.security.top.package} ${d.security.top.version} in ${d.security.top.repo} (${d.security.top.severity}), fix: ${d.security.top.fixedIn || 'none yet'}.` : ''}` : 'Security: never scanned.',
  d.weather && `Weather in ${d.weather.city}: ${d.weather.temp}°C, ${d.weather.description}, feels like ${d.weather.feelsLike}.${d.weather.tomorrow ? ` Tomorrow: ${d.weather.tomorrow.description}, high ${d.weather.tomorrow.tempMax}.` : ''}`,
  d.headlines.length && `Headlines (relevant to ${d.topLanguage || 'their stack'}): ${d.headlines.map((x) => x.title).join(' | ')}`,
  `Encouraging idea: ${d.encouragement}`,
].filter(Boolean).join('\n');

/** Build the briefing: AI script when available, template otherwise. */
const generateBriefing = async (data) => {
  const fallback = templateSections(data);
  const ids = fallback.map((s) => s.id).join(', ');
  const prompt = `You are the voice of Insightify, recording a warm two-minute morning audio briefing for a software developer.

Facts (use only these, never invent details):
${factsText(data)}

Write a spoken script of 230 to 280 words. Rules:
- Sections, in this order, each starting with its marker on its own line: ${fallback.map((s) => `[${s.id}]`).join(' ')}
- Open the [yesterday] section with "${data.greeting}, ${data.firstName}."
- Short, natural sentences meant to be heard. Write numbers the way a person would say them.
- No Markdown, bullet points, emoji, URLs, or code. Paraphrase commit messages into plain English.
- [closing] ends with one specific, encouraging line based on the facts.

Here is a plain draft covering the same sections (${ids}) you can improve on:
${toMarkers(fallback)}`;

  const result = await askGemini(prompt, toMarkers(fallback));
  let sections = parseSections(result.content);
  let model = result.model;
  if (sections.length < Math.min(3, fallback.length)) { sections = fallback; model = 'fallback-template'; }
  const script = joinScript(sections);
  const wordCount = countWords(script);
  return { sections, script, model, wordCount, estSeconds: estimateSeconds(wordCount) };
};

module.exports = {
  parseTz, localInfo, pickHeadlines, mostUrgent, buildBriefingData, templateSections,
  parseSections, speakable, splitSentences, countWords, estimateSeconds, joinScript, generateBriefing,
};
