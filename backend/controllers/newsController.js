const News = require('../models/News');
const { fetchNewsData } = require('../services/newsService');

/**
 * GET /api/news
 * Returns cached news or fetches fresh if older than 1 hour.
 */
const getNews = async (req, res) => {
  try {
    const uid = req.user.uid;
    const cached = await News.findOne({ uid });

    const ONE_HOUR = 60 * 60 * 1000;
    const isFresh = cached && Date.now() - new Date(cached.fetchedAt).getTime() < ONE_HOUR;

    if (isFresh) return res.json(cached);

    const data = await fetchNewsData();
    const news = await News.findOneAndUpdate(
      { uid },
      { uid, ...data },
      { upsert: true, new: true }
    );

    res.json(news);
  } catch (err) {
    console.error('getNews error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/news/sync
 * Force refresh news feed.
 */
const syncNews = async (req, res) => {
  try {
    const uid = req.user.uid;
    const data = await fetchNewsData();
    const news = await News.findOneAndUpdate(
      { uid },
      { uid, ...data },
      { upsert: true, new: true }
    );
    res.json({ message: 'News synced', news });
  } catch (err) {
    console.error('syncNews error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getNews, syncNews };
