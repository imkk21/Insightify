const axios = require('axios');
const { compareVersions, SEVERITY_ORDER } = require('./securityService');

// Autopilot: turns findings into fixes. Pure helpers first (unit-tested), network after.

const rank = (s) => SEVERITY_ORDER.indexOf(s);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const dirOf = (path) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');
const isLock = (path) => path.endsWith('package-lock.json');
/** The file a plan patches: lockfiles are generated, so their sibling package.json is edited instead. */
const patchTarget = (path) => (isLock(path) ? path.replace(/package-lock\.json$/, 'package.json') : path);

// ── Versions ─────────────────────────────────────────────────────────────────

const majorMinor = (v) => String(v).replace(/^v/, '').split(/[.-]/).slice(0, 2).map((n) => parseInt(n, 10) || 0);
/** Breaking per semver: a major bump, or a minor bump while still on 0.x. */
const isMajorBump = (from, to) => {
  const [a, b] = majorMinor(from);
  const [c, d] = majorMinor(to);
  return c > a || (a === 0 && c === 0 && d > b);
};
const isMinorBump = (from, to) => majorMinor(to)[1] > majorMinor(from)[1];

// ── Plans ────────────────────────────────────────────────────────────────────

/** Fixable findings grouped per repo + manifest; one change per package (highest fix, lowest installed). */
const buildPlans = (findings = []) => {
  const groups = new Map();
  for (const f of findings) {
    if (!f.fixedIn) continue;
    const key = `${f.repo}|${f.path}`;
    if (!groups.has(key)) groups.set(key, { repo: f.repo, path: f.path, ecosystem: f.ecosystem, pkgs: new Map() });
    const pkgs = groups.get(key).pkgs;
    const prev = pkgs.get(f.package);
    if (!prev) {
      pkgs.set(f.package, { package: f.package, from: f.version, to: f.fixedIn, severity: f.severity, dev: !!f.dev, advisories: [...(f.advisories || [])] });
      continue;
    }
    if (compareVersions(f.version, prev.from) < 0) prev.from = f.version;
    if (compareVersions(f.fixedIn, prev.to) > 0) prev.to = f.fixedIn;
    if (rank(f.severity) < rank(prev.severity)) prev.severity = f.severity;
    prev.dev = prev.dev && !!f.dev;
    for (const a of f.advisories || []) if (!prev.advisories.some((x) => x.id === a.id)) prev.advisories.push(a);
  }
  return [...groups.values()].map(({ pkgs, ...g }) => {
    const changes = [...pkgs.values()]
      .map((c) => ({ ...c, majorBump: isMajorBump(c.from, c.to) }))
      .sort((a, b) => rank(a.severity) - rank(b.severity) || a.package.localeCompare(b.package));
    const risk = changes.some((c) => c.majorBump) ? 'high' : changes.some((c) => isMinorBump(c.from, c.to)) ? 'medium' : 'low';
    return { ...g, target: patchTarget(g.path), severity: changes[0].severity, risk, changes };
  }).sort((a, b) => rank(a.severity) - rank(b.severity) || b.changes.length - a.changes.length || a.repo.localeCompare(b.repo));
};

// ── Manifest patching: each returns { text, patched: [package names actually changed] } ─

const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'];
const SIMPLE_SPEC = /^(\^|~|>=|=)?v?(\d+(?:\.\d+){0,2}(?:-[\w.]+)?)$/;

/** Rewrites "pkg": "^1.2.3" → "^<to>" in place (keeps formatting and the ^/~ prefix). Ranges, tags and URLs are left alone. */
const patchPackageJson = (text, updates) => {
  const pkg = JSON.parse(text);
  let out = text;
  const patched = [];
  for (const [name, to] of Object.entries(updates)) {
    if (!DEP_FIELDS.some((f) => typeof pkg[f]?.[name] === 'string')) continue;
    let hit = false;
    out = out.replace(new RegExp(`("${escapeRe(name)}"\\s*:\\s*")([^"]*)"`, 'g'), (m, head, spec) => {
      const s = spec.trim().match(SIMPLE_SPEC);
      if (!s || compareVersions(s[2], to) >= 0) return m;
      hit = true;
      return `${head}${s[1] || ''}${to}"`;
    });
    if (hit) patched.push(name);
  }
  return { text: out, patched };
};

