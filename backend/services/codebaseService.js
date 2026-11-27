const axios = require('axios');
const { askGemini } = require('./insightService');

const MAX_COMMITS = 200;
const CONCURRENCY = 8;
const COMPLEXITY_FILES = 30;
const HOTSPOTS = 15;
const BIG_COMMIT = 50; // mass renames/reformat commits would swamp change coupling

// ── Pure helpers (unit-tested in codebaseService.test.js) ─────────────────────

const LOCKFILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'npm-shrinkwrap.json',
  'composer.lock', 'gemfile.lock', 'poetry.lock', 'pipfile.lock', 'cargo.lock', 'go.sum', 'pubspec.lock', 'podfile.lock']);
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'build', 'vendor', 'out', 'coverage', '.next', '.nuxt', 'target', '__pycache__', 'bower_components']);
const BINARY_EXT = /\.(png|jpe?g|gif|svg|ico|webp|bmp|avif|tiff?|pdf|woff2?|ttf|otf|eot|mp[34]|wav|ogg|webm|mov|zip|gz|tar|rar|7z|jar|exe|dll|so|dylib|bin|map|lottie)$/i;
const CODE_EXT = /\.(jsx?|tsx?|mjs|cjs|vue|svelte|py|go|rb|java|kt|kts|scala|swift|m|mm|c|cc|cpp|cxx|h|hpp|cs|fs|php|rs|dart|ex|exs|erl|clj|lua|r|jl|sh|ps1|sql|sol)$/i;

/** Noise that tells you nothing about the design: lockfiles, generated/vendored code, binaries. */
const isIgnored = (path) => {
  const parts = path.split('/');
  const base = parts[parts.length - 1].toLowerCase();
  return LOCKFILES.has(base)
    || /\.min\.(js|css)$|\.bundle\.js$|\.chunk\.js$/.test(base)
    || BINARY_EXT.test(base)
    || parts.slice(0, -1).some((d) => IGNORED_DIRS.has(d.toLowerCase()));
};

const isCode = (path) => CODE_EXT.test(path);

/**
 * Commits arrive newest-first; rewrite older paths to the file's current name so a
 * renamed file keeps its history. commits: [{ files: [{ path, previousPath? }] }]
 */
const resolveRenames = (commits) => {
  const renamed = new Map(); // old path → current path
  return commits.map((c) => {
    const files = c.files.map((f) => {
      const path = renamed.get(f.path) || f.path;
      if (f.previousPath) renamed.set(f.previousPath, path);
      return { ...f, path };
    });
    return { ...c, files };
  });
};

/**
 * commits: [{ sha, author, date, files: [{ path, additions, deletions }] }] →
 * { [path]: { commits, added, deleted, authors: { [author]: lines }, lastModified } }
 * Author share is by lines changed (a 1-line commit still counts as 1).
 */
const aggregateChurn = (commits) => {
  const files = {};
  for (const c of commits) {
    for (const f of c.files) {
      if (isIgnored(f.path)) continue;
      const s = files[f.path] ||= { commits: 0, added: 0, deleted: 0, authors: {}, lastModified: null };
      s.commits++;
      s.added += f.additions || 0;
      s.deleted += f.deletions || 0;
      s.authors[c.author] = (s.authors[c.author] || 0) + Math.max(1, (f.additions || 0) + (f.deletions || 0));
      if (!s.lastModified || c.date > s.lastModified) s.lastModified = c.date;
    }
  }
  return files;
};

/** { name: lines } → [{ name, share }] sorted by share desc; shares sum to 1. */
const shares = (authors) => {
  const total = Object.values(authors).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(authors)
    .sort((a, b) => b[1] - a[1])
    .map(([name, lines]) => ({ name, share: lines / total }));
};

