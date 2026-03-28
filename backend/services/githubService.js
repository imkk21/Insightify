const axios = require('axios');

const GH_BASE = 'https://api.github.com';

// Use user's own OAuth token if available, else fall back to server token
const headers = (userToken) => ({
  Authorization: `token ${userToken || process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
});

const fetchGithubData = async (username, userToken) => {
  const h = headers(userToken);

  const { data: profile } = await axios.get(`${GH_BASE}/users/${username}`, { headers: h });

  const { data: repos } = await axios.get(
    `${GH_BASE}/users/${username}/repos?per_page=100&sort=updated`,
    { headers: h }
  );

  let totalStars = 0, totalForks = 0;
  const langMap = {};
  repos.forEach((r) => {
    totalStars += r.stargazers_count || 0;
    totalForks += r.forks_count || 0;
    if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1;
  });

  const topRepos = repos
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 6)
    .map((r) => ({
      name:        r.name,
      description: r.description || '',
      stars:       r.stargazers_count,
      forks:       r.forks_count,
      language:    r.language || 'Unknown',
      url:         r.html_url,
      updatedAt:   new Date(r.updated_at),
    }));

  const recentCommits = [];
  for (const repo of repos.slice(0, 5)) {
    try {
      const { data: commits } = await axios.get(
        `${GH_BASE}/repos/${username}/${repo.name}/commits?per_page=5`,
        { headers: h }
      );
      commits.forEach((c) => {
        recentCommits.push({
          repo:    repo.name,
          message: c.commit.message.split('\n')[0],
          sha:     c.sha.slice(0, 7),
          date:    new Date(c.commit.author.date),
          url:     c.html_url,
        });
      });
    } catch { /* skip */ }
  }

  recentCommits.sort((a, b) => b.date - a.date);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyCommits = recentCommits.filter((c) => c.date >= oneWeekAgo).length;

  return {
    username:     profile.login,
    totalRepos:   profile.public_repos,
    totalStars,
    totalForks,
    followers:    profile.followers,
    following:    profile.following,
    languages:    langMap,
    topRepos,
    recentCommits: recentCommits.slice(0, 20),
    weeklyCommits,
    fetchedAt: new Date(),
  };
};

module.exports = { fetchGithubData };
