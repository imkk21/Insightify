// Flow & wellbeing heuristics. Pure functions over GitHub calendar/commits and Spotify plays.
// Everything here is a rough signal from commit timestamps, not a measure of health.

const MIN = 60e3;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const pct = (x) => Math.round(x * 100);
const dayStr = (ms) => new Date(ms).toISOString().slice(0, 10);
const ms = (date) => new Date(date).getTime();

/** Hour/weekday/day of a timestamp in the user's zone (`tz` = minutes east of UTC). */
const local = (date, tz = 0) => {
  const d = new Date(ms(date) + tz * MIN);
  return { hour: d.getUTCHours(), weekday: d.getUTCDay(), day: d.toISOString().slice(0, 10) };
};
const isLateNight = (h) => h >= 23 || h < 5;
const isWeekend = (wd) => wd === 0 || wd === 6;
const hourName = (h) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;

const sortedTimes = (commits) => commits.map((c) => ms(c.date)).filter(Number.isFinite).sort((a, b) => a - b);
const between = (commits, from, to) => commits.filter((c) => { const t = ms(c.date); return t > from && t <= to; });

/** Deep-work blocks: ≥`min` commits within a `windowMs` span. Greedy, non-overlapping. */
const deepWorkBlocks = (commits, { min = 3, windowMs = 3 * HOUR } = {}) => {
  const t = sortedTimes(commits);
  const blocks = [];
  let i = 0;
  while (i < t.length) {
    let j = i;
    while (j + 1 < t.length && t[j + 1] - t[i] <= windowMs) j++;
    if (j - i + 1 >= min) { blocks.push({ start: t[i], end: t[j], commits: j - i + 1 }); i = j + 1; }
    else i++;
  }
  return blocks;
};

/** Share of commits made late at night (23:00–05:00) and on weekends, in local time. */
const shares = (commits, tz = 0) => {
  const l = commits.map((c) => local(c.date, tz));
  const n = l.length || 1;
  return {
    total: l.length,
    lateNight: l.filter((x) => isLateNight(x.hour)).length / n,
    weekend: l.filter((x) => isWeekend(x.weekday)).length / n,
  };
};

const inWindow = (h, w) => (h - w.start + 24) % 24 < w.width;

/** Busiest `width`-hour window (wraps midnight). */
const bestWindow = (hours, width = 3) => {
  const total = hours.reduce((s, v) => s + v, 0);
  let best = { start: 0, count: -1 };
  for (let s = 0; s < 24; s++) {
    let count = 0;
    for (let k = 0; k < width; k++) count += hours[(s + k) % 24];
    if (count > best.count) best = { start: s, count };
  }
  const end = (best.start + width) % 24;
  return {
    start: best.start, end, width,
    share: total ? best.count / total : 0,
    label: `${hourName(best.start)}–${hourName(end)}`,
  };
};

const hourHistogram = (commits, tz) => {
  const hours = Array(24).fill(0);
  for (const c of commits) hours[local(c.date, tz).hour]++;
  return hours;
};

const WEIGHTS = { consistency: 0.3, deepWork: 0.3, rhythm: 0.2, recovery: 0.2 };

/** Flow score for the 7 days ending at `end` (ms). `peak` = the user's personal focus window. */
const windowScore = ({ calendar = [], commits = [], tz = 0, end, peak }) => {
  const from = dayStr(end - 6 * DAY), to = dayStr(end);
  const days = calendar.filter((d) => d.date >= from && d.date <= to);
  const activeDays = days.filter((d) => d.count > 0).length;
  const restDay = activeDays < days.length;
  const recent = between(commits, end - 7 * DAY, end);
  const hours = recent.map((c) => local(c.date, tz).hour);
  const late = hours.length ? hours.filter(isLateNight).length / hours.length : 0;
  const inPeak = hours.length ? hours.filter((h) => inWindow(h, peak)).length / hours.length : 0;
  const blocks = deepWorkBlocks(recent).length;

  const subscores = {
    consistency: Math.round((Math.min(activeDays, 5) / 5) * 100), // 5 active days = full marks; rest is healthy
    deepWork: Math.round((Math.min(blocks, 3) / 3) * 100),        // 3 blocks a week = full marks
    rhythm: pct(inPeak),
    recovery: clamp(100 - pct(late) - (restDay ? 0 : 30)),
  };
  // Active week but no sampled commits (we only see ~100 recent commits): score what the calendar can show.
  const estimated = recent.length === 0 && activeDays > 0;
  const score = estimated
    ? Math.round(0.6 * subscores.consistency + 0.4 * subscores.recovery)
    : Math.round(Object.entries(WEIGHTS).reduce((s, [k, w]) => s + w * subscores[k], 0));
  return {
    score: clamp(score), subscores, estimated,
    details: { activeDays, days: days.length, blocks, commits: recent.length, lateNightPct: pct(late), peakPct: pct(inPeak), restDay },
  };
};