const normPy = (n) => n.toLowerCase().replace(/[-_.]+/g, '-');

/** name==1.0 / name>=1.0 / name~=1.0 lines: keeps the operator, extras and trailing comment. */
const patchRequirements = (text, updates) => {
  const wanted = new Map(Object.entries(updates).map(([n, v]) => [normPy(n), v]));
  const patched = new Set();
  const out = text.split('\n').map((line) => {
    const m = line.match(/^(\s*)([A-Za-z0-9._-]+)(\[[^\]]*\])?(\s*)(==|>=|~=)(\s*)([A-Za-z0-9.+!_-]+)([^\n]*)$/);
    const to = m && wanted.get(normPy(m[2]));
    if (!to || compareVersions(m[7], to) >= 0) return line;
    patched.add(m[2]);
    return `${m[1]}${m[2]}${m[3] || ''}${m[4]}${m[5]}${m[6]}${to}${m[8]}`;
  });
  return { text: out.join('\n'), patched: [...patched] };
};

/** `require mod vX` lines (single or block form); keeps `// indirect` comments. */
const patchGoMod = (text, updates) => {
  const patched = [];
  let inBlock = false;
  const out = text.split('\n').map((line) => {
    const code = line.replace(/\/\/.*/, '').trim();
    if (code.startsWith('require (')) { inBlock = true; return line; }
    if (inBlock && code === ')') { inBlock = false; return line; }
    if (!inBlock && !code.startsWith('require ')) return line;
    const m = line.match(/^(\s*(?:require\s+)?)(\S+)(\s+)v([^\s/]+?)(\+incompatible)?(\s.*|\r)?$/);
    const to = m && updates[m[2]];
    if (!to || compareVersions(m[4], to) >= 0) return line;
    patched.push(m[2]);
    return `${m[1]}${m[2]}${m[3]}v${to}${m[5] || ''}${m[6] || ''}`;
  });
  return { text: out.join('\n'), patched };
};

const patchManifest = (file, text, updates) =>
  (file.endsWith('package.json') ? patchPackageJson : file.endsWith('requirements.txt') ? patchRequirements : patchGoMod)(text, updates);

// ── Unified diff ─────────────────────────────────────────────────────────────

/**
 * ponytail: positional line diff. Every patcher above rewrites lines in place and never inserts or
 * deletes, so comparing line i with line i is exact. Needs a real LCS diff if a patcher ever adds lines.
 */
const unifiedDiff = (path, before, after, context = 3) => {
  if (before === after) return '';
  const split = (t) => { const l = t.split('\n'); if (l[l.length - 1] === '') l.pop(); return l; };
  const a = split(before);
  const b = split(after);
  if (a.length !== b.length) throw new Error('unifiedDiff: line count changed');
  const changed = a.flatMap((l, i) => (l !== b[i] ? [i] : []));
  const noEol = !before.endsWith('\n');
  const eolMark = (i) => (noEol && i === a.length - 1 ? ['\\ No newline at end of file'] : []);

  const hunks = [];
  for (const i of changed) {
    const last = hunks[hunks.length - 1];
    if (last && i - last.end <= context * 2) last.end = i;
    else hunks.push({ start: i, end: i });
  }
  const out = [`diff --git a/${path} b/${path}`, `--- a/${path}`, `+++ b/${path}`];
  for (const h of hunks) {
    const from = Math.max(0, h.start - context);
    const to = Math.min(a.length - 1, h.end + context);
    const len = to - from + 1;
    out.push(`@@ -${from + 1},${len} +${from + 1},${len} @@`);
    for (let i = from; i <= to; i++) {
      if (a[i] === b[i]) out.push(` ${a[i]}`, ...eolMark(i));
      else out.push(`-${a[i]}`, ...eolMark(i), `+${b[i]}`, ...eolMark(i));
    }
  }
  return `${out.join('\n')}\n`;
};

