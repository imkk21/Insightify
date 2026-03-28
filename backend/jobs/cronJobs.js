const cron = require('node-cron');
const User = require('../models/User');
const GithubStats = require('../models/GithubStats');
const Weather = require('../models/Weather');
const News = require('../models/News');
const Insight = require('../models/Insight');
const { fetchGithubData } = require('../services/githubService');
const { fetchWeatherData } = require('../services/weatherService');
const { fetchNewsData } = require('../services/newsService');
const { generateInsight } = require('../services/insightService');

/**
 * Sync all data sources for every user, then generate a weekly insight.
 * Runs every Monday at 08:00 AM.
 */
const weeklyInsightJob = async () => {
  console.log('[CRON] Starting weekly insight generation…');
  const users = await User.find({ githubUsername: { $ne: '' } });

  for (const user of users) {
    try {
      console.log(`[CRON] Processing user: ${user.email}`);

      // 1. Sync GitHub
      const githubData = await fetchGithubData(user.githubUsername);
      const github = await GithubStats.findOneAndUpdate(
        { uid: user.uid },
        { uid: user.uid, ...githubData },
        { upsert: true, new: true }
      );

      // 2. Sync Weather
      const weatherData = await fetchWeatherData(user.city);
      const weather = await Weather.findOneAndUpdate(
        { uid: user.uid },
        { uid: user.uid, ...weatherData },
        { upsert: true, new: true }
      );

      // 3. Sync News
      const newsData = await fetchNewsData();
      const news = await News.findOneAndUpdate(
        { uid: user.uid },
        { uid: user.uid, ...newsData },
        { upsert: true, new: true }
      );

      // 4. Generate insight
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
          newsCount: news.articles?.length,
        },
      });

      console.log(`[CRON] ✅ Insight generated for ${user.email}`);
    } catch (err) {
      console.error(`[CRON] ❌ Failed for ${user.email}:`, err.message);
    }
  }

  console.log('[CRON] Weekly insight job complete.');
};

/**
 * Hourly news sync for all users.
 */
const hourlyNewsJob = async () => {
  console.log('[CRON] Syncing news…');
  try {
    const users = await User.find({});
    const newsData = await fetchNewsData(); // single fetch shared across users
    for (const user of users) {
      await News.findOneAndUpdate(
        { uid: user.uid },
        { uid: user.uid, ...newsData },
        { upsert: true }
      );
    }
    console.log(`[CRON] News synced for ${users.length} users`);
  } catch (err) {
    console.error('[CRON] News sync failed:', err.message);
  }
};

const startCronJobs = () => {
  // Weekly: every Monday at 08:00
  cron.schedule('0 8 * * 1', weeklyInsightJob, {
    timezone: 'Asia/Kolkata',
  });

  // Hourly news sync
  cron.schedule('0 * * * *', hourlyNewsJob, {
    timezone: 'Asia/Kolkata',
  });

  console.log('⏰ Cron jobs scheduled (Weekly insights: Mon 08:00 IST | Hourly news sync)');
};

module.exports = { startCronJobs, weeklyInsightJob };