const sumCounts = (days) => days.reduce((s, d) => s + d.count, 0);
const weekendShareCal = (days) => {
  const total = sumCounts(days);
  return total ? sumCounts(days.filter((d) => isWeekend(new Date(`${d.date}T00:00:00Z`).getUTCDay()))) / total : 0;
};

/** Consecutive active days ending today (or yesterday, if today has nothing yet). */
const trailingStreak = (calendar) => {
  let i = calendar.length - 1;
  if (calendar[i]?.count === 0) i--;
  let n = 0;
  while (i >= 0 && calendar[i].count > 0) { n++; i--; }
  return n;
};

const SUGGESTIONS = {
  late: 'Set a hard stop at 11pm this week: park the next step in a TODO before you log off.',
  weekend: 'Protect one full weekend day: no commits, no PR reviews.',
  streak: 'Take a real rest day in the next 48 hours. A streak counter is not a wellness metric.',
  volatility: 'Plan smaller, steadier batches instead of sprints followed by crashes.',
  surge: 'Output is well above your baseline. Check whether this pace is a deadline or a new habit.',
};

/** Last 14 days vs the prior 42-day baseline → risk + human-readable signals. */
const burnoutRisk = ({ calendar = [], commits = [], tz = 0, now, focusLabel }) => {
  const cut = now - 14 * DAY, base = now - 56 * DAY;
  const r = shares(between(commits, cut, now), tz);
  const b = shares(between(commits, base, cut), tz);
  const rDays = calendar.filter((d) => d.date > dayStr(cut) && d.date <= dayStr(now));
  const bDays = calendar.filter((d) => d.date > dayStr(base) && d.date <= dayStr(cut));
  const signals = [];
  const add = (id, weight, text) => signals.push({ id, weight, text });

  if (r.total >= 5 && r.lateNight >= 0.15 && r.lateNight - b.lateNight >= 0.1) {
    add('late', 2, b.total
      ? `Late-night commits (11pm–5am) rose from ${pct(b.lateNight)}% to ${pct(r.lateNight)}%`
      : `${pct(r.lateNight)}% of your last 14 days of commits were late at night (11pm–5am)`);
  }

  const rw = weekendShareCal(rDays), bw = weekendShareCal(bDays);
  if (sumCounts(rDays) >= 5 && rw >= 0.25 && rw - bw >= 0.15) {
    add('weekend', 1, `Weekend share of contributions rose from ${pct(bw)}% to ${pct(rw)}%`);
  }

  const streak = trailingStreak(calendar);
  if (streak >= 10) add('streak', streak >= 21 ? 2 : 1, `${streak} days in a row without a rest day`);

  const w1 = sumCounts(rDays.slice(-7)), w2 = sumCounts(rDays.slice(0, -7));
  const baseWeek = sumCounts(bDays) / 6;
  if (w2 >= Math.max(10, 1.8 * baseWeek) && w1 <= 0.5 * w2) {
    add('volatility', 1, `Output spiked to ${w2} contributions${baseWeek ? ` (${(w2 / baseWeek).toFixed(1)}× your usual week)` : ''} then dropped to ${w1}`);
  } else if (baseWeek && w1 + w2 >= Math.max(20, 1.75 * 2 * baseWeek)) {
    add('surge', 1, `Volume is ${((w1 + w2) / (2 * baseWeek)).toFixed(1)}× your 6-week baseline (${w1 + w2} vs ~${Math.round(2 * baseWeek)} per two weeks)`);
  }

  const points = signals.reduce((s, x) => s + x.weight, 0);
  const risk = points >= 4 ? 'high' : points >= 2 ? 'elevated' : 'low';
  const suggestions = signals.map((s) => SUGGESTIONS[s.id]);
  for (const extra of [
    focusLabel && `Block your peak window (${focusLabel}) for deep work and keep meetings outside it.`,
    'Keep at least one rest day a week. It is part of the rhythm, not a break from it.',
  ]) if (extra && suggestions.length < 2) suggestions.push(extra);

  return {
    risk, points, signals: signals.map(({ id, text }) => ({ id, text })), suggestions: suggestions.slice(0, 3),
    compare: { lateNight: [pct(b.lateNight), pct(r.lateNight)], weekend: [pct(bw), pct(rw)], streak },
  };
};

