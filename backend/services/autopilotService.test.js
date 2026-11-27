const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const {
  isMajorBump, buildPlans, patchPackageJson, patchRequirements, patchGoMod, unifiedDiff,
  preparePlan, parseStackTrace, matchFile, computeChores, incidentFallback,
} = require('./autopilotService');
const { appJwt } = require('./githubApp');

const finding = (o) => ({ repo: 'app', path: 'package-lock.json', ecosystem: 'npm', package: 'lodash', version: '4.17.15', severity: 'HIGH', fixedIn: '4.17.21', dev: false, advisories: [{ id: 'GHSA-1', aliases: ['CVE-1'], summary: 'Prototype pollution', severity: 'HIGH', url: 'https://osv.dev/vulnerability/GHSA-1' }], ...o });

test('isMajorBump: semver majors, and minors on 0.x', () => {
  assert.strictEqual(isMajorBump('1.2.3', '2.0.0'), true);
  assert.strictEqual(isMajorBump('1.2.3', '1.9.0'), false);
  assert.strictEqual(isMajorBump('0.4.1', '0.5.0'), true);
  assert.strictEqual(isMajorBump('0.4.1', '0.4.9'), false);
});

test('buildPlans: groups per repo+manifest, merges duplicate packages, skips unfixable, sets risk', () => {
  const plans = buildPlans([
    finding({}),
    finding({ version: '4.17.10', fixedIn: '4.17.19', severity: 'CRITICAL', advisories: [{ id: 'GHSA-2', severity: 'CRITICAL', url: 'u' }] }),
    finding({ package: 'minimist', version: '0.0.8', fixedIn: '1.2.6', severity: 'MODERATE' }),
    finding({ package: 'nofix', fixedIn: null }),
    finding({ repo: 'api', path: 'requirements.txt', ecosystem: 'PyPI', package: 'django', version: '3.2.0', fixedIn: '3.2.25', severity: 'LOW' }),
  ]);
  assert.strictEqual(plans.length, 2);
  const [npm, py] = plans;
  assert.strictEqual(npm.target, 'package.json');
  assert.strictEqual(npm.risk, 'high'); // minimist 0.x → 1.x
  assert.strictEqual(npm.severity, 'CRITICAL');
  const lodash = npm.changes.find((c) => c.package === 'lodash');
  assert.deepStrictEqual([lodash.from, lodash.to, lodash.severity, lodash.advisories.length], ['4.17.10', '4.17.21', 'CRITICAL', 2]);
  assert.ok(!npm.changes.some((c) => c.package === 'nofix'));
  assert.strictEqual(py.risk, 'low');
});

test('patchPackageJson: keeps ^/~ prefix and formatting, skips ranges and up-to-date specs', () => {
  const text = '{\n\t"name": "x",\n\t"dependencies": {\n\t\t"lodash": "^4.17.15",\n\t\t"axios": "~0.21.0",\n\t\t"weird": ">=1 <2",\n\t\t"fresh": "^9.0.0"\n\t},\n\t"devDependencies": { "minimist": "0.0.8" }\n}\n';
  const { text: out, patched } = patchPackageJson(text, { lodash: '4.17.21', axios: '0.21.2', weird: '1.5.0', fresh: '8.0.0', minimist: '1.2.6', missing: '1.0.0' });
  assert.deepStrictEqual(patched, ['lodash', 'axios', 'minimist']);
  assert.match(out, /"lodash": "\^4\.17\.21"/);
  assert.match(out, /"axios": "~0\.21\.2"/);
  assert.match(out, /"weird": ">=1 <2"/);
  assert.match(out, /"fresh": "\^9\.0\.0"/);
  assert.match(out, /"minimist": "1\.2\.6"/);
  assert.ok(out.startsWith('{\n\t"name"'));
});

