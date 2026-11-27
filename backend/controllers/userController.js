const User = require('../models/User');

const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// Only real Slack webhooks: the server POSTs to this URL, so anything else would be an SSRF hole
const SLACK_WEBHOOK = /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+$/;

const updateProfile = async (req, res) => {
  try {
    const { city, displayName, lat, lon, slackWebhookUrl } = req.body;
    const updates = {};
    if (slackWebhookUrl !== undefined) {
      const url = String(slackWebhookUrl).trim();
      if (url && !SLACK_WEBHOOK.test(url)) {
        return res.status(400).json({ error: 'That is not a Slack incoming webhook URL (https://hooks.slack.com/services/…).' });
      }
      updates.slackWebhookUrl = url;
    }
    if (city !== undefined)       updates.city        = city;
    if (displayName !== undefined) updates.displayName = displayName;
    if (lat != null)              updates.lat         = lat;
    if (lon != null)              updates.lon         = lon;

    const user = await User.findOneAndUpdate(
      { uid: req.user.uid }, updates, { new: true }
    );
    res.json({ message: 'Profile updated', user });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getProfile, updateProfile };
