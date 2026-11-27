const test = require('node:test');
const assert = require('node:assert');
const {
  isIgnored, languageOf, addedLines, detectFile, diffUrl, levelFor, buildSkills, findGaps, fallbackSummary,
  whyMatch, repoMatches, publicView,
} = require('./skillsService');

const patch = (...lines) => `@@ -0,0 +1,${lines.length} @@\n${lines.map((l) => `+${l}`).join('\n')}`;
const skillsIn = (path, ...lines) => detectFile(path, addedLines(patch(...lines))).map((h) => h.skill);

test('ignore rules: lockfiles, vendor/build dirs, minified and generated files', () => {
  for (const p of ['package-lock.json', 'web/yarn.lock', 'go.sum', 'node_modules/x/index.js', 'dist/app.js',
    'public/app.min.js', 'src/api.generated.ts', 'vendor/lib.go', 'logo.png']) assert.ok(isIgnored(p), p);
  for (const p of ['src/App.jsx', 'package.json', 'backend/server.js', '.github/workflows/ci.yml']) assert.ok(!isIgnored(p), p);
  assert.deepStrictEqual(skillsIn('dist/bundle.js', "import React from 'react';"), []);
});

test('addedLines tracks new-file line numbers across hunks and skips minified lines', () => {
  const p = '@@ -1,3 +1,4 @@\n ctx\n-old\n+new1\n+new2\n ctx\n@@ -40,2 +41,2 @@\n ctx\n+late\n+' + 'x'.repeat(500);
  assert.deepStrictEqual(addedLines(p), [{ n: 2, text: 'new1' }, { n: 3, text: 'new2' }, { n: 42, text: 'late' }]);
});

test('languages by extension', () => {
  assert.strictEqual(languageOf('a/b.tsx'), 'TypeScript');
  assert.strictEqual(languageOf('main.py'), 'Python');
  assert.strictEqual(languageOf('README.md'), null);
  assert.strictEqual(languageOf('App.vue'), null); // a framework, not a language
});

test('framework detectors fire on imports, requires and manifest lines', () => {
  assert.deepStrictEqual(skillsIn('src/App.jsx', "import { useState } from 'react';"), ['JavaScript', 'React']);
  assert.ok(skillsIn('server.js', "const express = require('express');").includes('Express'));
  assert.ok(skillsIn('package.json', '    "mongoose": "^8.0.0",').includes('MongoDB / Mongoose'));
  assert.ok(skillsIn('app.py', 'from fastapi import FastAPI').includes('FastAPI'));
  assert.ok(skillsIn('requirements.txt', 'Django==5.0').includes('Django'));
  assert.ok(skillsIn('lib/ai.js', "const { GoogleGenerativeAI } = require('@google/generative-ai');").includes('LLM integration'));
  assert.ok(skillsIn('src/x.ts', "import { initializeApp } from 'firebase/app';").includes('Firebase'));
  // `express-rate-limit` is security hardening, not Express
  const s = skillsIn('mw.js', "const rateLimit = require('express-rate-limit');");
  assert.ok(s.includes('Security hardening') && !s.includes('Express'));
});

test('path detectors: Docker, CI, tests, Terraform', () => {
  assert.ok(skillsIn('Dockerfile', 'FROM node:20').includes('Docker'));
  assert.ok(skillsIn('.github/workflows/ci.yml', 'on: push').includes('GitHub Actions / CI'));
  assert.ok(skillsIn('src/utils.test.js', 'expect(1).toBe(1)').includes('Testing'));
  assert.ok(skillsIn('infra/main.tf', 'resource "aws_s3_bucket" "b" {}').includes('Terraform'));
});

test('pattern detectors respect file scope', () => {
  assert.ok(skillsIn('Nav.jsx', '<button aria-label="Close">').includes('Accessibility'));
  assert.ok(!skillsIn('notes.md', '<button aria-label="Close">').includes('Accessibility'));
  assert.ok(skillsIn('types.ts', 'export interface User { id: string }').includes('TypeScript typing'));
  assert.ok(!skillsIn('types.js', 'export interface User { id: string }').includes('TypeScript typing'));
  assert.ok(skillsIn('a.js', '  try {').includes('Error handling'));
  // an import of 'react' mentioned in markdown is not evidence
  assert.deepStrictEqual(skillsIn('README.md', "import React from 'react'"), []);
});

test('diffUrl uses GitHub sha256 file anchors with the line', () => {
  const hash = require('crypto').createHash('sha256').update('src/a.js').digest('hex');
  assert.strictEqual(diffUrl('https://github.com/u/r/commit/abc', 'src/a.js', 3), `https://github.com/u/r/commit/abc#diff-${hash}R3`);
});

test('levelFor: volume, breadth and recency', () => {
  const now = Date.parse('2026-06-01');
  const recent = '2026-05-20';
  assert.strictEqual(levelFor({ count: 1, repos: 1, lastUsed: recent }, now), 1);
  assert.strictEqual(levelFor({ count: 8, repos: 1, lastUsed: recent }, now), 3);
  assert.strictEqual(levelFor({ count: 8, repos: 4, lastUsed: recent }, now), 4);
  assert.strictEqual(levelFor({ count: 100, repos: 9, lastUsed: recent }, now), 5);
  assert.strictEqual(levelFor({ count: 8, repos: 1, lastUsed: '2025-01-01' }, now), 2);
  assert.strictEqual(levelFor({ count: 1, repos: 1, lastUsed: '2020-01-01' }, now), 1);
});

