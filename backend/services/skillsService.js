const axios = require('axios');
const crypto = require('crypto');

// "Proof of skill": every skill below is backed by real lines in the user's own public commits.
// Detection is deterministic; the AI only phrases the summary from the evidence we hand it.

const CATEGORIES = ['Languages', 'Frontend', 'Backend', 'Data', 'DevOps & Cloud', 'Testing & Quality', 'Security', 'AI'];
const MAX_COMMITS = 80;
const MAX_LINES_PER_FILE = 400; // bounds CPU on huge initial commits
const DAY = 86400000;

// ── Ignore rules ─────────────────────────────────────────────────────────────

const IGNORE = [
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|npm-shrinkwrap\.json|Cargo\.lock|poetry\.lock|Pipfile\.lock|Gemfile\.lock|composer\.lock|go\.sum|uv\.lock)$/,
  /(^|\/)(node_modules|vendor|third_party|dist|build|out|\.next|\.nuxt|coverage|__generated__|generated|bower_components|site-packages|\.venv|venv)\//,
  /\.(min\.(js|css)|map|bundle\.js|chunk\.js|pb\.go|lock)$/,
  /(^|\/)[^/]*\.generated\.[^/]+$/,
  /\.(png|jpe?g|gif|svg|ico|webp|pdf|woff2?|ttf|eot|mp[34]|zip|gz|ipynb|snap)$/,
];
const isIgnored = (path) => IGNORE.some((re) => re.test(path));

// ── Languages by extension ───────────────────────────────────────────────────

const LANGS = {
  js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript',
  py: 'Python', go: 'Go', rs: 'Rust', java: 'Java', kt: 'Kotlin', kts: 'Kotlin', swift: 'Swift', rb: 'Ruby',
  php: 'PHP', c: 'C', h: 'C', cpp: 'C++', cc: 'C++', hpp: 'C++', cs: 'C#', dart: 'Dart', scala: 'Scala',
  sh: 'Shell', bash: 'Shell', sql: 'SQL', html: 'HTML', css: 'CSS', scss: 'CSS', sass: 'CSS', less: 'CSS',
  lua: 'Lua', r: 'R', ex: 'Elixir', exs: 'Elixir', sol: 'Solidity', vue: 'Vue', svelte: 'Svelte',
};
const extOf = (path) => path.split('/').pop().split('.').slice(1).pop()?.toLowerCase() || '';
const languageOf = (path) => (['vue', 'svelte'].includes(extOf(path)) ? null : LANGS[extOf(path)] || null);

// ── Skill detectors (data-driven: add a row to teach it a new skill) ─────────
// rule = { re, in } tests added lines of files whose path matches `in`; { file } matches the path itself.

const CODE = /\.(m?[jt]sx?|cjs|py|go|rs|java|kts?|swift|rb|php|c|h|cpp|cc|hpp|cs|dart|scala|vue|svelte|ex|exs)$/i;
const JS_FILES = /\.(m?[jt]sx?|cjs|vue|svelte|astro)$/i;
const TS_FILES = /\.tsx?$/i;
const PY_FILES = /\.py$/i;
const PY_MANIFEST = /(^|\/)(requirements[^/]*\.txt|pyproject\.toml|Pipfile|setup\.py)$/;
const UI_FILES = /\.(jsx|tsx|vue|svelte|html|astro)$/i;

/** Imports/requires of npm packages (subpaths allowed) + their package.json dependency lines. */
const js = (pkgs) => [
  { re: new RegExp(`(?:\\bfrom\\s+|\\brequire\\(\\s*|\\bimport\\s*\\(?\\s*)['"](?:${pkgs})(?:/[^'"]*)?['"]`), in: JS_FILES },
  { re: new RegExp(`^\\s*"(?:${pkgs})"\\s*:\\s*"[\\^~>=<*]?\\d`), in: /(^|\/)package\.json$/ },
];
/** Python imports + requirements/pyproject lines. */
const py = (pkgs) => [
  { re: new RegExp(`^\\s*(?:from|import)\\s+(?:${pkgs})\\b`), in: PY_FILES },
  { re: new RegExp(`^\\s*"?(?:${pkgs})\\s*(?:[=<>~!\\[;"]|$)`, 'i'), in: PY_MANIFEST },
];
const line = (re, scope = CODE) => ({ re, in: scope });
const file = (re) => ({ file: re });

