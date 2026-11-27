import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { PageHeader, Card, CardTitle, Stat, Progress, Skeleton, ErrorMsg, EmptyState } from '../components/UI';
import Markdown from '../components/Markdown';
import HotspotMap from '../components/codebase/HotspotMap';
import { HotspotTable, KnowledgeMap, CouplingList, authorColors } from '../components/codebase/Panels';
import { timeAgo } from '../utils';
import { Radar, Search, Star, Flame, Users, GitMerge, Sparkles, ArrowLeft, RefreshCw, ExternalLink, FolderTree } from 'lucide-react';

const errMsg = (e) => e.response?.data?.error || e.message;

const STEPS = [
  [0, 'Reading repository metadata…'],
  [3, 'Mining commit history (up to 200 commits)…'],
  [14, 'Measuring file size and complexity…'],
  [22, 'Scoring hotspots, ownership and change coupling…'],
];
const EXPECTED_SECONDS = 30;

function RepoPicker({ repos, onPick }) {
  const [q, setQ] = useState('');
  const shown = repos.filter((r) => `${r.name} ${r.description || ''} ${r.language || ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Card>
      <CardTitle title="Pick a repository" subtitle="Your public, non-fork repositories, most recently pushed first." icon={<FolderTree size={15} />} />
      <div className="relative mb-4">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" aria-hidden="true" />
        <label htmlFor="repo-search" className="sr-only">Search repositories</label>
        <input id="repo-search" className="input pl-9" placeholder="Search repositories…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      {shown.length ? (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => (
            <li key={r.name}>
              <button onClick={() => onPick(r.name)}
                className="card-hover flex h-full w-full flex-col rounded-lg border border-line bg-surface p-3.5 text-left">
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="truncate font-mono text-[13px] font-medium text-fg">{r.name}</span>
                  {r.analysedAt && <span className="badge badge-accent shrink-0">analysed</span>}
                </span>
                <span className="mt-1 line-clamp-2 text-xs text-subtle">{r.description || 'No description'}</span>
                <span className="mt-auto flex items-center gap-3 pt-3 text-2xs text-subtle">
                  {r.language && <span>{r.language}</span>}
                  <span className="flex items-center gap-1"><Star size={11} aria-hidden="true" />{r.stars ?? 0}</span>
                  {r.pushedAt && <span>pushed {timeAgo(r.pushedAt)}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="py-6 text-center text-[13px] text-subtle">No repositories match “{q}”.</p>}
    </Card>
  );
}

function Analyzing({ repo }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const step = STEPS.filter(([t]) => secs >= t).pop()[1];
  return (
    <Card className="glow">
      <div role="status" className="mx-auto max-w-md py-10 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-line-strong bg-raised text-accent-hover shadow-glow">
          <Radar size={22} className="animate-pulse" />
        </div>
        <div className="font-medium text-fg">X-raying <span className="font-mono">{repo}</span></div>
        <div className="mt-1 text-[13px] text-muted">{step}</div>
        <div className="mt-5"><Progress value={Math.min(95, (secs / EXPECTED_SECONDS) * 100)} /></div>
        <div className="mt-2 font-mono text-2xs text-subtle">{secs}s · usually under a minute</div>
      </div>
    </Card>
  );
}

function Tour({ repo, generatedAt }) {
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = (refresh) => {
    setLoading(true); setError('');
    api.get(`/codebase/${encodeURIComponent(repo)}/tour`, { params: refresh ? { refresh: 1 } : {}, timeout: 60000 })
      .then(({ data }) => setTour(data.tour))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  };
  useEffect(() => { setTour(null); load(false); }, [repo, generatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="glow">
      <CardTitle title="5-minute repo tour" icon={<Sparkles size={15} />}
        subtitle={tour ? `${tour.model === 'fallback-template' ? 'Template' : 'AI'} · ${timeAgo(tour.generatedAt)}` : 'What it does, how it fits together, where to start.'}
        action={(
          <button className="btn-ghost btn-sm" onClick={() => load(true)} disabled={loading} aria-label="Regenerate tour">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Regenerate
          </button>
        )} />
      {error && <ErrorMsg message={error} />}
      {loading && !tour ? (
        <div className="space-y-2.5" aria-label="Writing the tour">
          {[100, 92, 70, 0, 85, 95, 60].map((w, i) => (w ? <div key={i} className="h-3 animate-pulse rounded-lg bg-raised" style={{ width: `${w}%` }} /> : <div key={i} className="h-2" />))}
        </div>
      ) : tour && (
        <>
          {tour.stack?.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">{tour.stack.map((s) => <span key={s} className="badge font-mono">{s}</span>)}</div>
          )}
          <div className="text-muted [&_h3]:mt-2 [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-fg [&_strong]:font-medium [&_strong]:text-fg">
            <Markdown text={tour.content} />
          </div>
        </>
      )}
    </Card>
  );
}

function Report({ report }) {
  const t = report.totals;
  const colorOf = useMemo(() => authorColors(report.contributors), [report.contributors]);
  const avatars = useMemo(() => Object.fromEntries(report.contributors.map((c) => [c.name, c.avatar])), [report.contributors]);
  const busTone = t.busFactor <= 1 ? 'text-danger' : t.busFactor === 2 ? 'text-warning' : 'text-fg';
  const siloDirs = report.knowledge.filter((d) => d.silo).length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Commits analysed" value={t.commits}
          hint={t.since ? `since ${new Date(t.since).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}${t.mergesSkipped ? ` · ${t.mergesSkipped} merges skipped` : ''}` : 'no history'} />
        <Stat label="Files" value={t.files.toLocaleString()} hint={`${t.codeFiles.toLocaleString()} source · ${t.filesChanged} recently changed`} />
        <Stat label="Bus factor" value={<span className={busTone}>{t.busFactor}</span>}
          hint={t.busFactor <= 1 ? 'One person made half of all changes' : 'Authors covering half of all changes'} />
        <Stat label="Contributors" value={t.contributors} hint={siloDirs ? `${siloDirs} director${siloDirs === 1 ? 'y is a' : 'ies are'} knowledge silo${siloDirs === 1 ? '' : 's'}` : 'No directory silos'} />
      </div>

      <Card>
        <CardTitle title="Hotspot map" icon={<Flame size={15} />}
          subtitle={`The ${report.files.length} most-changed source files. Big and bright means complex code that keeps changing: refactor there first.`} />
        <HotspotMap files={report.files} hotspots={report.hotspots} totalCommits={t.commits} />
      </Card>

      <Card>
        <CardTitle title="Hotspots" icon={<Flame size={15} />} subtitle="Ranked by change frequency × complexity." />
        <HotspotTable hotspots={report.hotspots} avatars={avatars} colorOf={colorOf} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle title="Knowledge map" icon={<Users size={15} />} subtitle="Who wrote each top-level directory. Silo = one person wrote ≥80%." />
          <KnowledgeMap knowledge={report.knowledge} contributors={report.contributors} colorOf={colorOf} />
        </Card>
        <Card>
          <CardTitle title="Change coupling" icon={<GitMerge size={15} />} subtitle="Files that keep changing together: hidden dependencies." />
          <CouplingList coupling={report.coupling} />
        </Card>
      </div>

      <Tour repo={report.repo} generatedAt={report.generatedAt} />
    </div>
  );
}

export default function CodebasePage() {
  const [params, setParams] = useSearchParams();
  const repo = params.get('repo');
  const [repos, setRepos] = useState(null);
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const current = useRef(repo);
  current.current = repo;

  useEffect(() => {
    api.get('/codebase/repos', { timeout: 30000 })
      .then(({ data }) => setRepos(data.repos))
      .catch((e) => { setRepos([]); setError(errMsg(e)); });
  }, []);

  useEffect(() => {
    setReport(null); setError('');
    if (!repo) return;
    setLoadingReport(true);
    api.get(`/codebase/${encodeURIComponent(repo)}`, { params: { cached: 1 } })
      .then(({ data }) => current.current === repo && setReport(data.report))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoadingReport(false));
  }, [repo]);

  const analyze = async () => {
    const target = repo;
    setAnalyzing(true); setError('');
    try {
      const { data } = await api.get(`/codebase/${encodeURIComponent(target)}`, { params: { refresh: 1 }, timeout: 150000 });
      if (current.current === target) setReport(data.report);
    } catch (e) { setError(errMsg(e)); } finally { setAnalyzing(false); }
  };

  const pick = (name) => setParams(name ? { repo: name } : {});
  const notConnected = /connect github/i.test(error);
  const meta = repos?.find((r) => r.name === repo);

  return (
    <div>
      <PageHeader eyebrow="Engineering" title={repo ? <span className="font-mono">{repo}</span> : 'Codebase X-ray'}
        subtitle={repo
          ? (report ? `Analysed ${timeAgo(report.generatedAt)} · ${report.branch} · ${report.language || 'unknown language'}` : meta?.description || 'Hotspots, bus factor and an AI tour.')
          : 'Find the code that hurts: hotspots, knowledge silos, hidden coupling and a 5-minute tour of any of your repositories.'}>
        {repo && (
          <>
            <button className="btn-ghost" onClick={() => pick(null)} disabled={analyzing}><ArrowLeft size={14} /> All repos</button>
            {report?.url && <a className="btn-secondary" href={report.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> GitHub</a>}
            <button className="btn-primary" onClick={analyze} disabled={analyzing || loadingReport}>
              <Radar size={14} /> {analyzing ? 'Analysing…' : report ? 'Re-analyse' : 'Analyse'}
            </button>
          </>
        )}
      </PageHeader>

      {error && !notConnected && <div className="mb-4"><ErrorMsg message={error} /></div>}

      {notConnected ? (
        <Card>
          <EmptyState icon={<Radar size={20} />} title="Connect GitHub to X-ray your code" subtitle="Codebase X-ray analyses repositories on your connected GitHub account.">
            <Link to="/activity" className="btn-primary">Connect GitHub</Link>
          </EmptyState>
        </Card>
      ) : !repo ? (
        repos ? (repos.length ? <RepoPicker repos={repos} onPick={pick} />
          : !error && <Card><EmptyState icon={<FolderTree size={20} />} title="No repositories" subtitle="Push a public repository to GitHub to analyse it." /></Card>)
          : <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : analyzing ? <Analyzing repo={repo} />
        : loadingReport ? <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
        : report ? <Report report={report} />
        : (
          <Card className="glow">
            <EmptyState icon={<Radar size={20} />} title={`X-ray ${repo}`}
              subtitle="Mines the last 200 commits for churn, ownership and coupling, measures complexity of the busiest files, then writes a guided tour. Takes up to a minute.">
              <button className="btn-primary" onClick={analyze}><Radar size={14} /> Analyse repository</button>
            </EmptyState>
          </Card>
        )}
    </div>
  );
}
