const crypto = require('crypto');

// Pure helpers for Rooms & challenges (no DB) so they can be unit-tested.

const LIMITS = { roomName: 40, status: 80, challengeTitle: 60, members: 50, roomsPerUser: 10, challengesPerRoom: 20 };
const ONLINE_MS = 45 * 1000;
const HEARTBEAT_MIN_MS = 10 * 1000;
const DAY_MS = 86400000;
const TIMER_MINUTES = [25, 50, 90];
const METRICS = ['contributions', 'activeDays', 'streak'];
const EMOJIS = ['🚀', '🔥', '⚡', '🧠', '🛠️', '🎧', '🌙', '☕', '🐙', '🦄', '🌱', '🎯'];
const COLORS = ['accent', 'success', 'warning', 'info', 'danger'];

// No 0/O/1/I/L → 31 symbols; rejection-sample bytes >= 248 (31*8) so `b % 31` is unbiased.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const generateCode = (len = 8) => {
  let s = '';
  while (s.length < len) for (const b of crypto.randomBytes(len)) if (b < 248 && s.length < len) s += ALPHABET[b % 31];
  return s;
};
const isValidCode = (code) => typeof code === 'string' && /^[A-HJKMNP-Z2-9]{8}$/.test(code);

/** Trimmed single-line string of 1..max chars, else null. allowEmpty → '' is OK. */
const cleanText = (s, max, { allowEmpty = false } = {}) => {
  if (typeof s !== 'string') return null;
  const t = s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length > max) return null;
  if (!t && !allowEmpty) return null;
  return t;
};

const ymd = (d) => new Date(d).toISOString().slice(0, 10);
const isYmd = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(Date.parse(s)) === s;

/** 'focusing' beats 'online' beats 'offline'. */
const presenceOf = (m, now = Date.now()) => {
  if (m.focusUntil && new Date(m.focusUntil).getTime() > now) return 'focusing';
  if (m.lastSeen && now - new Date(m.lastSeen).getTime() < ONLINE_MS) return 'online';
  return 'offline';
};

const heartbeatThrottled = (lastSeen, now = Date.now()) =>
  !!lastSeen && now - new Date(lastSeen).getTime() < HEARTBEAT_MIN_MS;

/** ms left on a room timer (0 when finished), null when there's no timer. */
const timerRemaining = (timer, now = Date.now()) => {
  if (!timer?.startedAt) return null;
  return Math.max(0, new Date(timer.startedAt).getTime() + timer.minutes * 60000 - now);
};
const timerEnd = (timer) => new Date(new Date(timer.startedAt).getTime() + timer.minutes * 60000);

/** Value of one metric over a calendar [{date,count}] within [start, end] (inclusive YYYY-MM-DD). */
const metricValue = (calendar = [], metric, start, end) => {
  const days = calendar.filter((d) => d.date >= start && d.date <= end).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (metric === 'contributions') return days.reduce((s, d) => s + (d.count || 0), 0);
  if (metric === 'activeDays') return days.filter((d) => d.count > 0).length;
  // streak: longest run of consecutive active dates (a missing date breaks the run)
  let best = 0, run = 0, prev = null;
  for (const d of days) {
    if (d.count > 0) {
      run = prev !== null && Date.parse(d.date) - Date.parse(prev) === DAY_MS ? run + 1 : 1;
      prev = d.date;
      best = Math.max(best, run);
    } else { run = 0; prev = null; }
  }
  return best;
};

/** rows: [{uid, name, photoURL, githubUsername, calendar|null}] → ranked (ties share a rank). */
const leaderboard = (rows, metric, start, end, target = null) => {
  const scored = rows
    .map(({ calendar, ...m }) => {
      const value = calendar ? metricValue(calendar, metric, start, end) : 0;
      return { ...m, value, noData: !calendar, completed: target ? value >= target : false };
    })
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  scored.forEach((r, i) => { r.rank = i && r.value === scored[i - 1].value ? scored[i - 1].rank : i + 1; });
  return scored;
};

/** Monday (UTC) of the week containing `now` → today. */
const weekWindow = (now = Date.now()) => {
  const d = new Date(now);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
  return { start: ymd(monday), end: ymd(d) };
};

const challengeStatus = (c, now = Date.now()) => {
  const today = ymd(now);
  return today < c.startDate ? 'upcoming' : today > c.endDate ? 'ended' : 'active';
};

