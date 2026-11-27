const crypto = require('crypto');
const SecurityScan = require('../models/SecurityScan');
const User = require('../models/User');
const AutopilotAction = require('../models/AutopilotAction');
const { askGemini } = require('../services/insightService');
const ap = require('../services/autopilotService');
const githubApp = require('../services/githubApp');

const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;
const MAX_TRACE = 20000;

const fail = (res, err, label) => {
  const detail = err.response?.data?.message;
  const status = err.status || (err.response?.status === 403 ? 429 : 502);
  if (!err.status) console.error(`autopilot ${label}:`, err.message);
  res.status(status).json({ error: err.status ? err.message : `${label} failed: ${err.message}${detail ? ` (${detail})` : ''}` });
};

const keyOf = (plan) => crypto.createHash('sha1').update(plan.changes.map((c) => `${c.package}@${c.from}>${c.to}`).join(',')).digest('hex');

const loadScan = (uid) => SecurityScan.findOne({ uid }, { username: 1, scannedAt: 1, findings: 1 }).lean();

/** One prepared plan (current manifest fetched) for repo + scanned manifest path, or an error status. */
const loadPlan = async (uid, repo, path) => {
  if (!REPO_RE.test(repo || '') || typeof path !== 'string' || path.length > 300) throw Object.assign(new Error('Invalid repo or path.'), { status: 400 });
  const scan = await loadScan(uid);
  const plan = scan && ap.buildPlans(scan.findings).find((p) => p.repo === repo && p.path === path);
  if (!plan) throw Object.assign(new Error('No fix plan for that manifest. Run a security scan first.'), { status: 404 });
  return { owner: scan.username, plan: await ap.withManifest(scan.username, plan) };
};

/** GET /api/autopilot/status */
const getStatus = (_req, res) => res.json({ appConfigured: githubApp.isConfigured(), setup: githubApp.SETUP_STEPS });

/** GET /api/autopilot/plans */
const getPlans = async (req, res) => {
  try {
    const uid = req.user.uid;
    const scan = await loadScan(uid);
    if (!scan) return res.json({ scannedAt: null, plans: [] });
    // ponytail: refetches every manifest per request (raw.githubusercontent, no API quota); cache if it gets slow
    const plans = await Promise.all(ap.buildPlans(scan.findings).map((p) => ap.withManifest(scan.username, p)));
    const actions = await AutopilotAction.find({ uid, type: { $in: ['explain', 'fix-pr'] }, status: 'ok' }).sort({ createdAt: -1 }).limit(200).lean();
    res.json({
      scannedAt: scan.scannedAt,
      owner: scan.username,
      plans: plans.map((p) => {
        const key = keyOf(p);
        const mine = (type) => actions.find((a) => a.type === type && a.repo === p.repo && a.path === p.path && a.key === key);
        return { ...p, explanation: mine('explain')?.result || null, pr: mine('fix-pr')?.result || null };
      }),
    });
  } catch (err) { fail(res, err, 'Loading plans'); }
};

/** GET /api/autopilot/plans/:repo/patch?path= — unified diff download */
const getPatch = async (req, res) => {
  try {
    const { plan } = await loadPlan(req.user.uid, req.params.repo, req.query.path);
    if (!plan.diff) return res.status(404).json({ error: plan.patchError || 'Nothing in this manifest can be patched automatically.' });
    res.set('Content-Type', 'text/x-diff; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${`${plan.repo}-${plan.target}`.replace(/[^A-Za-z0-9._-]/g, '-')}.patch"`);
    res.send(plan.diff);
  } catch (err) { fail(res, err, 'Building patch'); }
};

/** POST /api/autopilot/plans/explain { repo, path } */
const explainPlan = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { repo, path } = req.body || {};
    const { plan } = await loadPlan(uid, repo, path);
    const key = keyOf(plan);
    const cached = await AutopilotAction.findOne({ uid, type: 'explain', repo, path, key }).lean();
    if (cached) return res.json({ explanation: cached.result, cached: true });
    const ai = await askGemini(ap.explainPrompt(plan), ap.explainFallback(plan));
    const explanation = { content: ai.content, model: ai.model };
    // Only cache real AI output so a missing key / outage doesn't pin the template
    if (ai.model !== 'fallback-template') await AutopilotAction.create({ uid, type: 'explain', repo, path, key, result: explanation });
    res.json({ explanation });
  } catch (err) { fail(res, err, 'Explaining plan'); }
};

