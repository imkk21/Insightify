const GithubStats = require('../models/GithubStats');
const User = require('../models/User');
const { fetchGithubData } = require('../services/githubService');

const ONE_HOUR = 60 * 60 * 1000;

const handleErr = (err, res) => {
  const status = err.status || err.response?.status;
  if (status === 401) return res.status(502).json({ error: 'GitHub token invalid or expired. Server GITHUB_TOKEN needs updating.' });
  if (status === 404) return res.status(404).json({ error: 'GitHub username not found. Please check the username and try again.' });
  if (status === 403) return res.status(429).json({ error: 'GitHub API rate limit hit. Try again in 1 hour.' });
  return res.status(500).json({ error: err.message });
};

/** Replace (not merge) so documents in the old shape don't keep stale fields. */
const saveStats = (uid, data) =>
  GithubStats.findOneAndReplace({ uid }, { uid, ...data }, { upsert: true, new: true });

const refresh = async (uid) => {
  const user = await User.findOne({ uid });
  const username = user?.githubUsername?.trim();
  if (!username) return null;
  return saveStats(uid, await fetchGithubData(username));
};

const notConnected = (res) => res.status(400).json({ error: 'GitHub not connected. Use the "Connect GitHub" button.' });

/** Cached stats if under an hour old, else refetched; null if GitHub isn't connected. */
const freshStats = async (uid) => {
  const cached = await GithubStats.findOne({ uid });
  // `totals` marks the current data shape; older cached docs are refetched
  if (cached?.totals && Date.now() - cached.fetchedAt.getTime() < ONE_HOUR) return cached;
  return refresh(uid);
};

/** GET /api/github/stats */
const getStats = async (req, res) => {
  try {
    const stats = await freshStats(req.user.uid);
    return stats ? res.json(stats) : notConnected(res);
  } catch (err) { handleErr(err, res); }
};

/** POST /api/github/sync */
const syncStats = async (req, res) => {
  try {
    const stats = await refresh(req.user.uid);
    return stats ? res.json({ message: 'GitHub stats synced', stats }) : notConnected(res);
  } catch (err) { handleErr(err, res); }
};

/** POST /api/github/connect */
const connectGithub = async (req, res) => {
  try {
    const { githubUsername } = req.body;
    if (typeof githubUsername !== 'string' || !githubUsername.trim()) {
      return res.status(400).json({ error: 'GitHub username is required.' });
    }
    const uid = req.user.uid;
    const cleanUsername = githubUsername.trim();

    // Already linked to a DIFFERENT account? (exact, case-insensitive)
    const existingUser = await User.findOne({
      githubUsername: cleanUsername,
      uid: { $ne: uid },
      githubConnected: true,
    }).collation({ locale: 'en', strength: 2 });
    if (existingUser) {
      return res.status(409).json({
        error: `GitHub account "@${cleanUsername}" is already connected to another Insightify account.`,
      });
    }

    const data = await fetchGithubData(cleanUsername); // also verifies the user exists
    await User.findOneAndUpdate({ uid }, { githubUsername: data.username, githubConnected: true, githubVerified: false });
    res.json({ message: 'GitHub connected successfully', stats: await saveStats(uid, data) });
  } catch (err) { handleErr(err, res); }
};

/** DELETE /api/github/disconnect */
const disconnectGithub = async (req, res) => {
  try {
    await User.findOneAndUpdate({ uid: req.user.uid }, { githubUsername: '', githubConnected: false, githubVerified: false });
    await GithubStats.deleteOne({ uid: req.user.uid });
    res.json({ message: 'GitHub disconnected successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getStats, syncStats, connectGithub, disconnectGithub, saveStats, freshStats };