/** Lines of code and a branch count. ponytail: regex proxy, not a parser; keywords in strings count too. */
const measureComplexity = (source) => {
  const lines = source.split('\n').filter((l) => {
    const t = l.trim();
    return t && !/^(\/\/|\/\*|\*|#(?!include|define|if)|--)/.test(t);
  });
  const code = lines.join('\n');
  const branches = (code.match(/\b(if|elif|else|for|foreach|while|case|catch|except)\b|&&|\|\||\s\?\s/g) || []).length;
  return { loc: lines.length, complexity: branches };
};

/**
 * files: [{ path, commits, loc, complexity }] → top `limit` by normalized churn × normalized complexity.
 * Returns score 0–100 plus a human reason.
 */
const scoreHotspots = (files, totalCommits, limit = HOTSPOTS) => {
  const maxChurn = Math.max(1, ...files.map((f) => f.commits));
  const maxCx = Math.max(1, ...files.map((f) => f.complexity));
  return files
    .map((f) => ({ ...f, score: Math.round((f.commits / maxChurn) * (f.complexity / maxCx) * 100) }))
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score || b.commits - a.commits)
    .slice(0, limit)
    .map((f) => ({ ...f, reason: `changed in ${f.commits} of ${totalCommits} commits, ${f.loc} lines, complexity ${f.complexity}` }));
};

/** Smallest number of authors who together made ≥50% of all changes. */
const busFactor = (authorTotals) => {
  const sorted = Object.values(authorTotals).sort((a, b) => b - a);
  const total = sorted.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  let sum = 0;
  for (let i = 0; i < sorted.length; i++) {
    sum += sorted[i];
    if (sum >= total / 2) return i + 1;
  }
  return sorted.length;
};

const SILO = 0.8;

/** Author share per top-level directory (root files grouped as "/"); flags knowledge silos. */
const knowledgeMap = (churn) => {
  const dirs = {};
  for (const [path, s] of Object.entries(churn)) {
    const dir = path.includes('/') ? path.split('/')[0] : '/';
    const d = dirs[dir] ||= { dir, files: 0, commits: 0, authors: {} };
    d.files++;
    d.commits += s.commits;
    for (const [a, n] of Object.entries(s.authors)) d.authors[a] = (d.authors[a] || 0) + n;
  }
  return Object.values(dirs)
    .map(({ authors, ...d }) => {
      const list = shares(authors);
      return { ...d, lines: Object.values(authors).reduce((a, b) => a + b, 0), authors: list, owner: list[0]?.name, ownerShare: list[0]?.share || 0, silo: (list[0]?.share || 0) >= SILO };
    })
    .sort((a, b) => b.lines - a.lines);
};

/**
 * Files that keep changing together: ≥minShared shared commits and each file's
 * shared/own commits ≥ minRatio. Skips commits touching more than BIG_COMMIT files.
 */
const changeCoupling = (commits, { minShared = 5, minRatio = 0.5, limit = 20 } = {}) => {
  const own = {};
  const pairs = {};
  for (const c of commits) {
    const paths = [...new Set(c.files.map((f) => f.path).filter((p) => !isIgnored(p)))].sort();
    if (paths.length > BIG_COMMIT) continue;
    for (const p of paths) own[p] = (own[p] || 0) + 1;
    // ponytail: O(n²) per commit, bounded by BIG_COMMIT
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const k = `${paths[i]}\n${paths[j]}`;
        pairs[k] = (pairs[k] || 0) + 1;
      }
    }
  }
  return Object.entries(pairs)
    .filter(([k, n]) => {
      const [a, b] = k.split('\n');
      return n >= minShared && n / own[a] >= minRatio && n / own[b] >= minRatio;
    })
    .map(([k, shared]) => {
      const [a, b] = k.split('\n');
      return { a, b, shared, degree: Math.round((shared / Math.max(own[a], own[b])) * 100) };
    })
    .sort((x, y) => y.shared - x.shared || y.degree - x.degree)
    .slice(0, limit);
};