/** Hour/weekday histograms (local time), best focus window and weekend split. */
const patterns = ({ calendar = [], commits = [], tz = 0 }) => {
  const hours = hourHistogram(commits, tz);
  const weekdays = Array(7).fill(0);
  for (const c of commits) weekdays[local(c.date, tz).weekday]++;
  return {
    hours, weekdays,
    focusWindow: bestWindow(hours),
    weekendPct: pct(weekendShareCal(calendar)),
    lateNightPct: pct(shares(commits, tz).lateNight),
    sample: commits.length,
  };
};

/** Everything the Flow page needs, from a GithubStats doc's calendar + recentCommits. */
const analyzeFlow = ({ calendar = [], commits = [], tz = 0, now = Date.now() }) => {
  const pat = patterns({ calendar, commits, tz });
  const peak = pat.focusWindow;
  const current = windowScore({ calendar, commits, tz, end: now, peak });
  const weekly = [];
  for (let k = 7; k >= 0; k--) {
    const end = now - k * 7 * DAY;
    const w = windowScore({ calendar, commits, tz, end, peak });
    weekly.push({ weekEnding: dayStr(end), score: w.score, estimated: w.estimated });
  }
  return {
    score: current.score, subscores: current.subscores, details: current.details,
    weekly,
    burnout: burnoutRisk({ calendar, commits, tz, now, focusLabel: peak.share ? peak.label : null }),
    patterns: pat,
  };
};

/**
 * Score Spotify plays by commits within ±45 min; commits inside deep-work blocks count double.
 * `plays` = recently-played items [{played_at, track}]. Returns tracks with `match` 0–100.
 */
const scoreTracks = (plays = [], commits = [], { radius = 45 * MIN, limit = 20 } = {}) => {
  const blocks = deepWorkBlocks(commits);
  const ct = sortedTimes(commits).map((t) => ({ t, w: blocks.some((b) => t >= b.start && t <= b.end) ? 2 : 1 }));
  const byId = new Map();
  for (const p of plays) {
    const tr = p?.track;
    const t = ms(p?.played_at);
    if (!tr?.id || !Number.isFinite(t)) continue;
    const s = ct.reduce((sum, c) => sum + (Math.abs(c.t - t) <= radius ? c.w : 0), 0);
    const e = byId.get(tr.id) || {
      id: tr.id, uri: tr.uri, name: tr.name,
      artists: (tr.artists || []).map((a) => a.name).join(', '),
      image: tr.album?.images?.[1]?.url || tr.album?.images?.[0]?.url || null,
      url: tr.external_urls?.spotify || null,
      score: 0, plays: 0,
    };
    e.score += s; e.plays++;
    byId.set(tr.id, e);
  }
  const ranked = [...byId.values()].filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || b.plays - a.plays).slice(0, limit);
  const max = ranked[0]?.score || 1;
  return ranked.map((e) => ({ ...e, match: Math.round((e.score / max) * 100) }));
};

module.exports = { local, deepWorkBlocks, shares, bestWindow, windowScore, burnoutRisk, patterns, analyzeFlow, scoreTracks, trailingStreak };