const DETECTORS = [
  // Frontend
  { name: 'React', cat: 'Frontend', rules: [...js('react|react-dom'), line(/\buse(State|Effect|Reducer|Context|Ref)\(/, JS_FILES)] },
  { name: 'Next.js', cat: 'Frontend', rules: [...js('next'), file(/(^|\/)next\.config\.[cm]?[jt]s$/)] },
  { name: 'Vue', cat: 'Frontend', rules: [...js('vue|pinia|vue-router|nuxt'), file(/\.vue$/)] },
  { name: 'Tailwind CSS', cat: 'Frontend', rules: [...js('tailwindcss'), file(/(^|\/)tailwind\.config\.[cm]?[jt]s$/), line(/@tailwind\s|@apply\s/, /\.(css|scss)$/)] },
  { name: 'Accessibility', cat: 'Frontend', rules: [line(/\baria-[a-z]+=|\brole=["{]|\balt=["{]|\bhtmlFor=|\bsr-only\b/, UI_FILES)] },
  // Backend
  { name: 'Express', cat: 'Backend', rules: [...js('express'), line(/\bexpress\.Router\(|\bapp\.listen\(/, JS_FILES)] },
  { name: 'NestJS', cat: 'Backend', rules: [...js('@nestjs'), line(/@(Controller|Injectable|Module)\(/, TS_FILES)] },
  { name: 'Django', cat: 'Backend', rules: py('django|rest_framework') },
  { name: 'Flask', cat: 'Backend', rules: py('flask') },
  { name: 'FastAPI', cat: 'Backend', rules: py('fastapi') },
  { name: 'Spring', cat: 'Backend', rules: [line(/^\s*import\s+org\.springframework|@SpringBootApplication|@RestController/, /\.(java|kt)$/), line(/spring-boot-starter/, /(pom\.xml|build\.gradle(\.kts)?)$/)] },
  { name: 'GraphQL', cat: 'Backend', rules: [...js('graphql|@apollo|apollo-server|graphql-request|urql'), ...py('graphene|strawberry|ariadne'), file(/\.(graphql|gql)$/), line(/\bgql`|\bquery\s*\(\$\w+:/, JS_FILES)] },
  { name: 'WebSockets / Socket.IO', cat: 'Backend', rules: [...js('socket\\.io|socket\\.io-client|ws'), line(/\bnew WebSocket\(/, JS_FILES)] },
  { name: 'API design', cat: 'Backend', rules: [line(/\b(?:router|app)\.(?:get|post|put|patch|delete)\(\s*['"`]\/|@(?:Get|Post|Put|Patch|Delete)Mapping|@(?:app|router)\.(?:get|post|put|patch|delete)\(/)] },
  { name: 'Async patterns', cat: 'Backend', rules: [line(/Promise\.(?:all|allSettled|race|any)\(|\bawait\s|\basync\s+(?:def|function)\b|\basyncio\.|\bgo func\(/)] },
  // Data
  { name: 'MongoDB / Mongoose', cat: 'Data', rules: [...js('mongoose|mongodb'), ...py('pymongo|motor|mongoengine'), line(/\bnew (?:mongoose\.)?Schema\(|\.aggregate\(\s*\[/, JS_FILES)] },
  { name: 'PostgreSQL / SQL', cat: 'Data', rules: [...js('pg|postgres|mysql2?|sequelize|knex|better-sqlite3|sqlite3|drizzle-orm|typeorm'), ...py('psycopg2?|sqlalchemy|sqlite3|asyncpg'), file(/\.sql$/), line(/\b(?:SELECT\s+[\w*,. ]+\s+FROM|INSERT\s+INTO|CREATE\s+TABLE|ALTER\s+TABLE)\b/)] },
  { name: 'Prisma', cat: 'Data', rules: [...js('@prisma/client|prisma'), file(/(^|\/)schema\.prisma$/)] },
  { name: 'Redis', cat: 'Data', rules: [...js('redis|ioredis|@upstash/redis|bullmq'), ...py('redis')] },
  { name: 'Data visualization', cat: 'Data', rules: [...js('recharts|d3|d3-[\\w-]+|chart\\.js|react-chartjs-2|@nivo|echarts|plotly\\.js|victory|@visx'), ...py('matplotlib|seaborn|plotly|altair|bokeh')] },
  { name: 'Data analysis', cat: 'Data', rules: py('pandas|numpy|polars|scipy') },
  // DevOps & Cloud
  { name: 'Docker', cat: 'DevOps & Cloud', rules: [file(/(^|\/)(Dockerfile[^/]*|[^/]*\.dockerfile|docker-compose[^/]*\.ya?ml|compose\.ya?ml|\.dockerignore)$/i)] },
  { name: 'Kubernetes', cat: 'DevOps & Cloud', rules: [file(/(^|\/)(k8s|kubernetes|helm|charts)\/.*\.ya?ml$/), line(/^\s*kind:\s*(?:Deployment|StatefulSet|Ingress|DaemonSet|CronJob)\b/, /\.ya?ml$/)] },
  { name: 'GitHub Actions / CI', cat: 'DevOps & Cloud', rules: [file(/^\.github\/workflows\/.+\.ya?ml$|(^|\/)\.gitlab-ci\.yml$|^\.circleci\/|(^|\/)Jenkinsfile$/)] },
  { name: 'Terraform', cat: 'DevOps & Cloud', rules: [file(/\.(tf|tfvars)$/)] },
  { name: 'AWS', cat: 'DevOps & Cloud', rules: [...js('aws-sdk|@aws-sdk|aws-cdk-lib'), ...py('boto3|botocore'), file(/(^|\/)serverless\.ya?ml$/)] },
  { name: 'Firebase', cat: 'DevOps & Cloud', rules: [...js('firebase|firebase-admin|@firebase'), ...py('firebase_admin'), file(/(^|\/)(firebase\.json|firestore\.rules)$/)] },
  // Testing & Quality
  { name: 'Testing', cat: 'Testing & Quality', rules: [...js('jest|vitest|mocha|chai|@testing-library|cypress|@playwright/test|playwright|supertest|node:test|sinon'), ...py('pytest|unittest'), file(/\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)(__tests__|tests?)\/.+\.\w+$|(^|\/)test_[^/]+\.py$|_test\.(go|py)$|(^|\/)cypress\//)] },
  { name: 'TypeScript typing', cat: 'Testing & Quality', rules: [line(/^\s*(?:export\s+)?(?:interface\s+\w+|type\s+\w+(?:<[^>]*>)?\s*=)|\w+<[A-Z]\w*(?:,\s*\w+)*>\(|:\s*(?:Promise|Record|Partial|Array)<\w/, TS_FILES)] },
  { name: 'Error handling', cat: 'Testing & Quality', rules: [line(/\btry\s*\{|\bcatch\s*\(|^\s*except\b|\(err,\s*req,\s*res,\s*next\)|\.catch\(|if err != nil/)] },
  { name: 'Performance', cat: 'Testing & Quality', rules: [line(/\buse(?:Memo|Callback)\(|\bReact\.memo\(|\bmemo\(|\blazy\(\s*\(\)|\bdebounce\(|\bthrottle\(|Cache-Control|@lru_cache|@cache\b|\bnew Map\(\).*cache|\bcache\.(?:get|set)\(/i)] },
  // Security
  { name: 'Authentication', cat: 'Security', rules: [...js('jsonwebtoken|jose|bcrypt|bcryptjs|argon2|passport|passport-[\\w-]+|next-auth|@auth/[\\w-]+|@clerk/[\\w-]+'), ...py('jwt|bcrypt|passlib|authlib'), line(/\bjwt\.(?:sign|verify|decode)\(|\bbcrypt\.(?:hash|compare)|\bverifyIdToken\(|\bOAuth2?\b/)] },
  { name: 'Security hardening', cat: 'Security', rules: [...js('helmet|express-rate-limit|rate-limiter-flexible|cors|csurf|dompurify|isomorphic-dompurify|sanitize-html|express-validator|zod'), line(/\bhelmet\(|\brateLimit\(|\bDOMPurify\.sanitize\(|Content-Security-Policy|\bescapeHtml\(/)] },
  // AI
  { name: 'LLM integration', cat: 'AI', rules: [...js('openai|@google/generative-ai|@google/genai|@anthropic-ai/sdk|langchain|@langchain|ai|@ai-sdk|ollama|cohere-ai|@mistralai'), ...py('openai|anthropic|langchain\\w*|google\\.generativeai|google\\.genai|llama_index|ollama'), line(/\bgenerateContent\(|chat\.completions\.create|messages\.create\(/)] },
  { name: 'Embeddings & RAG', cat: 'AI', rules: [...js('@pinecone-database/pinecone|chromadb|pgvector|@qdrant/js-client-rest|weaviate-client'), ...py('faiss|chromadb|pinecone|qdrant_client|sentence_transformers'), line(/\bembedContent\(|\bembeddings\.create\(|\bcosine(?:Similarity)?\(|\bvector(?:Store|_store)\b/i)] },
  { name: 'Machine learning', cat: 'AI', rules: py('torch|tensorflow|sklearn|keras|transformers|xgboost|lightgbm') },
];

// ── Diff parsing ─────────────────────────────────────────────────────────────

/** Unified diff → added lines with their new-file line numbers. */
const addedLines = (patch = '') => {
  const out = [];
  let n = 0;
  for (const raw of patch.split('\n')) {
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) { n = Number(hunk[1]); continue; }
    if (raw.startsWith('+')) { out.push({ n, text: raw.slice(1) }); n++; }
    else if (!raw.startsWith('-') && !raw.startsWith('\\')) n++;
    if (out.length >= MAX_LINES_PER_FILE) break;
  }
  return out.filter((l) => l.text.length <= 400); // longer lines are almost always generated/minified
};

const snippet = (text) => text.trim().replace(/\s+/g, ' ').slice(0, 120);
const firstMeaningful = (lines) => lines.find((l) => /\w{2}/.test(l.text) && !/^\s*(\/\/|#|\*|\/\*)/.test(l.text)) || lines[0];

/** One changed file → [{ skill, cat, line }] (each skill at most once per file). */
const detectFile = (path, lines) => {
  if (isIgnored(path) || !lines.length) return [];
  const hits = [];
  const lang = languageOf(path);
  if (lang) hits.push({ skill: lang, cat: 'Languages', line: firstMeaningful(lines) });
  for (const d of DETECTORS) {
    if (d.rules.some((r) => r.file?.test(path))) { hits.push({ skill: d.name, cat: d.cat, line: firstMeaningful(lines) }); continue; }
    const scoped = d.rules.filter((r) => r.re && r.in.test(path));
    const hit = scoped.length && lines.find((l) => scoped.some((r) => r.re.test(l.text)));
    if (hit) hits.push({ skill: d.name, cat: d.cat, line: hit });
  }
  return hits;
};

/** GitHub's per-file diff anchor: #diff-<sha256(path)>R<line>. */
const diffUrl = (commitUrl, path, n) =>
  `${commitUrl}#diff-${crypto.createHash('sha256').update(path).digest('hex')}${n ? `R${n}` : ''}`;

// ── Scoring & aggregation ────────────────────────────────────────────────────

/** 1–5 from evidence volume (commits), breadth (≥4 repos) and recency (stale after 180 days). */
const levelFor = ({ count, repos, lastUsed }, now = Date.now()) => {
  const age = (now - new Date(lastUsed).getTime()) / DAY;
  const volume = [3, 8, 20, 40].filter((t) => count >= t).length;
  return Math.max(1, Math.min(5, 1 + volume + (repos >= 4 ? 1 : 0) - (age > 180 ? 1 : 0)));
};

/** ≤5 items, one per commit: newest per repo first (breadth), then fill by recency. */
const pickEvidence = (candidates) => {
  const seen = new Set();
  const firstPerRepo = candidates.filter((e) => !seen.has(e.repo) && seen.add(e.repo));
  return [...firstPerRepo, ...candidates.filter((e) => !firstPerRepo.includes(e))].slice(0, 5);
};

/** commits: [{ repo, sha, url, date, files: [{ filename, patch }] }] newest first → categories. */
const buildSkills = (commits, now = Date.now()) => {
  const skills = new Map();
  for (const c of commits) {
    for (const f of c.files || []) {
      for (const hit of detectFile(f.filename, addedLines(f.patch))) {
        const s = skills.get(hit.skill) || { name: hit.skill, category: hit.cat, shas: new Set(), repos: new Set(), lastUsed: c.date, candidates: [] };
        skills.set(hit.skill, s);
        if (new Date(c.date) > new Date(s.lastUsed)) s.lastUsed = c.date;
        s.repos.add(c.repo);
        if (!s.shas.has(c.sha)) s.candidates.push({ repo: c.repo, sha: c.sha.slice(0, 7), date: c.date, url: diffUrl(c.url, f.filename, hit.line.n), file: f.filename, line: hit.line.n, snippet: snippet(hit.line.text) });
        s.shas.add(c.sha);
      }
    }
  }
  const list = [...skills.values()].map((s) => ({
    name: s.name, category: s.category, evidenceCount: s.shas.size, repos: [...s.repos], lastUsed: s.lastUsed,
    level: levelFor({ count: s.shas.size, repos: s.repos.size, lastUsed: s.lastUsed }, now), evidence: pickEvidence(s.candidates),
  }));
  return CATEGORIES
    .map((name) => ({ name, skills: list.filter((s) => s.category === name).sort((a, b) => b.level - a.level || b.evidenceCount - a.evidenceCount) }))
    .filter((c) => c.skills.length);
};

// ── Gaps ─────────────────────────────────────────────────────────────────────

const GAP_RULES = [
  { id: 'tests-frontend', topic: 'test', builds: 'testing', when: (n, total) => n.cat.Frontend >= 5 && !n.Testing,
    title: 'Lots of UI, no tests', detail: 'You ship a lot of frontend code but no test files appear in your recent commits. Add component tests with Vitest + Testing Library.' },
  { id: 'tests', topic: 'test', builds: 'testing', when: (n, total) => total >= 10 && !n.Testing && n.cat.Frontend < 5,
    title: 'No tests', detail: 'None of your recent commits add or change tests. Start with one test per bug fix.' },
  { id: 'ci', topic: 'ci', builds: 'CI', when: (n, total) => total >= 10 && !n['GitHub Actions / CI'],
    title: 'No CI', detail: 'No CI workflow changes found. A GitHub Actions workflow that runs lint and tests on every push is a 20-line win.' },
  { id: 'typescript', topic: 'typescript', builds: 'TypeScript', when: (n) => n.JavaScript >= 5 && !n.TypeScript,
    title: 'No TypeScript', detail: 'Your JavaScript work is solid but untyped. Converting one module to TypeScript is a strong, visible signal.' },
  { id: 'a11y', topic: 'accessibility', builds: 'accessibility', when: (n) => n.cat.Frontend >= 3 && !n.Accessibility,
    title: 'No accessibility attributes', detail: 'No aria-*, role, alt or label wiring in your UI changes. Accessible UI is a differentiator in interviews.' },
  { id: 'security', topic: 'security', builds: 'security', when: (n) => n.cat.Backend >= 5 && !n.Authentication && !n['Security hardening'],
    title: 'Backend without security work', detail: 'No auth, rate limiting or hardening (helmet, CORS, validation) in your backend commits.' },
  { id: 'docker', topic: 'docker', builds: 'Docker', when: (n) => n.cat.Backend >= 5 && !n.Docker,
    title: 'Not containerized', detail: 'Backend code but no Dockerfile. Containerizing one service shows you can ship, not just code.' },
];

/** categories → [{ id, title, detail, topic }] */
const findGaps = (categories, totalCommits) => {
  const n = { cat: Object.fromEntries(CATEGORIES.map((c) => [c, 0])) };
  for (const c of categories) for (const s of c.skills) { n[s.name] = s.evidenceCount; n.cat[c.name] += s.evidenceCount; }
  return GAP_RULES.filter((r) => r.when(n, totalCommits)).map(({ id, title, detail, topic, builds }) => ({ id, title, detail, topic, builds }));
};

// ── Summary ──────────────────────────────────────────────────────────────────

const topSkills = (categories, k = 12) =>
  categories.flatMap((c) => c.skills).sort((a, b) => b.level - a.level || b.evidenceCount - a.evidenceCount).slice(0, k);

const fallbackSummary = (name, categories, stats) => {
  const top = topSkills(categories, 4).map((s) => s.name);
  if (!top.length) return `${name} has no detectable skill evidence in recent public commits yet.`;
  const strongest = categories.map((c) => ({ c: c.name, sum: c.skills.reduce((a, s) => a + s.level, 0) })).filter((c) => c.c !== 'Languages').sort((a, b) => b.sum - a.sum)[0];
  return `${name} has verified, hands-on work in ${top.slice(0, -1).join(', ')}${top.length > 1 ? ' and ' : ''}${top.at(-1)}, backed by ${stats.commits} commits across ${stats.repos} public repositories.` +
    (strongest ? ` The deepest evidence is in ${strongest.c}.` : '');
};

// ── Matchmaker ───────────────────────────────────────────────────────────────

/** "why it matches you" sentence from the user's own evidence. */
const whyMatch = ({ language, gap, labels = [], repoLanguage }, skills) => {
  const lang = skills.find((s) => s.name === (repoLanguage || language)) || skills.find((s) => s.name === language);
  const parts = [lang ? `You've shipped ${lang.name} in ${lang.evidenceCount} recent commit${lang.evidenceCount === 1 ? '' : 's'}` : `Matches your ${language} work`];
  const text = labels.join(' ').toLowerCase();
  const related = skills.find((s) => { const w = s.name.split(/[ /.]/)[0].toLowerCase(); return s.category !== 'Languages' && s.level >= 2 && w.length >= 4 && text.includes(w); });
  if (related) parts.push(`it touches ${related.name}, where you have level ${related.level}/5`);
  if (gap) parts.push(`and it builds ${gap.builds} experience, a gap in your recent work`);
  return `${parts.join(', ')}.`;
};

/** npm `repository` field (string or {url}) points at github.com/<login>/<repo>? */
const repoMatches = (repository, login, repo) => {
  const raw = (typeof repository === 'string' ? repository : repository?.url || '').toLowerCase().replace(/\.git$/, '').replace(/\/$/, '');
  const want = `${login}/${repo}`.toLowerCase();
  return raw.endsWith(`github.com/${want}`) || raw === want || raw === `github:${want}`;
};

// ── Network ──────────────────────────────────────────────────────────────────

const gh = (url, params) => axios.get(`https://api.github.com${url}`, {
  params, timeout: 15000,
  headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
}).then((r) => r.data);

const mapLimit = async (items, limit, fn) => {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i).catch(() => null); }
  }));
  return out;
};

/** Public, non-fork repos, most recently pushed first. The public-only list also filters out
 *  private repos the server token may see, so every piece of evidence is safe to publish. */
const publicRepos = async (login) =>
  (await gh(`/users/${login}/repos`, { type: 'owner', sort: 'pushed', per_page: 100 })).filter((r) => !r.private && !r.fork);

/** Up to 80 of the user's own commits in their 8 most recently pushed public repos, with patches. */
const mineCommits = async (login, repos, recentCommits = []) => {
  const recent = repos.slice(0, 8);
  const lists = await mapLimit(recent, 8, (r) => gh(`/repos/${login}/${r.name}/commits`, { author: login, per_page: 30 }));
  const bySha = new Map();
  lists.forEach((list, i) => (list || []).forEach((c) =>
    bySha.set(c.sha.slice(0, 7), { repo: recent[i].name, sha: c.sha, date: c.commit.author.date })));
  const publicNames = new Set(repos.map((r) => r.name));
  for (const c of recentCommits) {
    if (publicNames.has(c.repo) && !bySha.has(c.sha)) bySha.set(c.sha, { repo: c.repo, sha: c.sha, date: c.date });
  }
  const picked = [...bySha.values()].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, MAX_COMMITS);
  const details = await mapLimit(picked, 8, async (c) => {
    const d = await gh(`/repos/${login}/${c.repo}/commits/${c.sha}`);
    if (d.parents?.length > 1) return null; // merge commits re-show other people's work
    return { repo: c.repo, sha: d.sha, url: d.html_url, date: d.commit.author.date, files: (d.files || []).map((f) => ({ filename: f.filename, patch: f.patch })) };
  });
  const mined = details.filter(Boolean);
  if (picked.length && !mined.length) throw Object.assign(new Error('Could not read commit details from GitHub (rate limit?). Try again later.'), { status: 502 });
  return mined;
};

/** npm packages published from the user's repos + last-month downloads. */
const npmImpact = async (login, repos) => {
  const found = await mapLimit(repos.slice(0, 30), 8, async (r) => {
    const { data: pkg } = await axios.get(`https://raw.githubusercontent.com/${login}/${r.name}/HEAD/package.json`, { timeout: 10000 });
    if (!pkg?.name || pkg.private) return null;
    const { data: meta } = await axios.get(`https://registry.npmjs.org/${pkg.name.replace('/', '%2f')}/latest`, { timeout: 10000 });
    if (!repoMatches(meta.repository, login, r.name)) return null; // name squatting / unrelated package with same name
    const { data: dl } = await axios.get(`https://api.npmjs.org/downloads/point/last-month/${pkg.name}`, { timeout: 10000 });
    return { name: pkg.name, repo: r.name, version: meta.version, downloads: dl.downloads || 0, url: `https://www.npmjs.com/package/${pkg.name}` };
  });
  const packages = found.filter(Boolean).sort((a, b) => b.downloads - a.downloads);
  return { packages, totalDownloads: packages.reduce((a, p) => a + p.downloads, 0) };
};

const askSummary = async (name, categories, stats) => {
  const { askGemini } = require('./insightService'); // lazy: keeps unit tests free of the Gemini SDK
  const evidence = topSkills(categories).map((s) => ({ skill: s.name, category: s.category, level: s.level, commits: s.evidenceCount, repos: s.repos.length, lastUsed: s.lastUsed?.slice(0, 10) }));
  return askGemini(
    `Write a 3-4 sentence professional summary for a developer named ${name}, for a résumé-style "proof of skill" page.\n` +
    `Use ONLY the skills in this JSON, which were detected from ${stats.commits} of their real commits across ${stats.repos} public repositories. ` +
    `Never mention a technology, employer, title or achievement that is not in the JSON. Third person, confident but factual, no bullet points, no headings.\n\n` +
    JSON.stringify(evidence),
    fallbackSummary(name, categories, stats)
  );
};

/** Full pipeline; ~60s. github = freshStats doc (for name + recentCommits). */
const buildProfile = async (login, github) => {
  const repos = await publicRepos(login);
  const commits = await mineCommits(login, repos, github?.recentCommits || []);
  const categories = buildSkills(commits);
  const stats = { commits: commits.length, repos: new Set(commits.map((c) => c.repo)).size, files: commits.reduce((a, c) => a + (c.files?.length || 0), 0) };
  const [summary, impact] = await Promise.all([
    askSummary(github?.profile?.name || login, categories, stats),
    npmImpact(login, repos),
  ]);
  return {
    username: login, generatedAt: new Date(), stats, categories,
    gaps: findGaps(categories, stats.commits), impact,
    summary: summary.content, summaryModel: summary.model,
  };
};

const ISSUE_Q = 'is:issue is:open label:"good first issue" no:assignee comments:<5';
const issueSearch = async (q) => (await gh('/search/issues', { q, sort: 'updated', per_page: 50 })).items;

/** Good first issues in popular repos of the user's top language, plus a few that build a detected gap. */
const findMatches = async (login, profile) => {
  const skills = (profile.categories || []).flatMap((c) => c.skills);
  const language = (profile.categories || []).find((c) => c.name === 'Languages')?.skills[0]?.name || 'JavaScript';
  const gap = (profile.gaps || [])[0];
  const since = new Date(Date.now() - 30 * DAY).toISOString().slice(0, 10);

  // Repo-first so results are sorted by popularity, not by whichever tiny repo filed an issue last
  const popular = (await gh('/search/repositories', {
    q: `language:"${language}" good-first-issues:>2 archived:false pushed:>${since}`, sort: 'stars', per_page: 15,
  })).items.filter((r) => r.owner.login.toLowerCase() !== login.toLowerCase());
  const repos = new Map(popular.map((r) => [r.full_name, r]));
  // One query: repo: qualifiers don't count toward the 256-char limit. Sequential searches only;
  // parallel ones trip GitHub's secondary rate limit.
  const listed = popular.length ? await issueSearch(`${ISSUE_Q} ${popular.map((r) => `repo:${r.full_name}`).join(' ')}`) : [];
  const found = listed.map((i) => ({ i, gap: null }));

  if (gap) {
    const gapIssues = ((await issueSearch(`${ISSUE_Q} language:"${language}" archived:false ${gap.topic} in:title`).catch(() => [])) || []).slice(0, 8);
    const missing = [...new Set(gapIssues.map((i) => i.repository_url.split('/repos/')[1]))].filter((r) => !repos.has(r));
    (await mapLimit(missing, 8, (r) => gh(`/repos/${r}`))).filter((r) => r && !r.archived).forEach((r) => repos.set(r.full_name, r));
    found.push(...gapIssues.map((i) => ({ i, gap })));
  }

  const seen = new Set();
  const matches = found
    .map(({ i, gap: g }) => ({ i, g, repo: repos.get(i.repository_url.split('/repos/')[1]) }))
    .filter(({ i, repo }) => repo && !i.pull_request && repo.owner.login.toLowerCase() !== login.toLowerCase() && !seen.has(i.html_url) && seen.add(i.html_url))
    .map(({ i, g, repo }) => {
      const labels = i.labels.map((l) => l.name);
      return {
        title: i.title, url: i.html_url, repo: repo.full_name, repoUrl: repo.html_url, stars: repo.stargazers_count,
        language: repo.language, labels, comments: i.comments, createdAt: i.created_at, gap: g?.id || null,
        why: whyMatch({ language, gap: g, labels: [...labels, ...(repo.topics || [])], repoLanguage: repo.language }, skills),
      };
    });
  // Up to 3 gap-builders; the rest one issue per repo first, so 10 results span ~10 projects
  const gapPicks = matches.filter((m) => m.gap).slice(0, 3);
  const rest = matches.filter((m) => !m.gap).sort((a, b) => b.stars - a.stars);
  const byRepo = new Set();
  const firstPerRepo = rest.filter((m) => !byRepo.has(m.repo) && byRepo.add(m.repo));
  return [...new Set([...firstPerRepo.slice(0, 10 - gapPicks.length), ...gapPicks, ...rest])].slice(0, 10);
};

/** Strip to what an anonymous visitor may see (all evidence is from public repos already). */
const publicView = (p) => ({
  username: p.username, generatedAt: p.generatedAt, summary: p.summary, stats: p.stats, impact: p.impact,
  categories: (p.categories || []).map((c) => ({ name: c.name, skills: c.skills.map(({ name, level, evidenceCount, repos, lastUsed, evidence }) =>
    ({ name, level, evidenceCount, repos, lastUsed, evidence: evidence.slice(0, 3) })) })),
});

module.exports = {
  CATEGORIES, DETECTORS, isIgnored, languageOf, addedLines, detectFile, diffUrl, levelFor, buildSkills,
  findGaps, fallbackSummary, whyMatch, repoMatches, publicView, buildProfile, findMatches,
};