/** Git tree → two-level outline: [{ path, type: 'dir', files }] and [{ path, type: 'file' }]. */
const outline = (tree) => {
  const out = {};
  for (const t of tree) {
    if (t.type !== 'blob' || isIgnored(t.path)) continue;
    const parts = t.path.split('/');
    if (parts.length <= 2) out[t.path] = { path: t.path, type: 'file' };
    for (let depth = 1; depth <= Math.min(2, parts.length - 1); depth++) {
      const dir = parts.slice(0, depth).join('/');
      (out[dir] ||= { path: dir, type: 'dir', files: 0 }).files++;
    }
  }
  return Object.values(out).sort((a, b) => a.path.localeCompare(b.path));
};

const FRAMEWORKS = ['react', 'next', 'vue', 'nuxt', 'svelte', '@angular/core', 'express', 'fastify', 'koa', '@nestjs/core', 'mongoose', 'prisma',
  'sequelize', 'typeorm', 'tailwindcss', 'vite', 'webpack', 'firebase', 'firebase-admin', 'socket.io', 'graphql', 'electron', 'react-native', 'jest', 'vitest',
  'django', 'flask', 'fastapi', 'sqlalchemy', 'pandas', 'numpy', 'torch', 'tensorflow', 'gin', 'echo', 'fiber', 'gorm'];

/** manifests: [{ path, text }] → notable dependency names (frameworks first). */
const detectStack = (manifests) => {
  const deps = new Set();
  for (const { path, text } of manifests) {
    try {
      if (path.endsWith('package.json')) {
        const pkg = JSON.parse(text);
        Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).forEach((d) => deps.add(d));
      } else if (path.endsWith('requirements.txt')) {
        text.split('\n').map((l) => l.match(/^\s*([A-Za-z0-9._-]+)/)?.[1]?.toLowerCase()).filter(Boolean).forEach((d) => deps.add(d));
      } else if (path.endsWith('go.mod')) {
        for (const m of text.matchAll(/^\s*(?:require\s+)?([\w.-]+\.\w+\/[\w./-]+)\s+v/gm)) deps.add(m[1].split('/').pop());
      }
    } catch { /* malformed manifest: skip */ }
  }
  return FRAMEWORKS.filter((f) => deps.has(f));
};

/** First prose paragraphs of a README, without badges, HTML or headings. */
const readmeIntro = (readme, max = 2) =>
  (readme || '').replace(/<[^>]+>/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[\s*\]\([^)]*\)/g, '')
    .split(/\n\s*\n/).map((p) => p.trim())
    .filter((p) => p && !p.startsWith('#') && !p.startsWith('|') && !p.startsWith('```') && /[a-z]{3}/i.test(p))
    .slice(0, max)
    .map((p) => p.replace(/\s*\n\s*/g, ' '));

/** Deterministic tour used when Gemini is unavailable. */
const fallbackTour = ({ repo, description, language, readme, stack, structure, hotspots, silos }) => {
  const intro = readmeIntro(readme);
  const dirs = structure.filter((s) => s.type === 'dir' && !s.path.includes('/')).sort((a, b) => b.files - a.files).slice(0, 6);
  const entry = structure.find((s) => s.type === 'file' && /(^|\/)(index|main|app|server)\.(js|ts|mjs|py|go|rb|rs|java)$/i.test(s.path));
  return [
    `## What ${repo} does`,
    intro[0] || description || `${repo} is a ${language || 'software'} project.`,
    ...intro.slice(1),
    '## Architecture',
    stack.length ? `Built with ${stack.map((s) => `**${s}**`).join(', ')}.` : `Primary language: ${language || 'unknown'}.`,
    ...dirs.map((d) => `- **${d.path}/**: ${d.files} files`),
    '## Where to start',
    entry ? `- Open **${entry.path}**, the likely entry point.` : '- Start with the README, then the largest top-level directory.',
    ...(hotspots[0] ? [`- Read **${hotspots[0].path}** next: it is where most change happens.`] : []),
    '## Gotchas',
    ...(hotspots.length ? hotspots.slice(0, 3).map((h) => `- **${h.path}** is a hotspot (${h.reason}).`) : ['- No hotspots found in recent history.']),
    ...silos.slice(0, 3).map((s) => `- **${s.path}** is a knowledge silo: ${Math.round(s.ownerShare * 100)}% written by ${s.owner}.`),
  ].join('\n');
};

