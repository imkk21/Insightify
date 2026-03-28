const GithubStats = require('../models/GithubStats');
const User = require('../models/User');
const { fetchGithubData } = require('../services/githubService');

const handleErr = (err, res) => {
  if (err.response?.status === 401) return res.status(502).json({ error: 'GitHub token invalid or expired. Update GITHUB_TOKEN in your .env file.' });
  if (err.response?.status === 404) return res.status(404).json({ error: 'GitHub username not found. Please check the username and try again.' });
  if (err.response?.status === 403) return res.status(429).json({ error: 'GitHub API rate limit hit. Try again in 1 hour.' });
  return res.status(500).json({ error: err.message });
};

/** GET /api/github/stats */
const getStats = async (req, res) => {
  try {
    const uid = req.user.uid;
    const cached = await GithubStats.findOne({ uid });
    const ONE_HOUR = 60 * 60 * 1000;
    if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < ONE_HOUR) {
      return res.json(cached);
    }
    const user = await User.findOne({ uid });
    const username = user?.githubUsername?.trim();
    if (!username) {
      return res.status(400).json({ error: 'GitHub not connected. Use the "Connect GitHub" button.' });
    }
    const data = await fetchGithubData(username, user.githubToken);
    const stats = await GithubStats.findOneAndUpdate({ uid }, { uid, ...data }, { upsert: true, new: true });
    res.json(stats);
  } catch (err) { handleErr(err, res); }
};

/** POST /api/github/sync */
const syncStats = async (req, res) => {
  try {
    const uid = req.user.uid;
    const user = await User.findOne({ uid });
    const username = user?.githubUsername?.trim();
    if (!username) {
      return res.status(400).json({ error: 'GitHub not connected. Use the "Connect GitHub" button.' });
    }
    const data = await fetchGithubData(username, user.githubToken);
    const stats = await GithubStats.findOneAndUpdate({ uid }, { uid, ...data }, { upsert: true, new: true });
    res.json({ message: 'GitHub stats synced', stats });
  } catch (err) { handleErr(err, res); }
};

/** POST /api/github/connect */
const connectGithub = async (req, res) => {
  try {
    const { githubUsername, githubToken } = req.body;
    if (!githubUsername?.trim()) {
      return res.status(400).json({ error: 'GitHub username is required.' });
    }

    const uid = req.user.uid;
    const cleanUsername = githubUsername.trim().toLowerCase();

    // ── KEY CHECK: Is this GitHub username already linked to a DIFFERENT account? ──
    const existingUser = await User.findOne({
      githubUsername: { $regex: new RegExp(`^${cleanUsername}$`, 'i') },
      uid: { $ne: uid }, // not the current user
      githubConnected: true,
    });

    if (existingUser) {
      return res.status(409).json({
        error: `GitHub account "@${githubUsername}" is already connected to another Insightify account. Each GitHub account can only be linked to one Insightify account.`,
      });
    }

    // Verify the username actually exists on GitHub before saving
    const data = await fetchGithubData(githubUsername.trim(), githubToken);

    // Save to user profile
    await User.findOneAndUpdate(
      { uid },
      {
        githubUsername: data.username, // use the exact casing from GitHub API
        githubToken:    githubToken || '',
        githubConnected: true,
      },
      { new: true }
    );

    // Save fetched stats
    const stats = await GithubStats.findOneAndUpdate(
      { uid },
      { uid, ...data },
      { upsert: true, new: true }
    );

    res.json({ message: 'GitHub connected successfully', stats });
  } catch (err) {
    handleErr(err, res);
  }
};

/** DELETE /api/github/disconnect */
const disconnectGithub = async (req, res) => {
  try {
    const uid = req.user.uid;
    await User.findOneAndUpdate(
      { uid },
      { githubUsername: '', githubToken: '', githubConnected: false }
    );
    await GithubStats.deleteOne({ uid });
    res.json({ message: 'GitHub disconnected successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getStats, syncStats, connectGithub, disconnectGithub };