/** POST /api/autopilot/pr { repo, path } — the user's explicit approval to open a fix PR */
const openPr = async (req, res) => {
  if (!githubApp.isConfigured()) {
    return res.status(501).json({ error: 'Opening PRs needs the Insightify GitHub App, which is not configured on this server.', setup: githubApp.SETUP_STEPS });
  }
  const uid = req.user.uid;
  // The connected GitHub username is self-entered. Writing to repos requires proof the user owns that
  // account (set only by GitHub OAuth sign-in), otherwise anyone could open PRs on someone else's repos.
  const me = await User.findOne({ uid }, { githubVerified: 1 }).lean();
  if (!me?.githubVerified) {
    return res.status(403).json({ error: 'Opening PRs requires signing in with GitHub to verify you own this account. Use the patch or install commands for now.' });
  }
  const { repo, path } = req.body || {};
  let owner;
  let plan;
  try {
    ({ owner, plan } = await loadPlan(uid, repo, path));
  } catch (err) { return fail(res, err, 'Loading plan'); }
  if (!plan.patchable) return res.status(422).json({ error: plan.patchError || 'Nothing in this manifest can be patched automatically. Use the install commands instead.' });

  const key = keyOf(plan);
  const recent = await AutopilotAction.findOne({ uid, type: 'fix-pr', repo, path, key, status: 'ok', createdAt: { $gt: new Date(Date.now() - 86400000) } }).lean();
  if (recent) return res.json({ pr: recent.result, existing: true });

  const updates = Object.fromEntries(plan.changes.filter((c) => c.patched).map((c) => [c.package, c.to]));
  const slug = plan.changes.find((c) => c.patched).package.toLowerCase().replace(/[^a-z0-9.-]+/g, '-').replace(/^-+|-+$/g, '');
  const branch = `insightify/fix-${slug}-${Date.now()}`;
  const payload = { branch, target: plan.target, changes: plan.changes.map(({ package: p, from, to, patched }) => ({ package: p, from, to, patched })) };
  // ponytail: owner is the user's (unverified) connected GitHub login; the App's installation is the real gate
  try {
    const pr = await githubApp.openFixPr({
      owner, repo, path: plan.target, branch, title: plan.title, body: plan.body, message: plan.title,
      transform: (text) => ap.patchManifest(plan.target, text, updates).text,
    });
    await AutopilotAction.create({ uid, type: 'fix-pr', repo, path, key, status: 'ok', payload, result: pr });
    res.json({ pr });
  } catch (err) {
    const message = err.status ? err.message : `${err.message}${err.response?.data?.message ? ` (${err.response.data.message})` : ''}`;
    await AutopilotAction.create({ uid, type: 'fix-pr', repo, path, key, status: 'failed', payload, result: { error: message } }).catch(() => {});
    fail(res, err, 'Opening PR');
  }
};

/** POST /api/autopilot/incident { repo, trace } */
const incident = async (req, res) => {
  const uid = req.user.uid;
  const { repo, trace } = req.body || {};
  if (!REPO_RE.test(repo || '')) return res.status(400).json({ error: 'Pick one of your repositories.' });
  if (typeof trace !== 'string' || !trace.trim() || trace.length > MAX_TRACE) return res.status(400).json({ error: `Paste an error or stack trace (up to ${MAX_TRACE / 1000}k characters).` });
  try {
    const user = await User.findOne({ uid }, { githubUsername: 1 }).lean();
    if (!user?.githubUsername) return res.status(400).json({ error: 'Connect GitHub first.' });
    const last = await AutopilotAction.findOne({ uid, type: 'incident' }, { createdAt: 1 }).sort({ createdAt: -1 }).lean();
    if (last && Date.now() - last.createdAt.getTime() < 10000) return res.status(429).json({ error: 'One analysis every 10 seconds, please.' });

    const result = await ap.analyzeIncident(user.githubUsername, repo, trace, askGemini);
    const headline = trace.split('\n').map((l) => l.trim()).find(Boolean).slice(0, 200);
    await AutopilotAction.create({
      uid, type: 'incident', repo, status: 'ok', payload: { trace: trace.slice(0, 4000) },
      result: { headline, files: result.implicated.map((x) => `${x.path}:${x.line}`), analysis: result.analysis, model: result.model },
    });
    res.json({ ...result, owner: user.githubUsername });
  } catch (err) { fail(res, err, 'Incident analysis'); }
};

/** GET /api/autopilot/chores */
const getChores = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid }, { githubUsername: 1 }).lean();
    if (!user?.githubUsername) return res.status(400).json({ error: 'Connect GitHub first.' });
    res.json({ ...(await ap.fetchChores(user.githubUsername)), appConfigured: githubApp.isConfigured() });
  } catch (err) { fail(res, err, 'Loading chores'); }
};

/** GET /api/autopilot/history */
const getHistory = async (req, res) => {
  try {
    const actions = await AutopilotAction.find({ uid: req.user.uid })
      .select('-payload -result.analysis -result.content -key')
      .sort({ createdAt: -1 }).limit(50).lean();
    res.json({ actions });
  } catch (err) { fail(res, err, 'Loading history'); }
};

module.exports = { getStatus, getPlans, getPatch, explainPlan, openPr, incident, getChores, getHistory };
