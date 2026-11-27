const axios = require('axios');

const MANIFESTS = ['package-lock.json', 'package.json', 'requirements.txt', 'go.mod'];
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', 'build', '.github', '.git', 'docs', 'test', 'tests']);
const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN'];

// ── Parsers: manifest text → [{ name, version, ecosystem, dev?, approximate? }] ─

const parsePackageLock = (text) => {
  const lock = JSON.parse(text);
  if (lock.packages) { // lockfile v2/v3
    return Object.entries(lock.packages)
      .filter(([path, p]) => path && p.version && !p.link)
      .map(([path, p]) => ({ name: path.slice(path.lastIndexOf('node_modules/') + 13), version: p.version, ecosystem: 'npm', dev: !!p.dev }));
  }
  const out = []; // lockfile v1: nested `dependencies`
  const walk = (deps = {}) => Object.entries(deps).forEach(([name, d]) => {
    if (d.version) out.push({ name, version: d.version, ecosystem: 'npm', dev: !!d.dev });
    walk(d.dependencies);
  });
  walk(lock.dependencies);
  return out;
};

/** No lockfile: use the lowest version each range allows. Approximate, so flagged as such. */
const parsePackageJson = (text) => {
  const pkg = JSON.parse(text);
  const out = [];
  for (const [deps, dev] of [[pkg.dependencies, false], [pkg.devDependencies, true]]) {
    for (const [name, range] of Object.entries(deps || {})) {
      const version = String(range).match(/\d+\.\d+\.\d+/)?.[0];
      if (version) out.push({ name, version, ecosystem: 'npm', dev, approximate: true });
    }
  }
  return out;
};

/** `==` pins are exact; `>=` / `~=` use the minimum allowed version and are flagged approximate. */
const parseRequirements = (text) =>
  text.split('\n')
    .map((l) => l.replace(/#.*/, '').trim().match(/^([A-Za-z0-9._-]+)(?:\[[^\]]*\])?\s*(==|>=|~=)\s*([A-Za-z0-9.+!_-]+)/))
    .filter(Boolean)
    .map(([, name, op, version]) => ({ name: name.toLowerCase(), version, ecosystem: 'PyPI', ...(op !== '==' && { approximate: true }) }));

const parseGoMod = (text) => {
  const out = [];
  let inBlock = false;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\/\/.*/, '').trim();
    if (line.startsWith('require (')) { inBlock = true; continue; }
    if (inBlock && line === ')') { inBlock = false; continue; }
    const spec = inBlock ? line : line.startsWith('require ') ? line.slice(8).trim() : null;
    const m = spec?.match(/^(\S+)\s+v(\d\S*)/);
    if (m) out.push({ name: m[1], version: m[2].replace(/\+incompatible$/, ''), ecosystem: 'Go' });
  }
  return out;
};

const PARSERS = { 'package-lock.json': parsePackageLock, 'package.json': parsePackageJson, 'requirements.txt': parseRequirements, 'go.mod': parseGoMod };

// ── Versions & advisories ────────────────────────────────────────────────────

/** Numeric dotted compare; pre-release suffixes sort before the release. ponytail: not full semver, good enough to pick a fix version. */
const compareVersions = (a, b) => {
  const parse = (v) => String(v).split('-');
  const [ma, pa] = parse(a);
  const [mb, pb] = parse(b);
  const na = ma.split('.').map(Number);
  const nb = mb.split('.').map(Number);
  for (let i = 0; i < Math.max(na.length, nb.length); i++) {
    const d = (na[i] || 0) - (nb[i] || 0);
    if (d) return Math.sign(d);
  }
  if (pa && !pb) return -1;
  if (!pa && pb) return 1;
  return 0;
};

