const cron = require('node-cron');
const User = require('../models/User');
const Weather = require('../models/Weather');
const Insight = require('../models/Insight');
const { fetchGithubData } = require('../services/githubService');
const { fetchWeatherData } = require('../services/weatherService');
const { getLatestNews } = require('../services/newsService');
const { generateInsight } = require('../services/insightService');
const { saveStats } = require('../controllers/githubController');
const { createReport, sendReportToSlack } = require('../controllers/reportController');
const { runScan } = require('../controllers/securityController');

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
      const github = await saveStats(user.uid, await fetchGithubData(user.githubUsername));

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
          commits:   github.weeklyContributions,
          repos:     github.totals?.repos,
          stars:     github.totals?.stars,
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

/** Generate a report for every user with a Slack webhook and post it. */
const slackReportJob = (type) => async () => {
  const users = await User.find({ slackWebhookUrl: { $ne: '' } });
  console.log(`[CRON] Sending ${type} to ${users.length} Slack user(s)`);
  for (const user of users) {
    try {
      await sendReportToSlack(user, await createReport(user.uid, type));
    } catch (err) {
      console.error(`[CRON] ${type} failed for ${user.email}:`, err.response?.status || err.message);
    }
  }
};

/** Weekly dependency scan for every GitHub-connected user. */
const securityScanJob = async () => {
  const users = await User.find({ githubUsername: { $ne: '' } });
  for (const user of users) {
    try {
      const scan = await runScan(user.uid, user.githubUsername);
      console.log(`[CRON] Security scan ${user.email}: ${scan.totals.findings} findings`);
    } catch (err) {
      console.error(`[CRON] Security scan failed for ${user.email}:`, err.message);
    }
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
  cron.schedule('30 7 * * 1', securityScanJob, { timezone: 'Asia/Kolkata' });
  cron.schedule('0 9 * * 1-5', slackReportJob('standup'), { timezone: 'Asia/Kolkata' });
  cron.schedule('30 9 * * 1', slackReportJob('report'), { timezone: 'Asia/Kolkata' });
  console.log('⏰ Cron jobs scheduled (Insights Mon 08:00 | Standups Mon–Fri 09:00 | Weekly report Mon 09:30 IST | News hourly)');
};

module.exports = { startCronJobs, weeklyInsightJob, hourlyNewsJob, slackReportJob, securityScanJob };