const commit = (repo, sha, date, files) => ({ repo, sha, date, url: `https://github.com/u/${repo}/commit/${sha}`, files });

test('buildSkills aggregates commits, repos and spreads evidence across repos', () => {
  const react = { filename: 'src/A.jsx', patch: patch("import React from 'react';") };
  const commits = [
    ...Array.from({ length: 6 }, (_, i) => commit('one', `a${i}`.padEnd(40, '0'), `2026-05-${10 + i}`, [react])),
    commit('two', 'b'.padEnd(40, '0'), '2026-05-01', [react, { filename: 'yarn.lock', patch: patch('react@18') }]),
  ];
  const cats = buildSkills(commits, Date.parse('2026-06-01'));
  const r = cats.find((c) => c.name === 'Frontend').skills.find((s) => s.name === 'React');
  assert.strictEqual(r.evidenceCount, 7);
  assert.deepStrictEqual(r.repos.sort(), ['one', 'two']);
  assert.strictEqual(r.evidence.length, 5);
  assert.ok(r.evidence.some((e) => e.repo === 'two'), 'older repo still represented');
  assert.strictEqual(r.evidence[0].sha.length, 7);
  assert.ok(r.evidence[0].snippet.length <= 120);
  assert.deepStrictEqual(cats.map((c) => c.name), ['Languages', 'Frontend']);
});

const cats = (counts) => [{ name: 'Mixed', skills: [] }, ...Object.entries(counts).map(([cat, skills]) =>
  ({ name: cat, skills: Object.entries(skills).map(([name, evidenceCount]) => ({ name, evidenceCount, level: 3, repos: ['r'] })) }))];

test('gap rules', () => {
  const ids = (c, total = 40) => findGaps(cats(c), total).map((g) => g.id);
  assert.deepStrictEqual(ids({ Languages: { JavaScript: 20 }, Frontend: { React: 12 } }), ['tests-frontend', 'ci', 'typescript', 'a11y']);
  assert.deepStrictEqual(ids({ Languages: { TypeScript: 20 }, Frontend: { React: 12, Accessibility: 4 }, 'Testing & Quality': { Testing: 3 }, 'DevOps & Cloud': { 'GitHub Actions / CI': 1 } }), []);
  assert.deepStrictEqual(ids({ Languages: { Python: 20 }, Backend: { FastAPI: 9 } }), ['tests', 'ci', 'security', 'docker']);
  assert.deepStrictEqual(ids({ Languages: { Python: 2 } }, 3), []); // too little evidence to judge
  assert.ok(findGaps(cats({ Frontend: { React: 9 } }), 40).every((g) => g.title && g.detail && g.topic && g.builds));
});

test('fallback summary only names detected skills', () => {
  const c = [{ name: 'Languages', skills: [{ name: 'Go', level: 4, evidenceCount: 9 }] }, { name: 'Backend', skills: [{ name: 'API design', level: 3, evidenceCount: 5 }] }];
  const s = fallbackSummary('Ada', c, { commits: 12, repos: 3 });
  assert.match(s, /Ada has verified, hands-on work in Go and API design, backed by 12 commits across 3 public repositories\. The deepest evidence is in Backend\./);
  assert.match(fallbackSummary('Ada', [], { commits: 0, repos: 0 }), /no detectable skill evidence/);
});

test('whyMatch cites the user\'s own evidence', () => {
  const skills = [{ name: 'JavaScript', category: 'Languages', evidenceCount: 30, level: 5 }, { name: 'React', category: 'Frontend', evidenceCount: 9, level: 4 }];
  assert.strictEqual(whyMatch({ language: 'JavaScript', labels: ['react', 'good first issue'] }, skills),
    "You've shipped JavaScript in 30 recent commits, it touches React, where you have level 4/5.");
  assert.match(whyMatch({ language: 'JavaScript', gap: { builds: 'testing' }, labels: [] }, skills), /builds testing experience, a gap/);
});

test('repoMatches accepts npm repository formats for the right repo only', () => {
  assert.ok(repoMatches({ url: 'git+https://github.com/Ada/lib.git' }, 'ada', 'lib'));
  assert.ok(repoMatches('github:ada/lib', 'ada', 'lib'));
  assert.ok(repoMatches('ada/lib', 'ada', 'lib'));
  assert.ok(!repoMatches({ url: 'https://github.com/eve/lib' }, 'ada', 'lib'));
  assert.ok(!repoMatches({ url: 'https://github.com/ada/lib-extra' }, 'ada', 'lib'));
  assert.ok(!repoMatches(undefined, 'ada', 'lib'));
});

test('publicView exposes skill data only', () => {
  const v = publicView({ uid: 'secret', email: 'a@b.c', username: 'ada', summary: 's', stats: {}, impact: {}, matches: [1], gaps: [1],
    categories: [{ name: 'Languages', skills: [{ name: 'Go', level: 2, evidenceCount: 3, repos: ['r'], lastUsed: 'x', evidence: [1, 2, 3, 4], extra: 1 }] }] });
  assert.ok(!('uid' in v) && !('email' in v) && !('matches' in v) && !('gaps' in v));
  assert.deepStrictEqual(Object.keys(v.categories[0].skills[0]).sort(), ['evidence', 'evidenceCount', 'lastUsed', 'level', 'name', 'repos']);
  assert.strictEqual(v.categories[0].skills[0].evidence.length, 3);
});
