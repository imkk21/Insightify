const axios = require('axios');

const NEWS_BASE = 'https://newsapi.org/v2';

/**
 * Fetch top technology headlines.
 */
const fetchNewsData = async () => {
  const key = process.env.NEWS_API_KEY;

  const { data } = await axios.get(`${NEWS_BASE}/top-headlines`, {
    params: {
      category: 'technology',
      language: 'en',
      pageSize: 20,
      apiKey: key,
    },
  });

  const articles = (data.articles || [])
    .filter((a) => a.title && a.title !== '[Removed]')
    .map((a) => ({
      title:       a.title,
      description: a.description || '',
      url:         a.url,
      source:      a.source?.name || 'Unknown',
      author:      a.author || '',
      publishedAt: new Date(a.publishedAt),
      urlToImage:  a.urlToImage || '',
      category:    'technology',
    }));

  return { articles, fetchedAt: new Date() };
};

module.exports = { fetchNewsData };
