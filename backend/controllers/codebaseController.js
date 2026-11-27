const CodebaseReport = require('../models/CodebaseReport');
const User = require('../models/User');
const { freshStats } = require('./githubController');
const { listRepos, analyzeRepo, generateTour } = require('../services/codebaseService');

const DAY = 24 * 60 * 60 * 1000;
const MIN_REFRESH = 2 * 60 * 1000; // an analysis costs ~200 GitHub requests
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;
const inflight = new Map(); // `${uid}/${repo}` → Promise, so double-clicks share one analysis

const fail = (res, err) => {
  const status = err.status || err.response?.status;
  if (status === 404) return res.status(404).json({ error: 'Repository not found on your GitHub account.' });
  if (status === 403 || status === 429) return res.status(429).json({ error: 'GitHub rate limit hit. Try again later.' });
  if (status === 409) return res.status(422).json({ error: 'This repository is empty.' });
  console.error('codebase error:', err.message);
  return res.status(502).json({ error: `Analysis failed: ${err.message}` });
};

/** Validates :repo and the user's GitHub link; sends the error response and returns null on failure. */
const target = async (req, res) => {
  const { repo } = req.params;
  if (!REPO_RE.test(repo) || repo === '.' || repo === '..') { res.status(400).json({ error: 'Invalid repository name.' }); return null; }
  const user = await User.findOne({ uid: req.user.uid }, { githubUsername: 1 });
  if (!user?.githubUsername) { res.status(400).json({ error: 'Connect GitHub first.' }); return null; }
  return { uid: req.user.uid, owner: user.githubUsername, repo };
};

/** GET /api/codebase/repos */
const getRepos = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid }, { githubUsername: 1 });
    if (!user?.githubUsername) return res.status(400).json({ error: 'Connect GitHub first.' });
    const [stats, listed] = await Promise.all([freshStats(req.user.uid).catch(() => null), listRepos(user.githubUsername)]);
    const byName = new Map(listed.map((r) => [r.name, r]));
    for (const r of stats?.topRepos || []) {
      if (!byName.has(r.name)) byName.set(r.name, { name: r.name, description: r.description, stars: r.stars, pushedAt: r.pushedAt, language: r.language });
    }
    const analysed = await CodebaseReport.find({ uid: req.user.uid }, { repo: 1, generatedAt: 1 });
    const done = Object.fromEntries(analysed.map((a) => [a.repo, a.generatedAt]));
    const repos = [...byName.values()]
      .map((r) => ({ ...r, analysedAt: done[r.name] || null }))
      .sort((a, b) => new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0));
    res.json({ username: user.githubUsername, repos });
  } catch (err) { fail(res, err); }
};

/** GET /api/codebase/:repo[?refresh=1|?cached=1] – cached report if <24h old, else a fresh analysis. */
const getReport = async (req, res) => {
  try {
    const t = await target(req, res);
    if (!t) return;
    const cached = await CodebaseReport.findOne({ uid: t.uid, repo: t.repo }, { tour: 0 });
    if (req.query.cached === '1') return res.json({ report: cached });
    const age = cached ? Date.now() - cached.generatedAt.getTime() : Infinity;
    if (age < MIN_REFRESH || (age < DAY && req.query.refresh !== '1')) return res.json({ report: cached });

    const key = `${t.uid}/${t.repo}`;
    if (!inflight.has(key)) {
      inflight.set(key, analyzeRepo(t.owner, t.repo)
        .then((result) => CodebaseReport.findOneAndReplace(
          { uid: t.uid, repo: t.repo },
          { uid: t.uid, ...result, repo: t.repo, generatedAt: new Date() }, // a new analysis invalidates the old tour
          { upsert: true, new: true, projection: { tour: 0 } },
        ))
        .finally(() => inflight.delete(key)));
    }
    res.json({ report: await inflight.get(key) });
  } catch (err) { fail(res, err); }
};

/** GET /api/codebase/:repo/tour[?refresh=1] – needs an existing report. */
const getTour = async (req, res) => {
  try {
    const t = await target(req, res);
    if (!t) return;
    const report = await CodebaseReport.findOne({ uid: t.uid, repo: t.repo });
    if (!report) return res.status(404).json({ error: 'Analyze the repository first.' });
    if (report.tour?.content && req.query.refresh !== '1') return res.json({ tour: report.tour });
    const tour = await generateTour(report.toObject());
    await CodebaseReport.updateOne({ _id: report._id }, { tour });
    res.json({ tour });
  } catch (err) { fail(res, err); }
};

module.exports = { getRepos, getReport, getTour };