test('patchRequirements: keeps operator, extras, comments; normalises names', () => {
  const text = 'Django==3.2.0  # web\nrequests[socks]>=2.20.0\r\nflask\nPyYAML~=5.1\n';
  const { text: out, patched } = patchRequirements(text, { django: '3.2.25', requests: '2.31.0', pyyaml: '5.4' });
  assert.strictEqual(out, 'Django==3.2.25  # web\nrequests[socks]>=2.31.0\r\nflask\nPyYAML~=5.4\n');
  assert.deepStrictEqual(patched.sort(), ['Django', 'PyYAML', 'requests']);
});

test('patchGoMod: single and block require lines, keeps // indirect', () => {
  const text = 'module x\n\ngo 1.21\n\nrequire golang.org/x/net v0.7.0\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.0\n\tgolang.org/x/text v0.3.7 // indirect\n)\n\nreplace golang.org/x/text v0.3.7 => ./text\n';
  const { text: out, patched } = patchGoMod(text, { 'golang.org/x/net': '0.17.0', 'github.com/gin-gonic/gin': '1.9.1', 'golang.org/x/text': '0.3.8' });
  assert.match(out, /^require golang\.org\/x\/net v0\.17\.0$/m);
  assert.match(out, /^\tgithub\.com\/gin-gonic\/gin v1\.9\.1$/m);
  assert.match(out, /^\tgolang\.org\/x\/text v0\.3\.8 \/\/ indirect$/m);
  assert.match(out, /^replace golang\.org\/x\/text v0\.3\.7 => \.\/text$/m); // replace directives untouched
  assert.deepStrictEqual(patched.sort(), ['github.com/gin-gonic/gin', 'golang.org/x/net', 'golang.org/x/text']);
});

test('unifiedDiff: hunks with 3 lines of context, merges nearby changes, no-EOL marker', () => {
  const before = Array.from({ length: 20 }, (_, i) => `l${i + 1}`).join('\n') + '\n';
  const after = before.replace('l2\n', 'L2\n').replace('l4\n', 'L4\n').replace('l18\n', 'L18\n');
  assert.strictEqual(unifiedDiff('f.txt', before, after), [
    'diff --git a/f.txt b/f.txt', '--- a/f.txt', '+++ b/f.txt',
    '@@ -1,7 +1,7 @@', ' l1', '-l2', '+L2', ' l3', '-l4', '+L4', ' l5', ' l6', ' l7',
    '@@ -15,6 +15,6 @@', ' l15', ' l16', ' l17', '-l18', '+L18', ' l19', ' l20', '',
  ].join('\n'));
  assert.strictEqual(unifiedDiff('f', 'a\nb', 'a\nc'), 'diff --git a/f b/f\n--- a/f\n+++ b/f\n@@ -1,2 +1,2 @@\n a\n-b\n\\ No newline at end of file\n+c\n\\ No newline at end of file\n');
  assert.strictEqual(unifiedDiff('f', 'same', 'same'), '');
});

test('preparePlan: lockfile plan patches package.json for direct deps, npm update for transitive', () => {
  const [plan] = buildPlans([finding({ path: 'web/package-lock.json' }), finding({ path: 'web/package-lock.json', package: 'minimist', version: '1.2.5', fixedIn: '1.2.6' })]);
  const p = preparePlan(plan, '{\n  "dependencies": {\n    "lodash": "^4.17.15"\n  }\n}\n');
  assert.strictEqual(p.target, 'web/package.json');
  assert.deepStrictEqual(p.changes.map((c) => [c.package, c.direct, c.patched]), [['lodash', true, true], ['minimist', false, false]]);
  assert.deepStrictEqual(p.commands, ['cd web && npm install lodash@4.17.21', 'cd web && npm update minimist']);
  assert.match(p.diff, /-    "lodash": "\^4\.17\.15"\n\+    "lodash": "\^4\.17\.21"/);
  assert.match(p.title, /upgrade 2 vulnerable packages in web\/package\.json/);
  assert.match(p.body, /\| `lodash` \| 4\.17\.15 \| \*\*4\.17\.21\*\* \| HIGH \| No \|/);
  assert.match(p.body, /\[CVE-1\]\(https:\/\/osv\.dev\/vulnerability\/GHSA-1\)/);
  assert.match(p.body, /Run `npm install` and commit the refreshed package-lock\.json/);
  assert.strictEqual(p.patchable, true);

  const unreadable = preparePlan(plan, null);
  assert.strictEqual(unreadable.patchable, false);
  assert.match(unreadable.patchError, /Could not read/);
});

