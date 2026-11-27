const Insight = require('../models/Insight');
const Task = require('../models/Task');
const User = require('../models/User');
const { freshStats } = require('./githubController');
const { generateReport } = require('../services/reportService');
const { postToSlack } = require('../services/slackService');

const TITLES = { standup: 'Daily standup', report: 'Weekly report' };

/** Shared by the API and the cron jobs. */
const createReport = async (uid, type) => {
  const [gh, tasks] = await Promise.all([
    freshStats(uid).catch(() => null), // a GitHub hiccup shouldn't block the report
    Task.find({ uid }),
  ]);
  const result = await generateReport(type, gh, tasks);
  return Insight.create({ uid, type, content: result.content, prompt: result.prompt, model: result.model });
};

const sendReportToSlack = async (user, report) => {
  await postToSlack(user.slackWebhookUrl, `${TITLES[report.type]} · ${user.displayName || user.email}`, report.content);
};

/** POST /api/reports  { type: 'standup' | 'report' } */
const create = async (req, res) => {
  try {
    const { type } = req.body;
    if (!TITLES[type]) return res.status(400).json({ error: "type must be 'standup' or 'report'" });
    res.status(201).json(await createReport(req.user.uid, type));
  } catch (err) {
    console.error('createReport error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/** POST /api/reports/:id/slack */
const sendToSlack = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user?.slackWebhookUrl) return res.status(400).json({ error: 'Add a Slack webhook in Settings first.' });
    const report = await Insight.findOne({ _id: req.params.id, uid: req.user.uid, type: { $in: Object.keys(TITLES) } });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    await sendReportToSlack(user, report);
    res.json({ message: 'Sent to Slack' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid report id' });
    // Slack answers 403/404 for revoked or deleted webhooks
    const status = err.response?.status;
    res.status(502).json({ error: status ? `Slack rejected the message (${status}). Check the webhook in Settings.` : err.message });
  }
};

module.exports = { create, sendToSlack, createReport, sendReportToSlack };