// ── GitHub fetch ──────────────────────────────────────────────────────────────

const gh = (url, config = {}) => axios.get(`https://api.github.com${url}`, {
  timeout: 15000,
  ...config,
  headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', ...config.headers },
}).then((r) => r.data);

const raw = (owner, repo, ref, path) =>
  axios.get(`https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${path.split('/').map(encodeURIComponent).join('/')}`,
    { timeout: 15000, responseType: 'text', transformResponse: (d) => d, maxContentLength: 1_000_000 }).then((r) => r.data);

/** Map with bounded concurrency; failed items resolve to null. */
const pool = async (items, n, fn) => {
  const out = new Array(items.length);
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]).catch(() => null);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
};

const REPOS_QUERY = `query($login: String!) { user(login: $login) {
  repositories(ownerAffiliations: OWNER, isFork: false, first: 30, orderBy: {field: PUSHED_AT, direction: DESC}) {
    nodes { name description stargazerCount pushedAt primaryLanguage { name } }
  } } }`;

const listRepos = async (login) => {
  const { data } = await axios.post('https://api.github.com/graphql', { query: REPOS_QUERY, variables: { login } },
    { headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}` }, timeout: 15000 });
  return (data.data?.user?.repositories?.nodes || []).map((r) => ({
    name: r.name, description: r.description, stars: r.stargazerCount, pushedAt: r.pushedAt, language: r.primaryLanguage?.name || null,
  }));
};

/** Full history mining + complexity + hotspot analysis for one repo (~200 REST calls). */
const analyzeRepo = async (owner, repo) => {
  const meta = await gh(`/repos/${owner}/${repo}`);
  const branch = meta.default_branch;

  const list = [];
  for (let page = 1; list.length < MAX_COMMITS; page++) {
    const batch = await gh(`/repos/${owner}/${repo}/commits`, { params: { sha: branch, per_page: 100, page } });
    list.push(...batch);
    if (batch.length < 100) break;
  }
  const commitsListed = list.slice(0, MAX_COMMITS);
  const nonMerge = commitsListed.filter((c) => (c.parents || []).length <= 1);

  const avatars = {};
  const details = await pool(nonMerge, CONCURRENCY, async (c) => {
    const d = await gh(`/repos/${owner}/${repo}/commits/${c.sha}`);
    const author = d.author?.login || d.commit?.author?.name || 'unknown';
    if (d.author?.avatar_url) avatars[author] = d.author.avatar_url;
    return {
      sha: d.sha, author, date: d.commit?.author?.date,
      files: (d.files || []).map((f) => ({ path: f.filename, previousPath: f.previous_filename, additions: f.additions, deletions: f.deletions })),
    };
  });
  const commits = resolveRenames(details.filter(Boolean));

  const { tree = [], truncated } = await gh(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}`, { params: { recursive: 1 } });
  const sizes = Object.fromEntries(tree.filter((t) => t.type === 'blob').map((t) => [t.path, t.size]));

  const churn = aggregateChurn(commits);
  const live = Object.entries(churn).filter(([p]) => p in sizes); // deleted files can't be hotspots

  const candidates = live.filter(([p]) => isCode(p) && sizes[p] < 500_000)
    .sort((a, b) => b[1].commits - a[1].commits).slice(0, COMPLEXITY_FILES);
  const measured = await pool(candidates, CONCURRENCY, async ([path, s]) => ({ path, commits: s.commits, ...measureComplexity(await raw(owner, repo, branch, path)) }));
  const files = measured.filter(Boolean).map((f) => {
    const s = churn[f.path];
    const owners = shares(s.authors);
    return { ...f, added: s.added, deleted: s.deleted, bytes: sizes[f.path], lastModified: s.lastModified,
      authors: owners.slice(0, 5), owner: owners[0]?.name, ownerShare: owners[0]?.share || 0 };
  });

  const authorTotals = {};
  for (const s of Object.values(churn)) for (const [a, n] of Object.entries(s.authors)) authorTotals[a] = (authorTotals[a] || 0) + n;
  const authorCommits = {};
  for (const c of commits) authorCommits[c.author] = (authorCommits[c.author] || 0) + 1;
  const contributors = shares(authorTotals).map((a) => ({ ...a, commits: authorCommits[a.name], avatar: avatars[a.name] || null }));

  const liveChurn = Object.fromEntries(live);
  const silos = files.filter((f) => f.ownerShare >= SILO)
    .map(({ path, owner: o, ownerShare }) => ({ path, owner: o, ownerShare }));

  return {
    repo, owner, branch,
    url: meta.html_url, description: meta.description, language: meta.language, stars: meta.stargazers_count,
    totals: {
      commits: commits.length, mergesSkipped: commitsListed.length - nonMerge.length,
      files: Object.keys(sizes).filter((p) => !isIgnored(p)).length, codeFiles: Object.keys(sizes).filter((p) => isCode(p) && !isIgnored(p)).length,
      filesChanged: live.length, contributors: contributors.length, busFactor: busFactor(authorTotals),
      since: commits[commits.length - 1]?.date || null, until: commits[0]?.date || null, treeTruncated: !!truncated,
    },
    contributors: contributors.slice(0, 12),
    hotspots: scoreHotspots(files, commits.length),
    files, // the measured set: treemap input
    knowledge: knowledgeMap(liveChurn).slice(0, 12),
    silos,
    coupling: changeCoupling(commits.map((c) => ({ ...c, files: c.files.filter((f) => f.path in sizes) }))),
    structure: outline(tree).slice(0, 200),
  };
};

