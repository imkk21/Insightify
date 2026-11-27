const axios = require('axios');

// One GraphQL round-trip replaces ~7 REST calls and adds the full-year contribution calendar.
const QUERY = `query($login: String!) {
  user(login: $login) {
    login name avatarUrl bio url
    followers { totalCount }
    following { totalCount }
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100, orderBy: {field: PUSHED_AT, direction: DESC}) {
      totalCount
      nodes {
        name description url stargazerCount forkCount pushedAt
        primaryLanguage { name }
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name } } }
      }
    }
    recent: repositories(ownerAffiliations: OWNER, isFork: false, first: 8, orderBy: {field: PUSHED_AT, direction: DESC}) {
      nodes {
        name
        defaultBranchRef { target { ... on Commit {
          history(first: 50) { nodes { oid messageHeadline committedDate url author { user { login } } } }
        } } }
      }
    }
    contributionsCollection {
      totalCommitContributions totalPullRequestContributions totalPullRequestReviewContributions
      totalIssueContributions restrictedContributionsCount
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
    pullRequests(first: 10, orderBy: {field: CREATED_AT, direction: DESC}) {
      totalCount
      nodes { title url state createdAt repository { nameWithOwner } }
    }
  }
}`;

// ── Pure helpers (unit-tested in githubService.test.js) ───────────────────────

/** days: [{date:'YYYY-MM-DD', count}] ascending. Today's zero doesn't break the streak yet. */
const computeStreaks = (days) => {
  let longest = 0, run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0;
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i--; // grace for today
  for (; i >= 0 && days[i].count > 0; i--) current++;
  return { current, longest };
};

/** Sum of counts over `n` days ending `offset` days before the last day. */
const sumDays = (days, n, offset = 0) =>
  days.slice(Math.max(0, days.length - offset - n), days.length - offset).reduce((s, d) => s + d.count, 0);

/** Language share by bytes across repos, top `limit`, percentages summing to ~100. */
const languageShares = (repos, limit = 6) => {
  const bytes = {};
  for (const r of repos) for (const e of r.languages?.edges || []) bytes[e.node.name] = (bytes[e.node.name] || 0) + e.size;
  const total = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(bytes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, b]) => ({ name, pct: Math.round((b / total) * 100) }))
    .filter((l) => l.pct > 0);
};

// ── Fetch ────────────────────────────────────────────────────────────────────

const fetchGithubData = async (username) => {
  const { data } = await axios.post(
    'https://api.github.com/graphql',
    { query: QUERY, variables: { login: username } },
    { headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}` } }
  );

  const user = data.data?.user;
  if (!user) {
    const err = new Error(data.errors?.[0]?.message || 'GitHub user not found');
    err.status = data.errors?.[0]?.type === 'NOT_FOUND' ? 404 : 502;
    throw err;
  }

  const repos = user.repositories.nodes;
  const cc = user.contributionsCollection;
  const calendar = cc.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount }));

  const login = user.login.toLowerCase();
  const recentCommits = user.recent.nodes
    .flatMap((r) => (r.defaultBranchRef?.target?.history?.nodes || []).map((c) => ({ ...c, repo: r.name })))
    .filter((c) => c.author?.user?.login?.toLowerCase() === login)
    .sort((a, b) => new Date(b.committedDate) - new Date(a.committedDate))
    .slice(0, 100)
    .map((c) => ({ repo: c.repo, message: c.messageHeadline, sha: c.oid.slice(0, 7), date: c.committedDate, url: c.url }));

  return {
    username: user.login,
    profile: {
      name: user.name || user.login,
      avatarUrl: user.avatarUrl,
      bio: user.bio || '',
      url: user.url,
      followers: user.followers.totalCount,
      following: user.following.totalCount,
    },
    totals: {
      repos: user.repositories.totalCount,
      stars: repos.reduce((s, r) => s + r.stargazerCount, 0),
      forks: repos.reduce((s, r) => s + r.forkCount, 0),
      contributionsYear: cc.contributionCalendar.totalContributions,
      commitsYear: cc.totalCommitContributions,
      prsYear: cc.totalPullRequestContributions,
      reviewsYear: cc.totalPullRequestReviewContributions,
      issuesYear: cc.totalIssueContributions,
      privateContributions: cc.restrictedContributionsCount,
    },
    weeklyContributions: sumDays(calendar, 7),
    lastWeekContributions: sumDays(calendar, 7, 7),
    streak: computeStreaks(calendar),
    calendar,
    languages: languageShares(repos),
    topRepos: [...repos]
      .sort((a, b) => b.stargazerCount - a.stargazerCount || new Date(b.pushedAt) - new Date(a.pushedAt))
      .slice(0, 8)
      .map((r) => ({
        name: r.name,
        description: r.description || '',
        url: r.url,
        stars: r.stargazerCount,
        forks: r.forkCount,
        language: r.primaryLanguage?.name || null,
        pushedAt: r.pushedAt,
      })),
    recentCommits,
    pullRequests: user.pullRequests.nodes.map((p) => ({
      title: p.title, url: p.url, state: p.state, createdAt: p.createdAt, repo: p.repository.nameWithOwner,
    })),
    fetchedAt: new Date(),
  };
};

module.exports = { fetchGithubData, computeStreaks, sumDays, languageShares };
