const { getLatestNews } = require('../services/newsService');

/** GET /api/news – shared headlines, refreshed at most hourly */
const getNews = async (_req, res) => {
  try {
    res.json(await getLatestNews());
  } catch (err) {
    console.error('getNews error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getNews };
