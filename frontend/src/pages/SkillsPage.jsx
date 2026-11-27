import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Globe, Lock, AlertTriangle, CheckCircle2, Package, Fingerprint, ExternalLink } from 'lucide-react';
import api from '../services/api';
import { PageHeader, Card, CardTitle, Skeleton, ErrorMsg, EmptyState, RefreshButton } from '../components/UI';
import SkillGraph from '../components/skills/SkillGraph';
import EvidenceDrawer from '../components/skills/EvidenceDrawer';
import Matchmaker from '../components/skills/Matchmaker';
import { timeAgo } from '../utils';

const STEPS = ['Reading up to 80 of your recent commits', 'Running skill detectors on every added line', 'Checking npm for packages you publish', 'Writing a summary from the evidence'];

function Building() {
  return (
    <Card className="glow p-8">
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden="true" />
        <span role="status" className="text-[13px] font-medium text-fg">Building your proof of skill… this can take up to a minute.</span>
      </div>
      <ol className="mt-5 space-y-2 pl-7 font-mono text-xs text-subtle">
        {STEPS.map((s, i) => <li key={s}><span className="text-accent-hover">{String(i + 1).padStart(2, '0')}</span> {s}</li>)}
      </ol>
      <div className="mt-6 grid gap-3 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>
    </Card>
  );
}

function Hero({ data }) {
  const skills = data.categories.flatMap((c) => c.skills);
  const strongest = data.categories.filter((c) => c.name !== 'Languages')
    .map((c) => ({ name: c.name, score: c.skills.reduce((a, s) => a + s.level, 0) })).sort((a, b) => b.score - a.score)[0];
  const ai = data.summaryModel && data.summaryModel !== 'fallback-template';
  return (
    <Card className="glow mb-6 grid gap-6 p-6 md:p-7 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <span className="badge badge-success"><ShieldCheck size={11} aria-hidden="true" />
          Verified from <span className="font-mono">{data.stats.commits}</span> commits across <span className="font-mono">{data.stats.repos}</span> repos
        </span>
        <p className="mt-4 text-[15px] leading-relaxed text-fg">{data.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-2xs text-subtle">
          <span className="badge">{ai ? 'AI-phrased, evidence-only' : 'Generated from evidence'}</span>
          <span>Updated {timeAgo(data.generatedAt)} · {data.stats.files.toLocaleString()} changed files analysed</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-line lg:border-l lg:pl-6">
        <dl className="grid grid-cols-2 gap-3">
          <div><dt className="label">Skills proven</dt><dd className="mt-1 font-mono text-2xl font-semibold text-fg">{skills.length}</dd></div>
          <div><dt className="label">Level 4+</dt><dd className="mt-1 font-mono text-2xl font-semibold text-fg">{skills.filter((s) => s.level >= 4).length}</dd></div>
          {strongest && <div className="col-span-2"><dt className="label">Deepest area</dt><dd className="mt-1 text-[13px] font-medium text-accent-hover">{strongest.name}</dd></div>}
        </dl>
        <div className="mt-auto rounded-lg border border-line bg-raised p-3 text-xs">
          {data.publicProfile ? (
            <>
              <div className="flex items-center gap-1.5 font-medium text-fg"><Globe size={13} aria-hidden="true" /> Shared on your public profile</div>
              <Link to={`/u/${data.username}`} className="link mt-1 inline-flex items-center gap-1 font-mono">/u/{data.username} <ExternalLink size={11} aria-hidden="true" /></Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 font-medium text-fg"><Lock size={13} aria-hidden="true" /> Private for now</div>
              <p className="mt-1 text-subtle">Turn on your public profile to share this as a résumé that can't be faked. <Link to="/settings" className="link">Settings</Link></p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function Gaps({ gaps }) {
  return (
    <Card>
      <CardTitle icon={<AlertTriangle size={15} />} title="Gaps" subtitle="What your recent commits don't show yet." />
      {!gaps.length ? (
        <div className="flex items-center gap-2 text-[13px] text-success"><CheckCircle2 size={15} aria-hidden="true" /> No obvious gaps. Well-rounded work.</div>
      ) : (
        <ul className="space-y-3">
          {gaps.map((g) => (
            <li key={g.id} className="rounded-lg border border-warning/20 bg-warning-soft px-3.5 py-3">
              <div className="text-[13px] font-medium text-warning">{g.title}</div>
              <p className="mt-0.5 text-xs text-muted">{g.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Impact({ impact }) {
  const pkgs = impact?.packages || [];
  return (
    <Card>
      <CardTitle icon={<Package size={15} />} title="Impact" subtitle="npm packages published from your repositories." />
      {!pkgs.length ? (
        <p className="text-[13px] text-subtle">No npm packages found. We match each repo's package.json against the npm registry, and only count packages whose repository points back to you.</p>
      ) : (
        <>
          <p className="text-[13px] text-muted">Your code was downloaded</p>
          <div className="mt-1 font-mono text-[34px] font-semibold leading-none tracking-tight text-fg">{impact.totalDownloads.toLocaleString()}</div>
          <p className="mt-1 text-xs text-subtle">times last month</p>
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {pkgs.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-3 py-2">
                <a href={p.url} target="_blank" rel="noreferrer" className="link truncate font-mono text-xs">{p.name}</a>
                <span className="shrink-0 font-mono text-2xs text-subtle">{p.downloads.toLocaleString()}/mo · v{p.version}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export default function SkillsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const close = useCallback(() => setSelected(null), []);

  const load = useCallback(async (refresh) => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/skills', { params: refresh ? { refresh: 1 } : {}, timeout: 120000 });
      setData(res.data);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(false); }, [load]);

  const notConnected = /Connect GitHub/.test(error);

  return (
    <div>
      <PageHeader eyebrow="Proof of skill" title="A résumé that can't be faked"
        subtitle="Every skill below is detected from real lines in your own commits, and links to the code that proves it.">
        {data && <RefreshButton onClick={() => load(true)} loading={loading} label="Rebuild" />}
      </PageHeader>

      {error && !notConnected && <div className="mb-6"><ErrorMsg message={error} /></div>}

      {notConnected ? (
        <Card className="glow mx-auto max-w-lg">
          <EmptyState icon={<Fingerprint size={22} />} title="Connect GitHub first" subtitle="Proof of skill reads your public commits to find evidence of what you can do.">
            <Link to="/activity" className="btn-primary">Connect GitHub</Link>
          </EmptyState>
        </Card>
      ) : loading && !data ? <Building /> : data && (
        <>
          <Hero data={data} />

          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold text-fg">Skill graph</h2>
              <p className="text-xs text-subtle">Level from commit volume, breadth across repos and recency. Click a skill to see its evidence.</p>
            </div>
            <span className="font-mono text-2xs text-subtle">c = commits · r = repos</span>
          </div>
          {data.categories.length ? (
            <SkillGraph categories={data.categories} onSelect={setSelected} selected={selected} />
          ) : (
            <Card className="mb-4"><EmptyState title="No evidence yet" subtitle="We couldn't find recent commits authored by you in your public repositories." /></Card>
          )}

          <div className="mt-2 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div className="grid gap-4">
              <Gaps gaps={data.gaps || []} />
              <Impact impact={data.impact} />
            </div>
            <Matchmaker />
          </div>
        </>
      )}
      <EvidenceDrawer skill={selected} onClose={close} />
    </div>
  );
}
