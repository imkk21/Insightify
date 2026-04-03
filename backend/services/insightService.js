const { GoogleGenerativeAI } = require('@google/generative-ai');

const getModel = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key') return null;
  const genAI = new GoogleGenerativeAI(key);
  // Using gemini-2.0-flash based on API availability (June 2025 stable release)
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
};

const buildPrompt = ({ github, weather, news, customPrompt }) => {
  if (customPrompt) {
    // For custom prompts, inject developer context as preamble
    const topLangs = github?.languages
      ? Object.entries(github.languages).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([l])=>l).join(', ')
      : 'JavaScript';
    return `You are Insightify, a smart AI assistant for software developers.

Developer Context:
- GitHub: ${github?.totalRepos ?? 0} repos, ${github?.weeklyCommits ?? 0} commits this week, ${github?.totalStars ?? 0} stars
- Top Languages: ${topLangs}
- Location: ${weather?.city ?? 'Unknown'}, Temp: ${weather?.current?.temp ?? '?'}°C, ${weather?.current?.description ?? ''}
- Latest tech news available: ${news?.articles?.length ?? 0} articles

User question: ${customPrompt}

Answer helpfully, specifically, and in 2-3 paragraphs. Reference the developer's actual data where relevant.`;
  }

  const topLangs = github?.languages
    ? Object.entries(github.languages).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([l])=>l).join(', ')
    : 'JavaScript';

  const headlines = (news?.articles || []).slice(0, 5)
    .map((a, i) => `${i+1}. ${a.title}`).join('\n');

  return `You are Insightify, generating a personalized weekly insight for a software developer.

GITHUB ACTIVITY:
- Repositories: ${github?.totalRepos ?? 'N/A'}
- Weekly commits: ${github?.weeklyCommits ?? 'N/A'}
- Total stars: ${github?.totalStars ?? 'N/A'}
- Top languages: ${topLangs}
- Top repo: ${github?.topRepos?.[0]?.name ?? 'N/A'} (${github?.topRepos?.[0]?.stars ?? 0} ⭐)

ENVIRONMENT (${weather?.city ?? 'Unknown'}):
- Temperature: ${weather?.current?.temp ?? 'N/A'}°C, feels like ${weather?.current?.feelsLike ?? 'N/A'}°C
- Conditions: ${weather?.current?.description ?? 'N/A'}
- Humidity: ${weather?.current?.humidity ?? 'N/A'}%

TOP TECH HEADLINES:
${headlines || 'No headlines available'}

Write a 3-4 sentence data-driven, motivating weekly insight in second person ("You pushed X commits...").
Mention specific numbers. Tie together GitHub activity, environmental conditions, and tech news.
End with one concrete actionable recommendation for next week.`;
};

const generateInsight = async ({ github, weather, news, customPrompt }) => {
  const prompt = buildPrompt({ github, weather, news, customPrompt });
  const model = getModel();

  if (model) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text && text.trim().length > 20) {
        return { content: text.trim(), model: 'gemini-1.5-flash', prompt };
      }
    } catch (err) {
      console.error('Gemini failed:', err.message);
    }
  } else {
    console.warn('Gemini API key not configured – using fallback.');
  }

  // Fallback template
  const lang = github?.languages
    ? Object.entries(github.languages)
        .filter(([key]) => !key.startsWith('$') && !key.startsWith('_'))
        .sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 'JavaScript'
    : 'JavaScript';
  const fallback = `You pushed ${github?.weeklyCommits ?? 0} commits this week across ${github?.totalRepos ?? 0} repositories, with ${lang} leading your stack. Working in ${weather?.current?.description ?? 'current conditions'} at ${weather?.current?.temp ?? '?'}°C in ${weather?.city ?? 'your city'} — ${(github?.weeklyCommits ?? 0) > 10 ? 'excellent momentum this week!' : 'every commit counts toward your goals.'} The tech world is buzzing with new developments — great time to stay current. Next week, aim to open at least one pull request on your top-starred repository to grow community traction.`;

  return { content: fallback, model: 'fallback-template', prompt };
};

module.exports = { generateInsight, buildPrompt };
