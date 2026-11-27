const cron = require('node-cron');
const User = require('../models/User');
const GithubStats = require('../models/GithubStats');
const Weather = require('../models/Weather');
const Insight = require('../models/Insight');
const { fetchGithubData } = require('../services/githubService');
const { fetchWeatherData } = require('../services/weatherService');
const { getLatestNews } = require('../services/newsService');
const { generateInsight } = require('../services/insightService');

/**
 * Sync GitHub + weather for every GitHub-connected user, then generate a weekly insight.
 * Runs every Monday at 08:00 IST.
 */
const weeklyInsightJob = async () => {
  console.log('[CRON] Starting weekly insight generation…');
  const users = await User.find({ githubUsername: { $ne: '' } });
  const news = await getLatestNews().catch((err) => {
    console.error('[CRON] News fetch failed:', err.message);
    return null;
  });

  for (const user of users) {
    try {
      const githubData = await fetchGithubData(user.githubUsername);
      const github = await GithubStats.findOneAndUpdate(
        { uid: user.uid }, { uid: user.uid, ...githubData }, { upsert: true, new: true }
      );

      const weatherData = await fetchWeatherData({ city: user.city, lat: user.lat, lon: user.lon });
      const weather = await Weather.findOneAndUpdate(
        { uid: user.uid }, { uid: user.uid, ...weatherData }, { upsert: true, new: true }
      );

      const result = await generateInsight({ github, weather, news });
      const weekOf = new Date();
      weekOf.setDate(weekOf.getDate() - weekOf.getDay());

      await Insight.create({
        uid:     user.uid,
        content: result.content,
        prompt:  result.prompt,
        model:   result.model,
        type:    'weekly',
        weekOf,
        dataSnapshot: {
          commits:   github.weeklyCommits,
          repos:     github.totalRepos,
          stars:     github.totalStars,
          city:      weather.city,
          temp:      weather.current?.temp,
          newsCount: news?.articles?.length,
        },
      });

      console.log(`[CRON] ✅ Insight generated for ${user.email}`);
    } catch (err) {
      console.error(`[CRON] ❌ Failed for ${user.email}:`, err.message);
    }
  }

  console.log('[CRON] Weekly insight job complete.');
};

/** Hourly refresh of the shared tech headlines. */
const hourlyNewsJob = async () => {
  try {
    await getLatestNews({ force: true });
    console.log('[CRON] News refreshed');
  } catch (err) {
    console.error('[CRON] News refresh failed:', err.message);
  }
};

const startCronJobs = () => {
  // Local dev shares the production database: never run scheduled writes from it
  if (process.env.NODE_ENV === 'development') {
    console.log('⏰ Cron jobs disabled in development');
    return;
  }
  cron.schedule('0 8 * * 1', weeklyInsightJob, { timezone: 'Asia/Kolkata' });
  cron.schedule('0 * * * *', hourlyNewsJob, { timezone: 'Asia/Kolkata' });
  console.log('⏰ Cron jobs scheduled (Weekly insights: Mon 08:00 IST | Hourly news refresh)');
};

module.exports = { startCronJobs };
