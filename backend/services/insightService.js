const { GoogleGenerativeAI } = require('@google/generative-ai');

// Google retires model versions; override with GEMINI_MODEL instead of editing code.
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const getModel = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key') return null;
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: MODEL_NAME });
};

/** Run a prompt; on missing key or API failure return `fallback` instead of throwing. */
const askGemini = async (prompt, fallback) => {
  const model = getModel();
  if (model) {
    try {
      const text = (await model.generateContent(prompt)).response.text()?.trim();
      if (text && text.length > 20) return { content: text, model: MODEL_NAME, prompt };
    } catch (err) {
      console.error('Gemini failed:', err.message);
    }
  }
  return { content: fallback, model: 'fallback-template', prompt };
};

/** Plain-text summary of the developer's data, shared by every prompt. */
const devContext = (github, weather, news) => {
  const t = github?.totals;
  const lines = [];
  if (t) {
    const delta = (github.weeklyContributions ?? 0) - (github.lastWeekContributions ?? 0);
    lines.push(
      `GitHub @${github.username}: ${t.repos} repos, ${t.stars} stars, ${t.contributionsYear} contributions in the last year (${t.commitsYear} commits, ${t.prsYear} PRs, ${t.reviewsYear} reviews).`,
      `This week: ${github.weeklyContributions} contributions (${delta >= 0 ? '+' : ''}${delta} vs last week). Current streak ${github.streak?.current} days, longest ${github.streak?.longest}.`,
      `Top languages: ${(github.languages || []).slice(0, 3).map((l) => `${l.name} ${l.pct}%`).join(', ') || 'unknown'}.`,
      `Recently active repos: ${[...new Set((github.recentCommits || []).slice(0, 15).map((c) => c.repo))].slice(0, 4).join(', ') || 'none'}.`,
    );
  } else {
    lines.push('GitHub: not connected.');
  }
  if (weather?.current) lines.push(`Weather in ${weather.city}: ${weather.current.temp}°C, ${weather.current.description}.`);
  const headlines = (news?.articles || []).slice(0, 5).map((a) => `- ${a.title}`).join('\n');
  if (headlines) lines.push(`Tech headlines:\n${headlines}`);
  return lines.join('\n');
};

const generateInsight = async ({ github, weather, news, customPrompt }) => {
  const context = devContext(github, weather, news);

  if (customPrompt) {
    return askGemini(
      `You are Insightify, an assistant for software developers.\n\n${context}\n\nQuestion: ${customPrompt}\n\nAnswer helpfully in 2-3 short paragraphs, using the developer's actual data where relevant.`,
      'The AI assistant is unavailable right now, so this question could not be answered. Please try again later.'
    );
  }

  const w = github?.weeklyContributions ?? 0;
  const last = github?.lastWeekContributions ?? 0;
  const fallback = github?.totals
    ? `You made ${w} contribution${w === 1 ? '' : 's'} this week, ${w >= last ? 'up' : 'down'} from ${last} last week, with ${github.languages?.[0]?.name ?? 'your main language'} leading your stack. Your current streak is ${github.streak.current} day${github.streak.current === 1 ? '' : 's'} (best: ${github.streak.longest}). Next week, try to beat ${Math.max(w, last) + 1} contributions.`
    : 'Connect GitHub to get a weekly insight based on your real activity.';

  return askGemini(
    `You are Insightify, writing a personalized weekly insight for a software developer.\n\n${context}\n\nWrite 3-4 sentences in second person ("You made X contributions..."). Use specific numbers, compare with last week, mention the streak if notable, and end with one concrete, actionable recommendation for next week. No headings, no bullet points.`,
    fallback
  );
};

module.exports = { generateInsight, getModel, askGemini, devContext };
