const Insight = require('../models/Insight');
const GithubStats = require('../models/GithubStats');
const Weather = require('../models/Weather');
const News = require('../models/News');
const { generateInsight } = require('../services/insightService');

/** GET /api/insight  – latest insight */
const getLatestInsight = async (req, res) => {
  try {
    const insight = await Insight.findOne({ uid: req.user.uid }).sort({ createdAt: -1 });
    if (!insight) return res.status(404).json({ error: 'No insights yet. Click "Generate Insight" to create your first.' });
    res.json(insight);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/** GET /api/insight/history */
const getInsightHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const insights = await Insight.find({ uid: req.user.uid })
      .sort({ createdAt: -1 }).limit(limit);
    res.json(insights);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/** POST /api/insight/generate – always creates a NEW insight document */
const generateNewInsight = async (req, res) => {
  try {
    const uid = req.user.uid;
    const [github, weather, news] = await Promise.all([
      GithubStats.findOne({ uid }),
      Weather.findOne({ uid }),
      News.findOne({ uid }),
    ]);

    const result = await generateInsight({ github, weather, news });
    const weekOf = new Date();
    weekOf.setDate(weekOf.getDate() - weekOf.getDay());

    // Always INSERT new — never upsert (that was causing duplicate key)
    const insight = await Insight.create({
      uid,
      content: result.content,
      prompt:  result.prompt,
      model:   result.model,
      type:    req.body.type || 'weekly',
      weekOf,
      dataSnapshot: {
        commits:   github?.weeklyCommits,
        repos:     github?.totalRepos,
        stars:     github?.totalStars,
        city:      weather?.city,
        temp:      weather?.current?.temp,
        newsCount: news?.articles?.length,
      },
    });

    res.json(insight);
  } catch (err) {
    console.error('generateNewInsight error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/** POST /api/insight/custom */
const generateCustomInsight = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const [github, weather, news] = await Promise.all([
      GithubStats.findOne({ uid }),
      Weather.findOne({ uid }),
      News.findOne({ uid }),
    ]);

    const result = await generateInsight({ github, weather, news, customPrompt: prompt });

    const insight = await Insight.create({
      uid,
      content: result.content,
      prompt,
      model:   result.model,
      type:    'custom',
    });

    res.json(insight);
  } catch (err) {
    console.error('generateCustomInsight error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getLatestInsight, getInsightHistory, generateNewInsight, generateCustomInsight };