// ── Plan details: patch, commands, PR text ───────────────────────────────────

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const installCommands = (plan) => {
  const cd = dirOf(plan.target) ? `cd ${dirOf(plan.target)} && ` : '';
  const { changes } = plan;
  if (plan.ecosystem === 'PyPI') return [`${cd}pip install ${changes.map((c) => `"${c.package}==${c.to}"`).join(' ')}`];
  if (plan.ecosystem === 'Go') return [`${cd}go get ${changes.map((c) => `${c.package}@v${c.to}`).join(' ')}`, `${cd}go mod tidy`];
  const install = changes.filter((c) => c.direct);
  const update = changes.filter((c) => !c.direct);
  return [
    install.length && `${cd}npm install ${install.map((c) => `${c.package}@${c.to}`).join(' ')}`,
    update.length && `${cd}npm update ${update.map((c) => c.package).join(' ')}`,
  ].filter(Boolean);
};

const prTitle = (plan) => (plan.changes.length === 1
  ? `fix(deps): upgrade ${plan.changes[0].package} to ${plan.changes[0].to} (security)`
  : `fix(deps): upgrade ${plural(plan.changes.length, 'vulnerable package')} in ${plan.target}`);

const prBody = (plan) => {
  const rows = plan.changes.map((c) =>
    `| \`${c.package}\` | ${c.from} | **${c.to}** | ${c.severity} | ${c.majorBump ? 'Major: review changelog' : 'No'} |`);
  const advisories = plan.changes.flatMap((c) => c.advisories.map((a) =>
    `- [${a.aliases?.[0] || a.id}](${a.url}) **${c.package}** (${a.severity}): ${a.summary}`));
  const transitive = plan.changes.filter((c) => !c.direct);
  const majors = plan.changes.filter((c) => c.majorBump);
  return [
    `## Security upgrades for \`${plan.target}\``,
    '',
    `Upgrades ${plural(plan.changes.length, 'vulnerable dependency')} flagged by [OSV.dev](https://osv.dev) in \`${plan.repo}/${plan.path}\`. Overall risk: **${plan.risk}**.`,
    '',
    '| Package | From | To | Severity | Breaking? |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    '### Advisories fixed',
    ...advisories,
    '',
    '### Commands',
    '```sh',
    ...installCommands(plan),
    '```',
    ...(transitive.length ? ['', `Not edited here (transitive or already allowed by the declared range): ${transitive.map((c) => `\`${c.package}\``).join(', ')}. If \`npm update\` cannot reach the fixed version, add an \`overrides\` entry in package.json.`] : []),
    '',
    '### Testing checklist',
    ...(isLock(plan.path) ? ['- [ ] Run `npm install` and commit the refreshed package-lock.json'] : []),
    '- [ ] Test suite passes',
    '- [ ] App builds and starts',
    ...majors.map((c) => `- [ ] Review breaking changes in \`${c.package}\` ${c.from} → ${c.to} and exercise the code that uses it`),
    '',
    '_Prepared by Insightify Autopilot and opened after explicit approval._',
  ].join('\n');
};

/** Pure: plan + current manifest text (or null if unreadable) → patch, per-change flags, commands and PR text. */
const preparePlan = (plan, manifestText) => {
  const updates = Object.fromEntries(plan.changes.map((c) => [c.package, c.to]));
  let patched = [];
  let diff = '';
  let patchError = null;
  if (manifestText != null) {
    try {
      const res = patchManifest(plan.target, manifestText, updates);
      patched = res.patched;
      diff = unifiedDiff(plan.target, manifestText, res.text);
    } catch (err) { patchError = `Could not patch ${plan.target}: ${err.message}`; }
  } else patchError = `Could not read ${plan.target} from the default branch.`;

  const changes = plan.changes.map((c) => ({
    ...c,
    patched: patched.includes(c.package),
    // Only lockfile plans have packages that aren't declared directly
    direct: !isLock(plan.path) || patched.includes(c.package),
  }));
  const full = { ...plan, changes, patchable: patched.length > 0, patchError };
  return { ...full, diff, commands: installCommands(full), title: prTitle(full), body: prBody(full) };
};

