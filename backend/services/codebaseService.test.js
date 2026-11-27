const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('./codebaseService');

const commit = (author, date, ...paths) => ({ author, date, files: paths.map((p) => (typeof p === 'string' ? { path: p, additions: 10, deletions: 0 } : p)) });

test('isIgnored skips lockfiles, generated dirs, minified and binary files', () => {
  for (const p of ['package-lock.json', 'frontend/yarn.lock', 'node_modules/x/index.js', 'dist/app.js', 'web/build/main.js',
    'vendor/lib.go', 'public/app.min.js', 'logo.png', 'docs/a.svg', 'app.js.map']) assert.ok(s.isIgnored(p), p);
  for (const p of ['src/index.js', 'backend/server.js', 'builder.js', 'README.md', 'package.json']) assert.ok(!s.isIgnored(p), p);
});

test('resolveRenames attributes older history to the current path', () => {
  const out = s.resolveRenames([
    commit('a', '3', { path: 'new.js', previousPath: 'old.js', additions: 0, deletions: 0 }),
    commit('a', '2', 'old.js'),
  ]);
  assert.equal(out[1].files[0].path, 'new.js');
});

test('aggregateChurn counts commits, lines, authors and last modified', () => {
  const churn = s.aggregateChurn([
    commit('ann', '2024-03-01', 'a.js', 'b.js', 'yarn.lock'),
    commit('bob', '2024-02-01', { path: 'a.js', additions: 30, deletions: 5 }),
    commit('ann', '2024-01-01', { path: 'a.js', additions: 0, deletions: 0 }),
  ]);
  assert.deepEqual(Object.keys(churn).sort(), ['a.js', 'b.js']);
  assert.equal(churn['a.js'].commits, 3);
  assert.equal(churn['a.js'].added, 40);
  assert.equal(churn['a.js'].deleted, 5);
  assert.deepEqual(churn['a.js'].authors, { ann: 11, bob: 35 }); // empty diff still counts 1
  assert.equal(churn['a.js'].lastModified, '2024-03-01');
});

test('measureComplexity counts branches and non-comment lines', () => {
  const src = `// if this were real\nfunction f(a, b) {\n  if (a && b) return 1;\n  else if (a || b) return 2;\n\n  for (const x of a) {}\n  return a ? 1 : 0;\n}\n`;
  const r = s.measureComplexity(src);
  assert.equal(r.loc, 6);
  assert.equal(r.complexity, 7); // if, &&, else, if, ||, for, ?:
  assert.equal(s.measureComplexity('const x = a?.b ?? c;').complexity, 0);
});

test('scoreHotspots ranks churn × complexity and explains why', () => {
  const hs = s.scoreHotspots([
    { path: 'busy-simple.js', commits: 20, loc: 50, complexity: 2 },
    { path: 'busy-complex.js', commits: 18, loc: 600, complexity: 80 },
    { path: 'quiet-complex.js', commits: 1, loc: 900, complexity: 100 },
  ], 200);
  assert.equal(hs[0].path, 'busy-complex.js');
  assert.equal(hs[0].score, 72); // 18/20 × 80/100
  assert.equal(hs[0].reason, 'changed in 18 of 200 commits, 600 lines, complexity 80');
  assert.equal(s.scoreHotspots([{ path: 'x', commits: 3, loc: 1, complexity: 0 }], 3).length, 0);
});

test('busFactor is the fewest authors covering half the changes', () => {
  assert.equal(s.busFactor({ a: 90, b: 5, c: 5 }), 1);
  assert.equal(s.busFactor({ a: 30, b: 30, c: 20, d: 20 }), 2);
  assert.equal(s.busFactor({}), 0);
});

test('knowledgeMap groups by top-level dir and flags silos', () => {
  const km = s.knowledgeMap({
    'src/a.js': { commits: 2, authors: { ann: 90 } },
    'src/b.js': { commits: 1, authors: { bob: 10 } },
    'README.md': { commits: 1, authors: { ann: 5, bob: 5 } },
  });
  assert.equal(km[0].dir, 'src');
  assert.equal(km[0].owner, 'ann');
  assert.equal(km[0].ownerShare, 0.9);
  assert.equal(km[0].silo, true);
  assert.equal(km[1].dir, '/');
  assert.equal(km[1].silo, false);
});

test('changeCoupling finds files that change together', () => {
  const commits = [];
  for (let i = 0; i < 6; i++) commits.push(commit('a', `${i}`, 'api.js', 'client.js', i % 2 ? 'noise.js' : 'other.js'));
  commits.push(commit('a', '9', 'api.js'));
  const big = commit('a', '10', ...Array.from({ length: 60 }, (_, i) => `f${i}.js`));
  const pairs = s.changeCoupling([...commits, big]);
  assert.equal(pairs.length, 1);
  assert.deepEqual(pairs[0], { a: 'api.js', b: 'client.js', shared: 6, degree: 86 });
});

test('outline summarises two levels of the tree', () => {
  const o = s.outline([
    { path: 'README.md', type: 'blob' }, { path: 'src', type: 'tree' }, { path: 'src/index.js', type: 'blob' },
    { path: 'src/lib/a.js', type: 'blob' }, { path: 'src/lib/deep/b.js', type: 'blob' }, { path: 'node_modules/x.js', type: 'blob' },
  ]);
  assert.deepEqual(o, [
    { path: 'README.md', type: 'file' },
    { path: 'src', type: 'dir', files: 3 },
    { path: 'src/index.js', type: 'file' },
    { path: 'src/lib', type: 'dir', files: 2 },
  ]);
});

test('detectStack, readmeIntro and fallbackTour build a useful offline tour', () => {
  const stack = s.detectStack([
    { path: 'package.json', text: JSON.stringify({ dependencies: { react: '1', lodash: '1' }, devDependencies: { vite: '1' } }) },
    { path: 'requirements.txt', text: 'Flask==2.0\n# comment\n' },
    { path: 'go.mod', text: 'module x\nrequire (\n  github.com/gin-gonic/gin v1.9.0\n)' },
    { path: 'bad/package.json', text: '{oops' },
  ]);
  assert.deepEqual(stack, ['react', 'vite', 'flask', 'gin']);
  assert.deepEqual(s.readmeIntro('# Title\n\n[![b](x.svg)](https://x)\n\nDoes a thing.\nWell.\n\n```\ncode\n```'), ['Does a thing. Well.']);

  const tour = s.fallbackTour({
    repo: 'demo', readme: '# Demo\n\nDemo tracks things.', stack: ['react'],
    structure: [{ path: 'src', type: 'dir', files: 4 }, { path: 'src/main.js', type: 'file' }],
    hotspots: [{ path: 'src/main.js', reason: 'changed in 9 of 20 commits' }],
    silos: [{ path: 'src/db.js', owner: 'ann', ownerShare: 0.95 }],
  });
  for (const part of ['## What demo does', 'Demo tracks things.', '**react**', '**src/**: 4 files', 'Open **src/main.js**', 'hotspot', '95% written by ann']) {
    assert.ok(tour.includes(part), part);
  }
});