test('preparePlan: PyPI and Go install commands', () => {
  const [py] = buildPlans([finding({ path: 'requirements.txt', ecosystem: 'PyPI', package: 'django', version: '3.2.0', fixedIn: '3.2.25' })]);
  assert.deepStrictEqual(preparePlan(py, 'django==3.2.0\n').commands, ['pip install "django==3.2.25"']);
  const [go] = buildPlans([finding({ path: 'svc/go.mod', ecosystem: 'Go', package: 'golang.org/x/net', version: '0.7.0', fixedIn: '0.17.0' })]);
  assert.deepStrictEqual(preparePlan(go, 'require golang.org/x/net v0.7.0\n').commands, ['cd svc && go get golang.org/x/net@v0.17.0', 'cd svc && go mod tidy']);
});

test('parseStackTrace: Node frames, externals flagged, file:// and Windows paths', () => {
  const frames = parseStackTrace(`TypeError: Cannot read properties of undefined (reading 'id')
    at getUser (/srv/app/src/services/user.js:42:17)
    at async Router.handle (file:///srv/app/src/routes/users.mjs:10:3)
    at Layer.handle [as handle_request] (/srv/app/node_modules/express/lib/router/layer.js:95:5)
    at C:\\work\\app\\lib\\boot.ts:7:1
    at node:internal/process/task_queues:95:5`);
  assert.deepStrictEqual(frames.map((f) => [f.file, f.line, f.fn, f.external]), [
    ['srv/app/src/services/user.js', 42, 'getUser', false],
    ['srv/app/src/routes/users.mjs', 10, 'Router.handle', false],
    ['srv/app/node_modules/express/lib/router/layer.js', 95, 'Layer.handle', true],
    ['work/app/lib/boot.ts', 7, undefined, false],
  ]);
});

test('parseStackTrace: Python (innermost first), Java, Go, Ruby, PHP', () => {
  const py = parseStackTrace(`Traceback (most recent call last):
  File "/app/main.py", line 10, in <module>
  File "/app/api/views.py", line 55, in handler
  File "/usr/lib/python3.11/json/decoder.py", line 337, in decode
ValueError: bad`);
  assert.deepStrictEqual(py.map((f) => [f.file, f.line, f.fn, f.external]), [
    ['usr/lib/python3.11/json/decoder.py', 337, 'decode', true],
    ['app/api/views.py', 55, 'handler', false],
    ['app/main.py', 10, '<module>', false],
  ]);
  const java = parseStackTrace('java.lang.NullPointerException\n\tat com.acme.orders.OrderService.place(OrderService.java:88)\n\tat java.base/java.lang.Thread.run(Thread.java:833)');
  assert.deepStrictEqual(java[0], { file: 'com/acme/orders/OrderService.java', line: 88, fn: 'com.acme.orders.OrderService.place', external: false });
  assert.strictEqual(parseStackTrace('main.handler(...)\n\t/home/u/svc/internal/api/handler.go:31 +0x1d')[0].file, 'home/u/svc/internal/api/handler.go');
  assert.deepStrictEqual(parseStackTrace("app/models/user.rb:12:in 'save'")[0], { file: 'app/models/user.rb', line: 12, col: undefined, fn: 'save', external: false });
  assert.strictEqual(parseStackTrace('#0 /var/www/src/Cart.php(42): Cart->add()')[0].file, 'var/www/src/Cart.php');
  assert.deepStrictEqual(parseStackTrace('no frames here'), []);
});

