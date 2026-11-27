const { askGemini } = require('./insightService');

const HOUR = 60 * 60 * 1000;

/** Standup covers the last working day: 24h, or since Friday morning on a Monday. */
const standupSince = (now = new Date()) => new Date(now - (now.getDay() === 1 ? 72 : 24) * HOUR);
const weekSince = (now = new Date()) => new Date(now - 7 * 24 * HOUR);

/** Commits/PRs/tasks inside the window. `gh` = GithubStats doc (or null), `tasks` = Task docs. */
const collectActivity = (gh, tasks, since) => {
  const after = (d) => new Date(d) >= since;
  const commits = (gh?.recentCommits || []).filter((c) => after(c.date));
  const byRepo = {};
  for (const c of commits) (byRepo[c.repo] ||= []).push(c);
  return {
    commits,
    byRepo,
    prs: (gh?.pullRequests || []).filter((p) => after(p.createdAt)),
    openPrs: (gh?.pullRequests || []).filter((p) => p.state === 'OPEN'),
    done: tasks.filter((t) => t.status === 'done' && after(t.updatedAt)),
    inProgress: tasks.filter((t) => t.status === 'in-progress'),
    todo: tasks.filter((t) => t.status === 'todo'),
  };
};

const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const list = (items, empty) => (items.length ? items.map((i) => `- ${i}`).join('\n') : `- ${empty}`);

const templateStandup = (a) => {
  const yesterday = [
    ...Object.entries(a.byRepo).map(([repo, cs]) => `**${repo}**: ${cs.slice(0, 3).map((c) => c.message).join('; ')}${cs.length > 3 ? ` (+${cs.length - 3} more)` : ''}`),
    ...a.prs.map((p) => `Opened PR [${p.title}](${p.url})`),
    ...a.done.map((t) => `Finished: ${t.title}`),
  ];
  const today = [
    ...a.inProgress.map((t) => `Continue: ${t.title}`),
    ...a.todo.slice(0, 3).map((t) => `Start: ${t.title}`),
    ...a.openPrs.map((p) => `Follow up on PR [${p.title}](${p.url})`),
  ];
  return `## Yesterday\n${list(yesterday, 'No tracked activity')}\n\n## Today\n${list(today, 'Plan the next task')}\n\n## Blockers\n- None`;
};

const templateWeekly = (a, gh) => {
  const w = gh?.weeklyContributions ?? 0;
  const last = gh?.lastWeekContributions ?? 0;
  const highlights = [
    `${plural(w, 'contribution')} this week (${w >= last ? '+' : ''}${w - last} vs last week)`,
    `${plural(a.commits.length, 'commit')} across ${plural(Object.keys(a.byRepo).length, 'repository', 'repositories')}`,
    a.prs.length ? `${plural(a.prs.length, 'pull request')} opened` : null,
    a.done.length ? `${plural(a.done.length, 'task')} completed` : null,
    gh?.streak ? `Current streak: ${plural(gh.streak.current, 'day')} (best ${gh.streak.longest})` : null,
  ].filter(Boolean);
  const repos = Object.entries(a.byRepo)
    .sort((x, y) => y[1].length - x[1].length)
    .map(([repo, cs]) => `**${repo}** (${plural(cs.length, 'commit')}): ${cs.slice(0, 3).map((c) => c.message).join('; ')}`);
  return [
    `## Highlights\n${list(highlights, 'No activity this week')}`,
    `## Work by repository\n${list(repos, 'No commits this week')}`,
    `## Pull requests\n${list(a.prs.map((p) => `[${p.title}](${p.url}) (${p.state.toLowerCase()})`), 'None this week')}`,
    `## Completed tasks\n${list(a.done.map((t) => t.title), 'None')}`,
    `## Next week\n${list([...a.inProgress, ...a.todo].slice(0, 4).map((t) => t.title), 'Plan the next goals')}`,
  ].join('\n\n');
};

/** Builds the report; Gemini polishes the template when available, otherwise the template is returned as-is. */
const generateReport = async (type, gh, tasks, now = new Date()) => {
  const since = type === 'standup' ? standupSince(now) : weekSince(now);
  const a = collectActivity(gh, tasks, since);
  const draft = type === 'standup' ? templateStandup(a) : templateWeekly(a, gh);
  const instructions = type === 'standup'
    ? 'Rewrite this daily standup so it reads naturally to teammates. Keep exactly the three "## Yesterday", "## Today", "## Blockers" sections with short "- " bullets. Group related commits into one bullet; do not invent work.'
    : 'Rewrite this weekly engineering report for a manager. Keep the same "## " sections and "- " bullets, summarise commit messages into outcomes, keep numbers and links exact, do not invent work.';
  return askGemini(`${instructions}\nReturn Markdown only.\n\n${draft}`, draft);
};

/** Slack mrkdwn: no headings, single-asterisk bold, <url|text> links, bullet dots. */
const toSlackMrkdwn = (md) =>
  md
    .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<$2|$1>')
    .replace(/^[-*]\s+/gm, '• ');

module.exports = { generateReport, collectActivity, templateStandup, templateWeekly, standupSince, toSlackMrkdwn };
