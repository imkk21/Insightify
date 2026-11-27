const test = require('node:test');
const assert = require('node:assert');
const {
  parsePackageLock, parsePackageJson, parseRequirements, parseGoMod,
  compareVersions, pickFix, severityOf, dedupeVulns, findManifests, groupFindings,
} = require('./securityService');

test('package-lock v3: flattens nested node_modules, skips root and links', () => {
  const deps = parsePackageLock(JSON.stringify({
    packages: {
      '': { name: 'app', version: '1.0.0' },
      'node_modules/lodash': { version: '4.17.15' },
      'node_modules/a/node_modules/@scope/b': { version: '2.0.0', dev: true },
      'node_modules/linked': { link: true, resolved: '../x' },
    },
  }));
  assert.deepStrictEqual(deps, [
    { name: 'lodash', version: '4.17.15', ecosystem: 'npm', dev: false },
    { name: '@scope/b', version: '2.0.0', ecosystem: 'npm', dev: true },
  ]);
});

test('package-lock v1: walks nested dependencies', () => {
  const deps = parsePackageLock(JSON.stringify({ dependencies: { a: { version: '1.0.0', dependencies: { b: { version: '2.0.0' } } } } }));
  assert.deepStrictEqual(deps.map((d) => `${d.name}@${d.version}`), ['a@1.0.0', 'b@2.0.0']);
});

test('package.json: lowest version of each range, flagged approximate', () => {
  const deps = parsePackageJson(JSON.stringify({ dependencies: { a: '^1.2.3', b: 'latest', c: 'git+https://x' }, devDependencies: { d: '~0.4.1' } }));
  assert.deepStrictEqual(deps, [
    { name: 'a', version: '1.2.3', ecosystem: 'npm', dev: false, approximate: true },
    { name: 'd', version: '0.4.1', ecosystem: 'npm', dev: true, approximate: true },
  ]);
});

test('requirements.txt: == exact, >= / ~= approximate, extras and comments handled', () => {
  const deps = parseRequirements('Django==3.0.0  # web\nrequests[security] == 2.19.0\nflask>=2.0.1\nnumpy~=1.24\npandas\n-r other.txt\n');
  assert.deepStrictEqual(
    deps.map((d) => `${d.name}@${d.version}${d.approximate ? '~' : ''}`),
    ['django@3.0.0', 'requests@2.19.0', 'flask@2.0.1~', 'numpy@1.24~']
  );
});

test('groupFindings: one row per package@version, worst severity, fix that clears all', () => {
  const base = { repo: 'app', path: 'package-lock.json', ecosystem: 'npm', package: 'next', version: '14.2.5', dev: false, approximate: false, aliases: [], summary: 's', url: 'u' };
  const findings = groupFindings([
    { ...base, id: 'A', severity: 'MODERATE', fixedIn: '14.2.10' },
    { ...base, id: 'B', severity: 'CRITICAL', fixedIn: '14.2.25' },
    { ...base, package: 'tar', version: '6.0.0', id: 'C', severity: 'LOW', fixedIn: null },
  ]);
  assert.strictEqual(findings.length, 2);
  assert.deepStrictEqual(
    { pkg: findings[0].package, severity: findings[0].severity, fixedIn: findings[0].fixedIn, ids: findings[0].advisories.map((a) => a.id), unfixable: findings[0].unfixable },
    { pkg: 'next', severity: 'CRITICAL', fixedIn: '14.2.25', ids: ['B', 'A'], unfixable: false }
  );
  assert.strictEqual(findings[1].unfixable, true);
});

test('go.mod: block and single-line requires, v prefix and +incompatible stripped', () => {
  const deps = parseGoMod('module x\n\ngo 1.21\n\nrequire golang.org/x/text v0.3.5\nrequire (\n\tgithub.com/a/b v1.2.3 // indirect\n\tgithub.com/c/d v2.0.0+incompatible\n)\n');
  assert.deepStrictEqual(deps.map((d) => `${d.name}@${d.version}`), ['golang.org/x/text@0.3.5', 'github.com/a/b@1.2.3', 'github.com/c/d@2.0.0']);
});

test('compareVersions: numeric, pre-release before release', () => {
  assert.strictEqual(compareVersions('4.17.21', '4.17.15'), 1);
  assert.strictEqual(compareVersions('1.10.0', '1.9.9'), 1);
  assert.strictEqual(compareVersions('2.0.0-rc.1', '2.0.0'), -1);
  assert.strictEqual(compareVersions('1.0', '1.0.0'), 0);
});

test('pickFix: lowest fix above the installed version, for this package only', () => {
  const vuln = { affected: [
    { package: { name: 'lodash' }, ranges: [{ events: [{ introduced: '0' }, { fixed: '4.17.21' }] }, { events: [{ introduced: '3.0.0' }, { fixed: '4.17.19' }] }] },
    { package: { name: 'other' }, ranges: [{ events: [{ fixed: '4.17.16' }] }] },
  ] };
  assert.strictEqual(pickFix(vuln, { name: 'lodash', version: '4.17.15' }), '4.17.19');
  assert.strictEqual(pickFix(vuln, { name: 'lodash', version: '4.17.20' }), '4.17.21');
  assert.strictEqual(pickFix({ affected: [] }, { name: 'x', version: '1.0.0' }), null);
});

test('severityOf normalises GitHub severities', () => {
  assert.strictEqual(severityOf({ database_specific: { severity: 'HIGH' } }), 'HIGH');
  assert.strictEqual(severityOf({ database_specific: { severity: 'medium' } }), 'MODERATE');
  assert.strictEqual(severityOf({}), 'UNKNOWN');
});

test('dedupeVulns keeps one entry per alias group, preferring GHSA', () => {
  const kept = dedupeVulns([
    { id: 'PYSEC-2020-1', aliases: ['CVE-2020-9'] },
    { id: 'GHSA-aaaa', aliases: ['CVE-2020-9', 'PYSEC-2020-1'] },
    { id: 'GO-2021-2', aliases: [] },
  ]);
  assert.deepStrictEqual(kept.map((v) => v.id), ['GHSA-aaaa', 'GO-2021-2']);
});

test('findManifests: root + one level, lockfile wins, skips node_modules', () => {
  const entries = [
    { name: 'package.json', type: 'blob' },
    { name: 'backend', type: 'tree', object: { entries: [{ name: 'package.json', type: 'blob' }, { name: 'package-lock.json', type: 'blob' }] } },
    { name: 'api', type: 'tree', object: { entries: [{ name: 'requirements.txt', type: 'blob' }] } },
    { name: 'node_modules', type: 'tree', object: { entries: [{ name: 'package.json', type: 'blob' }] } },
  ];
  assert.deepStrictEqual(findManifests(entries), ['package.json', 'backend/package-lock.json', 'api/requirements.txt']);
});