/** Lowest "fixed" version above the installed one for this package, or null if no fix exists. */
const pickFix = (vuln, dep) => {
  const fixes = (vuln.affected || [])
    .filter((a) => a.package?.name?.toLowerCase() === dep.name.toLowerCase())
    .flatMap((a) => (a.ranges || []).flatMap((r) => r.events || []))
    .map((e) => e.fixed)
    .filter((f) => f && compareVersions(f, dep.version) > 0)
    .sort(compareVersions);
  return fixes[0] || null;
};

const severityOf = (vuln) => {
  const s = String(vuln.database_specific?.severity || '').toUpperCase();
  return s === 'MEDIUM' ? 'MODERATE' : SEVERITY_ORDER.includes(s) ? s : 'UNKNOWN';
};

/**
 * One finding per repo/manifest/package@version (like Dependabot), with its advisories nested.
 * fixedIn = the version that clears every fixable advisory; unfixable = some advisory has no fix yet.
 */
const groupFindings = (alerts) => {
  const groups = new Map();
  for (const a of alerts) {
    const key = `${a.repo}|${a.path}|${a.package}|${a.version}`;
    if (!groups.has(key)) {
      const { id, aliases, summary, severity, fixedIn, url, ...dep } = a;
      groups.set(key, { ...dep, advisories: [] });
    }
    groups.get(key).advisories.push({ id: a.id, aliases: a.aliases, summary: a.summary, severity: a.severity, fixedIn: a.fixedIn, url: a.url });
  }
  return [...groups.values()].map((g) => {
    g.advisories.sort((x, y) => SEVERITY_ORDER.indexOf(x.severity) - SEVERITY_ORDER.indexOf(y.severity));
    const fixes = g.advisories.map((x) => x.fixedIn).filter(Boolean).sort(compareVersions);
    return { ...g, severity: g.advisories[0].severity, fixedIn: fixes[fixes.length - 1] || null, unfixable: g.advisories.some((x) => !x.fixedIn) };
  }).sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || a.repo.localeCompare(b.repo) || a.package.localeCompare(b.package));
};

/** OSV often returns the same issue twice (GHSA + PYSEC/GO ids). Keep one per alias group, preferring GHSA (it has severity). */
const dedupeVulns = (vulns) => {
  const kept = [];
  const seen = new Set();
  for (const v of [...vulns].sort((a, b) => (b.id.startsWith('GHSA') ? 1 : 0) - (a.id.startsWith('GHSA') ? 1 : 0))) {
    const ids = [v.id, ...(v.aliases || [])];
    if (ids.some((id) => seen.has(id))) continue;
    ids.forEach((id) => seen.add(id));
    kept.push(v);
  }
  return kept;
};

// ── Network ──────────────────────────────────────────────────────────────────

const mapLimit = async (items, limit, fn) => {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
};

const TREE_QUERY = `query($login: String!) {
  user(login: $login) {
    repositories(ownerAffiliations: OWNER, isFork: false, isArchived: false, first: 15, orderBy: {field: PUSHED_AT, direction: DESC}) {
      nodes { name url object(expression: "HEAD:") { ... on Tree { entries { name type object { ... on Tree { entries { name type } } } } } } }
    }
  }
}`;

/** Manifest paths per repo: root + one directory level. A lockfile makes the sibling package.json redundant. */
const findManifests = (entries = []) => {
  const pick = (names, dir) => {
    const files = names.filter((n) => MANIFESTS.includes(n));
    return files.filter((f) => !(f === 'package.json' && files.includes('package-lock.json'))).map((f) => (dir ? `${dir}/${f}` : f));
  };
  const root = pick(entries.filter((e) => e.type === 'blob').map((e) => e.name));
  const nested = entries
    .filter((e) => e.type === 'tree' && !SKIP_DIRS.has(e.name) && !e.name.startsWith('.'))
    .flatMap((e) => pick((e.object?.entries || []).filter((x) => x.type === 'blob').map((x) => x.name), e.name));
  return [...root, ...nested];
};