const explainPrompt = (plan) => `You are a senior engineer reviewing a dependency security upgrade before it is merged.
Repository: ${plan.repo}, manifest: ${plan.path} (${plan.ecosystem}).
Upgrades:
${plan.changes.map((c) => `- ${c.package} ${c.from} -> ${c.to} (${c.severity}${c.majorBump ? ', MAJOR version bump' : ''}${c.dev ? ', dev dependency' : ''}); advisories: ${c.advisories.map((a) => `${a.aliases?.[0] || a.id}: ${a.summary}`).join('; ')}`).join('\n')}

Write Markdown with exactly these sections:
## What changes
## Likely breaking changes
## What to test
Use "- " bullets and **bold** package names. For major bumps, name the concrete API or behaviour changes you know of between those versions. Be specific and concise (under 250 words). No code blocks.`;

const explainFallback = (plan) => {
  const majors = plan.changes.filter((c) => c.majorBump);
  return [
    '## What changes',
    ...plan.changes.map((c) => `- **${c.package}** ${c.from} → ${c.to}: fixes ${plural(c.advisories.length, 'advisory')} (highest ${c.severity})${c.dev ? ', dev dependency only' : ''}.`),
    '## Likely breaking changes',
    ...(majors.length
      ? majors.map((c) => `- **${c.package}** crosses a major version (${c.from} → ${c.to}). Read its changelog or migration guide before merging.`)
      : ['- Every upgrade stays within its current major version, so breaking changes are unlikely.']),
    '## What to test',
    '- Install from a clean checkout, then run the full test suite and a production build.',
    ...majors.map((c) => `- Exercise every code path that imports **${c.package}**.`),
    ...(plan.changes.some((c) => c.dev) ? ['- Dev-only packages changed: check that build, lint and test tooling still run.'] : []),
  ].join('\n');
};

// ── Stack traces ─────────────────────────────────────────────────────────────

const EXTERNAL = /node_modules|site-packages|dist-packages|^node:|^internal\/|<anonymous>|^usr\/(lib|local)\/|go\/pkg\/mod|\.cargo\/registry|^vendor\/|\/lib\/python\d/;
const JVM_EXTERNAL = /^(java|javax|jdk|sun|kotlin|scala|org\.springframework|org\.apache)\./;

