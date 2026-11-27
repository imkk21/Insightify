const User = require('../models/User');
const GithubStats = require('../models/GithubStats');
const { freshStats } = require('./githubController');
const { wrappedStats } = require('../services/wrappedService');

const GITHUB_LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

/** GET /api/public/:username – no auth. Only users who opted in; only public GitHub data, whitelisted field by field. */
const getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;
    if (!GITHUB_LOGIN.test(username)) return res.status(404).json({ error: 'Profile not found' });

    const user = await User.findOne({ githubUsername: username, githubConnected: true, publicProfile: true })
      .collation({ locale: 'en', strength: 2 });
    if (!user) return res.status(404).json({ error: 'Profile not found' });

    // Refreshes at most hourly; if GitHub is down, serve the last snapshot
    const gh = await freshStats(user.uid).catch(() => GithubStats.findOne({ uid: user.uid }));
    if (!gh?.totals) return res.status(404).json({ error: 'Profile not found' });

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      username: gh.username,
      profile: gh.profile,
      totals: gh.totals,
      streak: gh.streak,
      weeklyContributions: gh.weeklyContributions,
      calendar: gh.calendar,
      languages: gh.languages,
      topRepos: (gh.topRepos || []).slice(0, 6),
      wrapped: wrappedStats(gh),
      fetchedAt: gh.fetchedAt,
    });
  } catch (err) {
    console.error('public profile error:', err.message);
    res.status(500).json({ error: 'Could not load profile' });
  }
};

module.exports = { getPublicProfile };
