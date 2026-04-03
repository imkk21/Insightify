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

/** POST /api/insight/refactor */
const generateCodeRefactor = async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ error: 'Code snippet is required' });

    const model = require('../services/insightService').getModel();
    if (!model) return res.status(500).json({ error: 'AI model not configured' });

    const prompt = `You are an expert senior software engineer. Optimize, refactor, and explain the following ${language || ''} code snippet. 
    Focus on readability, performance, and modern best practices.
    
    Code to refactor:
    \`\`\`${language || ''}
    ${code}
    \`\`\`
    
    Return your response in markdown format with:
    1. A "Refactored Code" section with the code block.
    2. A "Key Improvements" section with bullet points.
    3. A "Complexity Analysis" section.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ content: text.trim() });
  } catch (err) {
    console.error('generateCodeRefactor error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getLatestInsight, getInsightHistory, generateNewInsight, generateCustomInsight, generateCodeRefactor };
