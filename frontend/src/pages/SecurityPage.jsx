import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { securityAPI } from '../services/api';
import { PageHeader, Card, CardTitle, Stat, Loader, Skeleton, EmptyState, ErrorMsg } from '../components/UI';
import { timeAgo } from '../utils';
import { ShieldCheck, ShieldAlert, ExternalLink, GitBranch, ChevronRight, ScanLine } from 'lucide-react';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
const SEV_BADGE = { CRITICAL: 'badge-danger', HIGH: 'badge-danger', MODERATE: 'badge-warning', LOW: 'badge-info', UNKNOWN: '' };
const SEV_DOT = { CRITICAL: 'bg-danger shadow-[0_0_8px_#f2555a]', HIGH: 'bg-danger', MODERATE: 'bg-warning', LOW: 'bg-info' };
const title = (s) => s.charAt(0) + s.slice(1).toLowerCase();
const SevBadge = ({ s }) => <span className={`badge ${SEV_BADGE[s] ?? ''}`}>{title(s)}</span>;
const PAGE = 40;

function Finding({ f }) {
  return (
    <details className="group rounded-lg border border-line bg-raised/40 transition-colors open:bg-raised/70 hover:border-line-strong">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronRight size={14} className="shrink-0 text-subtle transition-transform group-open:rotate-90" aria-hidden="true" />
        <SevBadge s={f.severity} />
        <span className="font-mono text-[13px] text-fg">{f.package}<span className="text-subtle">@{f.version}</span></span>
        <span className="text-[13px]">
          {f.fixedIn
            ? <span className="text-muted">→ upgrade to <span className="font-mono text-success">{f.fixedIn}</span></span>
            : <span className="text-subtle">No fix released yet</span>}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-2 font-mono text-2xs text-subtle">
          {f.dev && <span className="badge">dev</span>}
          {f.approximate && <span className="badge" title="No lockfile: version estimated from the declared range">approx.</span>}
          <span className="truncate">{f.repo}/{f.path}</span>
          <span>· {f.advisories.length} advisor{f.advisories.length === 1 ? 'y' : 'ies'}</span>
        </span>
      </summary>
      <ul className="space-y-2 border-t border-line px-4 py-3 pl-11">
        {f.advisories.map((a) => (
          <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
            <SevBadge s={a.severity} />
            <a href={a.url} target="_blank" rel="noreferrer" className="link font-mono text-xs">{a.aliases[0] || a.id}</a>
            <span className="min-w-0 flex-1 text-muted">{a.summary}</span>
            <span className="font-mono text-2xs text-subtle">{a.fixedIn ? `fixed in ${a.fixedIn}` : 'no fix yet'}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function SecurityPage() {
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [severity, setSeverity] = useState('ALL');
  const [repo, setRepo] = useState('ALL');
  const [showDev, setShowDev] = useState(true);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    securityAPI.get()
      .then(({ data }) => setScan(data.scan))
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  const runScan = async () => {
    setScanning(true); setError('');
    try {
      const { data } = await securityAPI.scan();
      setScan(data.scan);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setScanning(false); }
  };

  const findings = useMemo(() => (scan?.findings || []).filter((f) =>
    (severity === 'ALL' || f.severity === severity) && (repo === 'ALL' || f.repo === repo) && (showDev || !f.dev)
  ), [scan, severity, repo, showDev]);

  useEffect(() => setLimit(PAGE), [severity, repo, showDev]);

  const notConnected = /Connect GitHub/.test(error);
  const t = scan?.totals;

  return (
    <div>
      <PageHeader eyebrow="Engineering" title="Security" subtitle="Known vulnerabilities in your repositories' dependencies, checked against OSV.dev.">
        {scan && <span className="font-mono text-xs text-subtle">scanned {timeAgo(scan.scannedAt)}</span>}
        {scan && (
          <button onClick={runScan} disabled={scanning} className="btn-secondary">
            <ScanLine size={14} aria-hidden="true" /> {scanning ? 'Scanning…' : 'Scan again'}
          </button>
        )}
      </PageHeader>

      {error && !notConnected && <div className="mb-6"><ErrorMsg message={error} /></div>}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : scanning ? (
        <Card className="glow"><Loader label="Scanning your 15 most recent repositories… this takes about 30 seconds." /></Card>
      ) : notConnected ? (
        <Card className="mx-auto max-w-lg">
          <EmptyState icon={<GitBranch size={20} />} title="Connect GitHub first" subtitle="The scan reads the dependency files in your public repositories.">
            <Link to="/activity" className="btn-primary">Connect GitHub</Link>
          </EmptyState>
        </Card>
      ) : !scan ? (
        <Card className="glow mx-auto max-w-xl">
          <EmptyState icon={<ShieldCheck size={20} />} title="Check your dependencies"
            subtitle="Reads package-lock.json, package.json, requirements.txt and go.mod in your 15 most recent public repositories and checks every version against the OSV vulnerability database. Then it re-scans automatically every Monday.">
            <button onClick={runScan} className="btn-primary"><ScanLine size={14} aria-hidden="true" /> Scan my repositories</button>
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {SEVERITIES.map((s) => {
              const active = severity === s;
              const hot = (s === 'CRITICAL' || s === 'HIGH') && t.bySeverity[s];
              return (
                <button key={s} onClick={() => setSeverity(active ? 'ALL' : s)} aria-pressed={active}
                  className={`card card-hover text-left ${active ? 'border-accent/60 ring-1 ring-accent/60' : ''}`}>
                  <div className="label flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${SEV_DOT[s]}`} aria-hidden="true" />{title(s)}</div>
                  <div className={`mt-2 font-mono text-2xl font-semibold tracking-tight ${hot ? 'text-danger' : 'text-fg'}`}>{t.bySeverity[s]}</div>
                  <div className="mt-1 text-xs text-subtle">vulnerable packages</div>
                </button>
              );
            })}
            <Stat label="Dependencies" value={t.dependencies} hint="unique versions checked" />
            <Stat label="Repositories" value={t.scannedRepos} hint={`of ${t.repos} had dependency files`} />
          </div>

          {t.findings === 0 ? (
            <Card className="mb-4">
              <EmptyState icon={<ShieldCheck size={20} className="text-success" />} title="No known vulnerabilities" subtitle="Every dependency version we found is clear in OSV.dev." />
            </Card>
          ) : (
            <Card className="mb-4">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="mr-auto text-[13px] font-semibold">
                  <span className="font-mono">{findings.length}</span> vulnerable package{findings.length === 1 ? '' : 's'}
                  {severity !== 'ALL' && <button onClick={() => setSeverity('ALL')} className="badge badge-accent ml-2 align-middle">{title(severity)} ✕</button>}
                </h2>
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted">
                  <input type="checkbox" checked={showDev} onChange={(e) => setShowDev(e.target.checked)} className="h-3.5 w-3.5 accent-accent" />
                  Include dev dependencies
                </label>
                <label htmlFor="repo-filter" className="sr-only">Repository</label>
                <select id="repo-filter" value={repo} onChange={(e) => setRepo(e.target.value)} className="input w-auto">
                  <option value="ALL">All repositories</option>
                  {scan.repos.filter((r) => r.findings).map((r) => <option key={r.name} value={r.name}>{r.name} ({r.findings})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                {findings.slice(0, limit).map((f) => <Finding key={`${f.repo}|${f.path}|${f.package}|${f.version}`} f={f} />)}
              </div>
              {findings.length > limit && (
                <button onClick={() => setLimit(limit + PAGE)} className="btn-secondary mt-4 w-full">Show {Math.min(PAGE, findings.length - limit)} more</button>
              )}
            </Card>
          )}

          <Card>
            <CardTitle title="Coverage" subtitle="Which files were checked in each repository" />
            <ul className="divide-y divide-line">
              {scan.repos.map((r) => (
                <li key={r.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-[13px]">
                  {r.findings
                    ? <ShieldAlert size={14} className="text-danger" aria-label="Has findings" />
                    : <ShieldCheck size={14} className="text-success" aria-label="Clear" />}
                  <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-fg hover:text-accent-hover">
                    {r.name} <ExternalLink size={11} aria-hidden="true" />
                  </a>
                  <span className="min-w-0 font-mono text-2xs text-subtle">
                    {r.manifests.length
                      ? r.manifests.map((m) => `${m.path} (${m.error ? 'unreadable' : m.deps ? `${m.deps} deps` : 'no pinned versions'})`).join(' · ')
                      : 'No supported dependency file'}
                  </span>
                  {r.findings > 0 && (
                    <button onClick={() => { setRepo(r.name); setSeverity('ALL'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="link ml-auto text-xs">
                      {r.findings} finding{r.findings === 1 ? '' : 's'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
