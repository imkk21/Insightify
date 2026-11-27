import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { securityAPI } from '../services/api';
import { PageHeader, Card, CardTitle, Loader, EmptyState, ErrorMsg } from '../components/UI';
import { timeAgo } from '../utils';
import { ShieldCheck, ShieldAlert, ExternalLink, GitBranch } from 'lucide-react';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
const SEV_STYLE = {
  CRITICAL: 'bg-error text-white',
  HIGH: 'bg-error/10 text-error',
  MODERATE: 'bg-warm text-plum',
  LOW: 'bg-white text-olive',
  UNKNOWN: 'bg-white text-olive',
};
const SevBadge = ({ s }) => <span className={`badge ${SEV_STYLE[s]}`}>{s.charAt(0) + s.slice(1).toLowerCase()}</span>;
const PAGE = 40;

function Finding({ f }) {
  return (
    <details className="group rounded-sm bg-white">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <SevBadge s={f.severity} />
        <span className="font-bold">{f.package}<span className="font-normal text-olive">@{f.version}</span></span>
        <span className="text-sm">
          {f.fixedIn ? <>Upgrade to <strong>{f.fixedIn}</strong></> : <span className="text-olive">No fix released yet</span>}
        </span>
        <span className="ml-auto flex items-center gap-2 text-xs text-olive">
          {f.dev && <span className="badge bg-fog">dev</span>}
          {f.approximate && <span className="badge bg-fog" title="No lockfile: version estimated from the declared range">approx.</span>}
          <span>{f.repo}/{f.path}</span>
          <span>· {f.advisories.length} advisor{f.advisories.length === 1 ? 'y' : 'ies'}</span>
        </span>
      </summary>
      <ul className="space-y-2 border-t border-sand px-4 py-3">
        {f.advisories.map((a) => (
          <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <SevBadge s={a.severity} />
            <a href={a.url} target="_blank" rel="noreferrer" className="link">{a.aliases[0] || a.id}</a>
            <span className="min-w-0 flex-1">{a.summary}</span>
            <span className="text-xs text-olive">{a.fixedIn ? `fixed in ${a.fixedIn}` : 'no fix yet'}</span>
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
      <PageHeader title="Security" subtitle="Known vulnerabilities in your repositories' dependencies, checked against OSV.dev.">
        {scan && <span className="text-sm text-olive">Scanned {timeAgo(scan.scannedAt)}</span>}
        {scan && <button onClick={runScan} disabled={scanning} className="btn-secondary">{scanning ? 'Scanning…' : 'Scan again'}</button>}
      </PageHeader>

      {error && !notConnected && <div className="mb-6"><ErrorMsg message={error} /></div>}

      {loading ? <Loader /> : scanning ? (
        <Card className="rounded-xl p-8"><Loader label="Scanning your 15 most recent repositories… this takes about 30 seconds." /></Card>
      ) : notConnected ? (
        <Card className="mx-auto max-w-lg rounded-xl">
          <EmptyState icon={<GitBranch size={22} />} title="Connect GitHub first" subtitle="The scan reads the dependency files in your public repositories.">
            <Link to="/activity" className="btn-primary">Connect GitHub</Link>
          </EmptyState>
        </Card>
      ) : !scan ? (
        <Card className="mx-auto max-w-xl rounded-xl p-8 text-center sm:p-10">
          <span className="btn-circle mx-auto h-16 w-16"><ShieldCheck size={28} aria-hidden="true" /></span>
          <h2 className="mt-5 text-section">Check your dependencies</h2>
          <p className="mt-2 text-olive">
            Reads package-lock.json, package.json, requirements.txt and go.mod in your 15 most recent public repositories
            and checks every version against the OSV vulnerability database. Then it re-scans automatically every Monday.
          </p>
          <button onClick={runScan} className="btn-primary mt-6">Scan my repositories</button>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {SEVERITIES.map((s) => (
              <button key={s} onClick={() => setSeverity(severity === s ? 'ALL' : s)} aria-pressed={severity === s}
                className={`card text-left transition-colors hover:bg-sand ${severity === s ? 'ring-2 ring-plum' : ''}`}>
                <div className="text-xs font-semibold text-olive">{s.charAt(0) + s.slice(1).toLowerCase()}</div>
                <div className={`mt-1 text-[28px] font-bold leading-tight tracking-tight ${(s === 'CRITICAL' || s === 'HIGH') && t.bySeverity[s] ? 'text-error' : ''}`}>
                  {t.bySeverity[s]}
                </div>
                <div className="mt-1 text-xs text-olive">vulnerable packages</div>
              </button>
            ))}
            <div className="card"><div className="text-xs font-semibold text-olive">Dependencies</div><div className="mt-1 text-[28px] font-bold leading-tight tracking-tight">{t.dependencies}</div><div className="mt-1 text-xs text-olive">unique versions checked</div></div>
            <div className="card"><div className="text-xs font-semibold text-olive">Repositories</div><div className="mt-1 text-[28px] font-bold leading-tight tracking-tight">{t.scannedRepos}</div><div className="mt-1 text-xs text-olive">of {t.repos} had dependency files</div></div>
          </div>

          {t.findings === 0 ? (
            <Card className="rounded-xl"><EmptyState icon={<ShieldCheck size={22} />} title="No known vulnerabilities" subtitle="Every dependency version we found is clear in OSV.dev." /></Card>
          ) : (
            <Card className="mb-10">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="mr-auto font-bold">{findings.length} vulnerable package{findings.length === 1 ? '' : 's'}</h2>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showDev} onChange={(e) => setShowDev(e.target.checked)} className="h-4 w-4 accent-plum" />
                  Include dev dependencies
                </label>
                <label htmlFor="repo-filter" className="sr-only">Repository</label>
                <select id="repo-filter" value={repo} onChange={(e) => setRepo(e.target.value)} className="input w-auto py-2 text-sm">
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
            <ul>
              {scan.repos.map((r) => (
                <li key={r.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-sand py-2.5 text-sm first:border-0">
                  {r.findings ? <ShieldAlert size={16} className="text-error" aria-label="Has findings" /> : <ShieldCheck size={16} className="text-olive" aria-label="Clear" />}
                  <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">{r.name} <ExternalLink size={12} className="inline" aria-hidden="true" /></a>
                  <span className="text-olive">
                    {r.manifests.length
                      ? r.manifests.map((m) => `${m.path} (${m.error ? 'unreadable' : m.deps ? `${m.deps} deps` : 'no pinned versions'})`).join(' · ')
                      : 'No supported dependency file'}
                  </span>
                  {r.findings > 0 && <button onClick={() => { setRepo(r.name); setSeverity('ALL'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="link ml-auto">{r.findings} finding{r.findings === 1 ? '' : 's'}</button>}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