/** Returns { value } or { error }. */
const validateChallenge = (body = {}) => {
  const title = cleanText(body.title, LIMITS.challengeTitle);
  if (!title) return { error: `Title is required (max ${LIMITS.challengeTitle} chars).` };
  if (!METRICS.includes(body.metric)) return { error: 'Unknown metric.' };
  const target = Number(body.target);
  if (!Number.isInteger(target) || target < 1 || target > 10000) return { error: 'Target must be a whole number 1–10000.' };
  const { startDate, endDate } = body;
  if (!isYmd(startDate) || !isYmd(endDate)) return { error: 'Dates must be YYYY-MM-DD.' };
  if (startDate > endDate) return { error: 'End date must be after start date.' };
  if ((Date.parse(endDate) - Date.parse(startDate)) / DAY_MS > 365) return { error: 'Challenges can last at most a year.' };
  return { value: { title, metric: body.metric, target, startDate, endDate } };
};

/** Returns { value } (null clears) or { error }. Shape mirrors a Spotify playlist subset. */
const validatePlaylist = (p) => {
  if (p === null) return { value: null };
  if (!p || typeof p.id !== 'string' || !/^[A-Za-z0-9]{1,64}$/.test(p.id)) return { error: 'Invalid playlist.' };
  const name = cleanText(p.name, 100);
  if (!name) return { error: 'Invalid playlist name.' };
  const image = typeof p.image === 'string' && p.image.length <= 500 && /^https:\/\//.test(p.image) ? p.image : '';
  return { value: { id: p.id, name, image } };
};

const isGithubUrl = (u) => typeof u === 'string' && u.length <= 300 && /^https:\/\/github\.com\/[^\s]+$/.test(u);

const publicMember = (m, now) => ({
  uid: m.uid, name: m.name, photoURL: m.photoURL, githubUsername: m.githubUsername,
  joinedAt: m.joinedAt, lastSeen: m.lastSeen, status: m.status || '', focusUntil: m.focusUntil || null,
  presence: presenceOf(m, now),
});

const publicRoom = (room, now = Date.now()) => ({
  code: room.code, name: room.name, emoji: room.emoji, color: room.color, ownerUid: room.ownerUid,
  createdAt: room.createdAt, timer: room.timer?.startedAt ? room.timer : null, playlist: room.playlist?.id ? room.playlist : null,
  members: room.members.map((m) => publicMember(m, now)),
});

/**
 * Merged commits + PRs from the last `days` days, newest first.
 * statsByUid: { uid: {recentCommits, pullRequests} }; kudos: [{itemUrl, fromUid}].
 */
const buildFeed = (members, statsByUid, kudos, myUid, now = Date.now(), days = 7, limit = 60) => {
  const since = now - days * DAY_MS;
  const nameOf = Object.fromEntries(members.map((m) => [m.uid, m.name]));
  const items = [];
  for (const m of members) {
    const s = statsByUid[m.uid];
    if (!s) continue;
    const who = { uid: m.uid, name: m.name, photoURL: m.photoURL, githubUsername: m.githubUsername };
    for (const c of s.recentCommits || []) {
      if (c.url && Date.parse(c.date) >= since) items.push({ type: 'commit', url: c.url, title: (c.message || '').split('\n')[0], repo: c.repo, date: c.date, sha: c.sha, member: who });
    }
    for (const p of s.pullRequests || []) {
      if (p.url && Date.parse(p.createdAt) >= since) items.push({ type: 'pr', url: p.url, title: p.title, repo: p.repo, date: p.createdAt, state: p.state, member: who });
    }
  }
  const seen = new Set();
  return items
    .filter((i) => !seen.has(i.url) && seen.add(i.url))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, limit)
    .map((i) => {
      const k = kudos.filter((x) => x.itemUrl === i.url);
      return { ...i, kudos: { count: k.length, mine: k.some((x) => x.fromUid === myUid), from: k.map((x) => nameOf[x.fromUid] || 'Former member') } };
    });
};

module.exports = {
  LIMITS, TIMER_MINUTES, METRICS, EMOJIS, COLORS, ALPHABET,
  generateCode, isValidCode, cleanText, ymd, isYmd, presenceOf, heartbeatThrottled, timerRemaining, timerEnd,
  metricValue, leaderboard, weekWindow, challengeStatus, validateChallenge, validatePlaylist, isGithubUrl,
  publicRoom, buildFeed,
};