test('matchFile: longest directory-suffix match, then shortest path; .js → .ts fallback', () => {
  const paths = ['src/services/user.js', 'test/services/user.js', 'lib/user.js', 'src/index.ts', 'README.md'];
  assert.strictEqual(matchFile('srv/app/src/services/user.js', paths), 'src/services/user.js');
  assert.strictEqual(matchFile('user.js', paths), 'lib/user.js');
  assert.strictEqual(matchFile('dist/index.js', paths), 'src/index.ts');
  assert.strictEqual(matchFile('nothing.py', paths), null);
});

test('computeChores: stale branches, old PRs, unanswered issues', () => {
  const now = Date.parse('2026-06-01T00:00:00Z');
  const ago = (d) => new Date(now - d * 86400000).toISOString();
  const { staleBranches, oldPrs, unansweredIssues } = computeChores([{
    name: 'app', url: 'https://github.com/u/app', defaultBranchRef: { name: 'main' },
    refs: { nodes: [{ name: 'main', target: { committedDate: ago(400) } }, { name: 'feat/old', target: { committedDate: ago(90) } }, { name: 'wip', target: { committedDate: ago(5) } }] },
    pullRequests: { nodes: [{ number: 1, title: 'old', url: 'p1', createdAt: ago(30) }, { number: 2, title: 'new', url: 'p2', createdAt: ago(3) }] },
    issues: { nodes: [{ number: 3, title: 'q', url: 'i3', createdAt: ago(10), comments: { totalCount: 0 } }, { number: 4, title: 'r', url: 'i4', createdAt: ago(10), comments: { totalCount: 2 } }] },
  }], now);
  assert.deepStrictEqual(staleBranches.map((b) => [b.name, b.days, b.url]), [['feat/old', 90, 'https://github.com/u/app/tree/feat/old']]);
  assert.deepStrictEqual(oldPrs.map((p) => p.number), [1]);
  assert.deepStrictEqual(unansweredIssues.map((i) => i.number), [3]);
});

test('incidentFallback: lists implicated lines with commit and PR links', () => {
  const md = incidentFallback('u', 'app', 'TypeError: boom\n at x', [
    { path: 'src/a.js', line: 3, fn: 'f', commit: { short: 'abc1234', url: 'https://github.com/c', message: 'refactor', author: 'kim', date: '2026-05-01T00:00:00Z', pr: { number: 7, url: 'https://github.com/pr/7' } } },
  ]);
  assert.match(md, /\*\*src\/a\.js:3\*\* in f: last changed in \[abc1234\]\(https:\/\/github\.com\/c\)/);
  assert.match(md, /\[PR #7\]\(https:\/\/github\.com\/pr\/7\)/);
  assert.match(md, /Error: TypeError: boom/);
});

test('appJwt: RS256 token verifiable with the app public key', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  process.env.GITHUB_APP_ID = '12345';
  process.env.GITHUB_APP_PRIVATE_KEY = privateKey.export({ type: 'pkcs1', format: 'pem' }).replace(/\n/g, '\\n'); // as stored in .env
  const [h, p, s] = appJwt(1000).split('.');
  assert.deepStrictEqual(JSON.parse(Buffer.from(h, 'base64url')), { alg: 'RS256', typ: 'JWT' });
  assert.deepStrictEqual(JSON.parse(Buffer.from(p, 'base64url')), { iat: 940, exp: 1540, iss: '12345' });
  assert.ok(crypto.verify('RSA-SHA256', Buffer.from(`${h}.${p}`), publicKey, Buffer.from(s, 'base64url')));
  delete process.env.GITHUB_APP_ID;
  delete process.env.GITHUB_APP_PRIVATE_KEY;
});