const normalizePath = (p) => p
  .replace(/\\/g, '/')
  .replace(/^[A-Za-z]:\//, '')
  .replace(/[?#].*$/, '')
  .replace(/^(\.{0,2}\/)+/, '');

/** Lines → [{ file, line, col?, fn?, external }], innermost frame first, deduped by file:line. */
const parseStackTrace = (trace = '') => {
  const frames = [];
  let python = false;
  for (const raw of String(trace).split('\n').slice(0, 500)) {
    const line = raw.replace(/(?:file|webpack(?:-internal)?):\/\/\/?/g, '/');
    let f = null;
    let m;
    if ((m = line.match(/File "([^"]+)", line (\d+)(?:, in (\S+))?/))) {
      python = true;
      f = { file: m[1], line: +m[2], fn: m[3] };
    } else if ((m = line.match(/at ([\w$.]+)\.([\w$<>]+)\(([\w$-]+\.(?:java|kt|scala|groovy)):(\d+)\)/))) {
      const pkg = m[1].split('.').slice(0, -1);
      f = { file: [...pkg, m[3]].join('/'), line: +m[4], fn: `${m[1]}.${m[2]}`, external: JVM_EXTERNAL.test(m[1]) };
    } else if ((m = line.match(/ in (.+?):line (\d+)/))) { // .NET
      f = { file: m[1], line: +m[2], fn: line.match(/at ([^\s(]+)/)?.[1] };
    } else if ((m = line.match(/([^\s(]+\.php)\((\d+)\)/))) {
      f = { file: m[1], line: +m[2] };
    } else if ((m = line.match(/((?:[A-Za-z]:)?[^\s()'"<>:]*[\w-]\.[A-Za-z]{1,6}):(\d+)(?::(\d+))?/))) { // JS/TS, Go, Ruby, Rust…
      const fn = line.match(/at (?:async )?([^\s(]+)(?: \[as [^\]]+\])? \(/)?.[1] || line.match(/in [`']([^'`]+)'/)?.[1];
      f = { file: m[1], line: +m[2], col: m[3] ? +m[3] : undefined, fn };
    }
    if (!f || !f.line) continue;
    const file = normalizePath(f.file);
    if (!file || frames.some((x) => x.file === file && x.line === f.line)) continue;
    frames.push({ ...f, file, external: !!f.external || EXTERNAL.test(file) });
  }
  return (python ? frames.reverse() : frames).slice(0, 40);
};

/** Best repo path for a trace path: same basename, longest matching directory suffix, then shortest path. */
const matchFile = (framePath, repoPaths) => {
  const segs = framePath.split('/').filter(Boolean);
  const base = segs[segs.length - 1];
  const bases = [base, ...(/\.[mc]?js$/.test(base) ? ['.ts', '.tsx'].map((e) => base.replace(/\.[mc]?js$/, e)) : [])];
  for (const name of bases) {
    let best = null;
    let bestScore = 0;
    for (const p of repoPaths) {
      const ps = p.split('/');
      if (ps[ps.length - 1] !== name) continue;
      let k = 1;
      while (k < ps.length && k < segs.length && ps[ps.length - 1 - k] === segs[segs.length - 1 - k]) k++;
      if (k > bestScore || (k === bestScore && p.length < best.length)) { best = p; bestScore = k; }
    }
    if (best) return best;
  }
  return null;
};

const incidentPrompt = (owner, repo, trace, implicated) => `You are a senior engineer triaging a production incident in the GitHub repository ${owner}/${repo}.

Error and stack trace:
\`\`\`
${trace.slice(0, 6000)}
\`\`\`

Implicated code on the default branch, with the commit that last changed each line:
${implicated.map((x) => `### ${x.path}:${x.line}${x.fn ? ` (${x.fn})` : ''}
Last changed by ${x.commit ? `commit ${x.commit.short} "${x.commit.message}" by ${x.commit.author} on ${x.commit.date?.slice(0, 10)}${x.commit.pr ? ` (PR #${x.commit.pr.number} "${x.commit.pr.title}")` : ''}` : 'unknown commit'}
\`\`\`
${x.context.map((l) => `${l.n === x.line ? '>>' : '  '} ${l.n}: ${l.text}`).join('\n')}
\`\`\``).join('\n\n') || '(No frames could be mapped to files in this repository.)'}

Respond in Markdown with exactly these sections:
## Likely root cause
## Suspicious commit
## Suggested fix
(include a unified diff in a \`\`\`diff code block against the files above)
## How to verify
Be concise and specific. If the evidence is insufficient, say exactly what to check next.`;

const incidentFallback = (owner, repo, trace, implicated) => {
  const errorLine = String(trace).split('\n').map((l) => l.trim()).find(Boolean) || 'unknown error';
  if (!implicated.length) {
    return `## Summary\n- No stack frames could be mapped to files in **${owner}/${repo}**. Check that you picked the right repository and that the trace includes file:line frames.\n- Error: ${errorLine.slice(0, 300)}`;
  }
  const newest = implicated.filter((x) => x.commit).sort((a, b) => String(b.commit.date).localeCompare(String(a.commit.date)))[0];
  return [
    '## Summary',
    `- The trace maps to ${plural(implicated.length, 'line')} in **${owner}/${repo}**. AI analysis is unavailable, so this is the raw evidence.`,
    `- Error: ${errorLine.slice(0, 300)}`,
    '## Implicated lines',
    ...implicated.map((x) => `- **${x.path}:${x.line}**${x.fn ? ` in ${x.fn}` : ''}: ${x.commit
      ? `last changed in [${x.commit.short}](${x.commit.url}) "${x.commit.message}" by ${x.commit.author}, ${x.commit.date?.slice(0, 10)}${x.commit.pr ? ` ([PR #${x.commit.pr.number}](${x.commit.pr.url}))` : ''}`
      : 'blame unavailable'}`),
    '## Where to start',
    `- The innermost frame, **${implicated[0].path}:${implicated[0].line}**, is where the error surfaced. Inspect it first.`,
    ...(newest ? [`- The most recently changed implicated line is in [${newest.commit.short}](${newest.commit.url}) (${newest.commit.date?.slice(0, 10)}), the likeliest regression.`] : []),
  ].join('\n');
};

// ── Chores ───────────────────────────────────────────────────────────────────

const DAY = 86400000;
const daysSince = (date, now) => Math.floor((now - new Date(date).getTime()) / DAY);

/** GraphQL repo nodes → stale branches (60d+), open PRs older than 14d, open issues with no comments. */
const computeChores = (repos = [], now = Date.now()) => {
  const staleBranches = [];
  const oldPrs = [];
  const unansweredIssues = [];
  for (const r of repos) {
    for (const b of r.refs?.nodes || []) {
      const date = b.target?.committedDate;
      if (!date || b.name === r.defaultBranchRef?.name) continue;
      const days = daysSince(date, now);
      if (days >= 60) staleBranches.push({ repo: r.name, name: b.name, days, date, url: `${r.url}/tree/${b.name.split('/').map(encodeURIComponent).join('/')}` });
    }
    for (const p of r.pullRequests?.nodes || []) {
      const days = daysSince(p.createdAt, now);
      if (days > 14) oldPrs.push({ repo: r.name, number: p.number, title: p.title, url: p.url, days, date: p.createdAt, draft: !!p.isDraft, author: p.author?.login || null });
    }
    for (const i of r.issues?.nodes || []) {
      if (i.comments?.totalCount === 0) unansweredIssues.push({ repo: r.name, number: i.number, title: i.title, url: i.url, days: daysSince(i.createdAt, now), date: i.createdAt, author: i.author?.login || null });
    }
  }
  const oldestFirst = (a, b) => b.days - a.days;
  return { staleBranches: staleBranches.sort(oldestFirst), oldPrs: oldPrs.sort(oldestFirst), unansweredIssues: unansweredIssues.sort(oldestFirst) };
};

// ── Network (server token, public data only) ─────────────────────────────────

const ghHeaders = () => ({ Authorization: `bearer ${process.env.GITHUB_TOKEN}` });

const gql = async (query, variables) => {
  const { data } = await axios.post('https://api.github.com/graphql', { query, variables }, { headers: ghHeaders(), timeout: 20000 });
  if (!data.data) throw new Error(data.errors?.[0]?.message || 'GitHub GraphQL error');
  return data.data;
};

const encPath = (path) => path.split('/').map(encodeURIComponent).join('/');

/** Raw file from the default branch, or null if missing/unreadable. */
const fetchRaw = async (owner, repo, path) => {
  try {
    const { data } = await axios.get(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${encPath(path)}`,
      { responseType: 'text', transformResponse: (x) => x, timeout: 15000, maxContentLength: 5e6 });
    return data;
  } catch { return null; }
};

const withManifest = async (owner, plan) => preparePlan(plan, await fetchRaw(owner, plan.repo, plan.target));

const CHORES_QUERY = `query($login: String!) {
  user(login: $login) {
    repositories(ownerAffiliations: OWNER, isFork: false, isArchived: false, first: 10, orderBy: {field: PUSHED_AT, direction: DESC}) {
      nodes {
        name url defaultBranchRef { name }
        refs(refPrefix: "refs/heads/", first: 50) { nodes { name target { ... on Commit { committedDate } } } }
        pullRequests(states: OPEN, first: 30, orderBy: {field: CREATED_AT, direction: ASC}) { nodes { number title url createdAt isDraft author { login } } }
        issues(states: OPEN, first: 30, orderBy: {field: CREATED_AT, direction: ASC}) { nodes { number title url createdAt author { login } comments { totalCount } } }
      }
    }
  }
}`;

const fetchChores = async (login) => {
  const data = await gql(CHORES_QUERY, { login });
  if (!data.user) throw Object.assign(new Error('GitHub user not found'), { status: 404 });
  const repos = data.user.repositories.nodes;
  return { repos: repos.map((r) => r.name), ...computeChores(repos) };
};

const BLAME_QUERY = `query($owner: String!, $name: String!, $path: String!) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef { target { ... on Commit { blame(path: $path) { ranges { startingLine endingLine commit {
      abbreviatedOid messageHeadline committedDate url author { name user { login } }
      associatedPullRequests(first: 1) { nodes { number title url } }
    } } } } } }
  }
}`;

const blameLine = async (owner, repo, path, line) => {
  try {
    const data = await gql(BLAME_QUERY, { owner, name: repo, path });
    const ranges = data.repository?.defaultBranchRef?.target?.blame?.ranges || [];
    const c = ranges.find((r) => r.startingLine <= line && line <= r.endingLine)?.commit;
    if (!c) return null;
    const pr = c.associatedPullRequests?.nodes?.[0];
    return {
      short: c.abbreviatedOid, message: c.messageHeadline, date: c.committedDate, url: c.url,
      author: c.author?.user?.login || c.author?.name || 'unknown', pr: pr ? { number: pr.number, title: pr.title, url: pr.url } : null,
    };
  } catch { return null; }
};

const repoTree = async (owner, repo) => {
  try {
    const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD`,
      { params: { recursive: 1 }, headers: ghHeaders(), timeout: 20000 });
    return data.tree.filter((t) => t.type === 'blob').map((t) => t.path);
  } catch (err) {
    if (err.response?.status === 404 || err.response?.status === 409) throw Object.assign(new Error(`Repository ${owner}/${repo} not found or empty.`), { status: 404 });
    throw err;
  }
};

const MAX_IMPLICATED = 5;

const analyzeIncident = async (owner, repo, trace, ask) => {
  const frames = parseStackTrace(trace);
  const paths = await repoTree(owner, repo);
  for (const f of frames) f.path = f.external ? null : matchFile(f.file, paths);

  const targets = [];
  for (const f of frames) {
    if (f.path && !targets.some((t) => t.path === f.path && t.line === f.line)) targets.push(f);
    if (targets.length === MAX_IMPLICATED) break;
  }
  const files = new Map(await Promise.all([...new Set(targets.map((t) => t.path))].map(async (p) => [p, await fetchRaw(owner, repo, p)])));
  const implicated = await Promise.all(targets.map(async (t) => {
    const lines = (files.get(t.path) || '').split('\n');
    const start = Math.max(1, t.line - 10);
    const end = Math.min(lines.length, t.line + 10);
    return {
      path: t.path, line: t.line, fn: t.fn || null,
      url: `https://github.com/${owner}/${repo}/blob/HEAD/${encPath(t.path)}#L${t.line}`,
      context: lines.length > 1 ? Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => ({ n: start + i, text: lines[start + i - 1].replace(/\r$/, '').slice(0, 300) })) : [],
      commit: await blameLine(owner, repo, t.path, t.line),
    };
  }));
  const ai = await ask(incidentPrompt(owner, repo, trace, implicated), incidentFallback(owner, repo, trace, implicated));
  return { repo, frames, implicated, analysis: ai.content, model: ai.model };
};

module.exports = {
  // pure
  isMajorBump, buildPlans, patchPackageJson, patchRequirements, patchGoMod, patchManifest, unifiedDiff,
  preparePlan, installCommands, explainPrompt, explainFallback, parseStackTrace, matchFile, computeChores,
  incidentFallback, patchTarget,
  // network
  fetchRaw, withManifest, fetchChores, analyzeIncident,
};