const scanUser = async (login) => {
  const { data } = await axios.post('https://api.github.com/graphql',
    { query: TREE_QUERY, variables: { login } },
    { headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}` } });
  if (!data.data?.user) throw Object.assign(new Error('GitHub user not found'), { status: 404 });

  const repos = data.data.user.repositories.nodes.map((r) => ({ name: r.name, url: r.url, manifests: findManifests(r.object?.entries) }));

  // Download and parse every manifest (public raw URLs: no API quota, no size cap)
  const files = repos.flatMap((r) => r.manifests.map((path) => ({ repo: r.name, path })));
  const parsed = await mapLimit(files, 8, async (f) => {
    try {
      const { data: text } = await axios.get(`https://raw.githubusercontent.com/${login}/${f.repo}/HEAD/${f.path}`,
        { responseType: 'text', transformResponse: (x) => x, timeout: 15000, maxContentLength: 20e6 });
      return { ...f, deps: PARSERS[f.path.split('/').pop()](text) };
    } catch (err) {
      return { ...f, deps: [], error: err.message };
    }
  });

  // One OSV lookup per unique package@version (batches of 1000)
  const unique = new Map();
  for (const f of parsed) for (const d of f.deps) unique.set(`${d.ecosystem}|${d.name}|${d.version}`, d);
  const keys = [...unique.keys()];
  const hits = new Map(); // key → [vulnId]
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    const { data: res } = await axios.post('https://api.osv.dev/v1/querybatch', {
      queries: chunk.map((k) => { const d = unique.get(k); return { package: { name: d.name, ecosystem: d.ecosystem }, version: d.version }; }),
    }, { timeout: 30000 });
    res.results.forEach((r, j) => r.vulns?.length && hits.set(chunk[j], r.vulns.map((v) => v.id)));
  }

  const ids = [...new Set([...hits.values()].flat())];
  const details = new Map((await mapLimit(ids, 8, async (id) => {
    try { return [id, (await axios.get(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`, { timeout: 15000 })).data]; }
    catch { return [id, null]; }
  })).filter(([, v]) => v && !v.withdrawn));

  const alerts = [];
  for (const f of parsed) {
    const seen = new Set();
    for (const d of f.deps) {
      const key = `${d.ecosystem}|${d.name}|${d.version}`;
      if (seen.has(key) || !hits.has(key)) continue;
      seen.add(key);
      for (const v of dedupeVulns(hits.get(key).map((id) => details.get(id)).filter(Boolean))) {
        alerts.push({
          repo: f.repo, path: f.path, ecosystem: d.ecosystem, package: d.name, version: d.version,
          dev: !!d.dev, approximate: !!d.approximate,
          id: v.id, aliases: (v.aliases || []).sort((a, b) => (b.startsWith('CVE') ? 1 : 0) - (a.startsWith('CVE') ? 1 : 0)),
          summary: v.summary || v.details?.split('\n')[0]?.slice(0, 200) || v.id,
          severity: severityOf(v), fixedIn: pickFix(v, d), url: `https://osv.dev/vulnerability/${v.id}`,
        });
      }
    }
  }
  const findings = groupFindings(alerts);
  const bySeverity = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, findings.filter((f) => f.severity === s).length]));
  return {
    username: login,
    scannedAt: new Date(),
    repos: repos.map((r) => {
      const fs = parsed.filter((f) => f.repo === r.name);
      return {
        name: r.name, url: r.url,
        manifests: fs.map((f) => ({ path: f.path, deps: f.deps.length, error: f.error || null })),
        findings: findings.filter((f) => f.repo === r.name).length,
      };
    }),
    findings,
    totals: {
      repos: repos.length, scannedRepos: repos.filter((r) => r.manifests.length).length,
      dependencies: unique.size, findings: findings.length, advisories: alerts.length, bySeverity,
    },
  };
};

module.exports = {
  scanUser, parsePackageLock, parsePackageJson, parseRequirements, parseGoMod,
  compareVersions, pickFix, severityOf, dedupeVulns, findManifests, groupFindings, SEVERITY_ORDER,
};