const README_MAX = 6000;
const MANIFESTS = ['package.json', 'backend/package.json', 'frontend/package.json', 'server/package.json', 'client/package.json', 'requirements.txt', 'go.mod'];

/** AI "5-minute tour" from README, manifests, structure and the analysis results. */
const generateTour = async (report) => {
  const { owner, repo, branch, structure } = report;
  const readme = await gh(`/repos/${owner}/${repo}/readme`, { headers: { Accept: 'application/vnd.github.raw' }, responseType: 'text', transformResponse: (d) => d })
    .catch(() => '');
  // structure may be truncated, so just try each manifest; 404s resolve to null
  const manifests = (await pool(MANIFESTS, 4, async (path) => ({ path, text: await raw(owner, repo, branch, path) }))).filter(Boolean);
  const stack = detectStack(manifests);
  const ctx = { ...report, readme, stack };

  const prompt = `You are a staff engineer giving a new teammate a 5-minute tour of the GitHub repository ${owner}/${repo}.
Write Markdown using only "## " headings, "- " bullets and **bold**. Sections: What it does; Architecture & main modules; How a request flows; Where to start; Gotchas.
Be concrete: name real files and directories from the data below. Under 400 words.

Description: ${report.description || 'none'} · Language: ${report.language || 'unknown'} · Stack: ${stack.join(', ') || 'unknown'}
Top-level structure:
${structure.map((s) => `${s.path}${s.type === 'dir' ? `/ (${s.files} files)` : ''}`).join('\n')}

Hotspots (change frequency × complexity):
${report.hotspots.slice(0, 8).map((h) => `- ${h.path}: ${h.reason}`).join('\n') || 'none'}
Knowledge silos (one author ≥80%):
${report.silos.slice(0, 5).map((s) => `- ${s.path}: ${Math.round(s.ownerShare * 100)}% ${s.owner}`).join('\n') || 'none'}
Bus factor: ${report.totals.busFactor}

README (truncated):
${String(readme).slice(0, README_MAX)}`;

  const { content, model } = await askGemini(prompt, fallbackTour(ctx));
  return { content, model, stack, generatedAt: new Date() };
};

module.exports = {
  isIgnored, isCode, resolveRenames, aggregateChurn, shares, measureComplexity, scoreHotspots, busFactor,
  knowledgeMap, changeCoupling, outline, detectStack, readmeIntro, fallbackTour,
  listRepos, analyzeRepo, generateTour,
};
