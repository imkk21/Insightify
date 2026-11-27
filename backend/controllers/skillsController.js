const SkillProfile = require('../models/SkillProfile');
const User = require('../models/User');
const { freshStats } = require('./githubController');
const { buildProfile, findMatches, publicView } = require('../services/skillsService');

const DAY = 24 * 60 * 60 * 1000;
const MATCHES_TTL = 6 * 60 * 60 * 1000;
const MIN_REFRESH = 2 * 60 * 1000; // a build makes ~100 GitHub calls; don't let refresh be spammed
const GITHUB_LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const inflight = new Map(); // uid → Promise, so double-clicks share one build

const fail = (res, err, what) => {
  console.error(`skills ${what} error:`, err.message);
  const status = err.status || err.response?.status;
  if (status === 403 || status === 429) return res.status(429).json({ error: 'GitHub rate limit hit. Try again in a few minutes.' });
  res.status(status === 404 ? 404 : 502).json({ error: `Could not build your skill profile: ${err.message}` });
};

const rebuild = (uid, username) => {
  if (!inflight.has(uid)) {
    inflight.set(uid, (async () => {
      const github = await freshStats(uid).catch(() => null);
      const data = await buildProfile(username, github);
      return SkillProfile.findOneAndReplace({ uid }, { uid, ...data }, { upsert: true, new: true });
    })().finally(() => inflight.delete(uid)));
  }
  return inflight.get(uid);
};

/** GET /api/skills[?refresh=1] – cached for 24h; a rebuild takes up to ~60s. */
const getSkills = async (req, res) => {
  try {
    const { uid } = req.user;
    const user = await User.findOne({ uid });
    if (!user?.githubUsername) return res.status(400).json({ error: 'Connect GitHub first.' });

    let profile = await SkillProfile.findOne({ uid });
    const age = profile ? Date.now() - profile.generatedAt.getTime() : Infinity;
    const stale = !profile || profile.username?.toLowerCase() !== user.githubUsername.toLowerCase() || age > DAY;
    if (stale || (req.query.refresh === '1' && age > MIN_REFRESH)) profile = await rebuild(uid, user.githubUsername);

    res.json({ ...profile.toObject(), publicProfile: !!user.publicProfile });
  } catch (err) { fail(res, err, 'build'); }
};

/** GET /api/skills/matches[?refresh=1] – good first issues matched to the cached profile. */
const getMatches = async (req, res) => {
  try {
    const { uid } = req.user;
    const profile = await SkillProfile.findOne({ uid });
    if (!profile) return res.status(404).json({ error: 'Build your skill profile first.' });
    const fresh = profile.matchedAt && Date.now() - profile.matchedAt.getTime() < MATCHES_TTL;
    if (!fresh || (req.query.refresh === '1' && Date.now() - profile.matchedAt.getTime() > MIN_REFRESH)) {
      profile.matches = await findMatches(profile.username, profile.toObject());
      profile.matchedAt = new Date();
      await SkillProfile.updateOne({ uid }, { matches: profile.matches, matchedAt: profile.matchedAt });
    }
    res.json({ matches: profile.matches, matchedAt: profile.matchedAt });
  } catch (err) { fail(res, err, 'matches'); }
};

/** GET /api/skills/public/:username – no auth. Opted-in users only; never triggers a build. */
const getPublicSkills = async (req, res) => {
  try {
    const { username } = req.params;
    if (!GITHUB_LOGIN.test(username)) return res.status(404).json({ error: 'Not found' });
    const user = await User.findOne({ githubUsername: username, githubConnected: true, publicProfile: true })
      .collation({ locale: 'en', strength: 2 });
    const profile = user && await SkillProfile.findOne({ uid: user.uid });
    if (!profile) return res.status(404).json({ error: 'Not found' });
    res.set('Cache-Control', 'public, max-age=300');
    res.json(publicView(profile.toObject()));
  } catch (err) {
    console.error('public skills error:', err.message);
    res.status(500).json({ error: 'Could not load skills' });
  }
};

module.exports = { getSkills, getMatches, getPublicSkills };
