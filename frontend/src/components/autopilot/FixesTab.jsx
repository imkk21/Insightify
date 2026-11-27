import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Card, Stat, Skeleton, ErrorMsg, EmptyState, RefreshButton } from '../UI';
import { timeAgo } from '../../utils';
import { SevBadge, RiskBadge, CopyButton, CodeBlock, AiMarkdown, ModelTag, Disabled, errMsg } from './shared';
import {
  ShieldCheck, ShieldAlert, Sparkles, Download, GitPullRequest, FileDiff, ArrowRight, ExternalLink, TriangleAlert, Package,
} from 'lucide-react';

const Pill = ({ children, title, tone = '' }) => <span title={title} className={`badge ${tone}`}>{children}</span>;

function UpgradeTable({ changes }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead className="bg-raised/60">
          <tr className="text-subtle">
            <th scope="col" className="label px-3 py-2 font-medium">Package</th>
            <th scope="col" className="label px-3 py-2 font-medium">Upgrade</th>
            <th scope="col" className="label px-3 py-2 font-medium">Severity</th>
            <th scope="col" className="label px-3 py-2 text-right font-medium">Advisories</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr key={c.package} className="border-t border-line align-top">
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[12.5px] text-fg">{c.package}</span>
                  {c.majorBump && <Pill tone="badge-warning" title="Crosses a major version: expect breaking changes">major</Pill>}
                  {c.dev && <Pill title="Dev dependency">dev</Pill>}
                  {!c.direct && <Pill tone="badge-info" title="Not declared directly in the manifest: fixed with npm update / overrides">transitive</Pill>}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 font-mono">
                <span className="text-subtle line-through decoration-line-strong">{c.from}</span>
                <ArrowRight size={11} className="mx-1.5 inline text-subtle" aria-label="to" />
                <span className="text-success">{c.to}</span>
              </td>
              <td className="px-3 py-2.5"><SevBadge s={c.severity} /></td>
              <td className="px-3 py-2.5 text-right">
                <div className="flex flex-wrap justify-end gap-x-2 gap-y-0.5">
                  {c.advisories.slice(0, 3).map((a) => (
                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer" title={a.summary} className="link font-mono text-2xs">{a.aliases?.[0] || a.id}</a>
                  ))}
                  {c.advisories.length > 3 && <span className="font-mono text-2xs text-subtle">+{c.advisories.length - 3}</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlanCard({ plan, owner, appConfigured, onSetup }) {
  const [explanation, setExplanation] = useState(plan.explanation);
  const [explaining, setExplaining] = useState(false);
  const [showExplain, setShowExplain] = useState(!!plan.explanation);
  const [showDiff, setShowDiff] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [opening, setOpening] = useState(false);
  const [pr, setPr] = useState(plan.pr);
  const [error, setError] = useState('');
  const body = { repo: plan.repo, path: plan.path };

  const explain = async () => {
    setShowExplain(true);
    if (explanation) return;
    setExplaining(true); setError('');
    try { setExplanation((await api.post('/autopilot/plans/explain', body, { timeout: 60000 })).data.explanation); }
    catch (e) { setError(errMsg(e)); setShowExplain(false); }
    finally { setExplaining(false); }
  };

  const download = async () => {
    setError('');
    try {
      const { data } = await api.get(`/autopilot/plans/${encodeURIComponent(plan.repo)}/patch`, { params: { path: plan.path }, responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = Object.assign(document.createElement('a'), { href: url, download: `${plan.repo}-${plan.target.replace(/\//g, '-')}.patch` });
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e.response?.status === 404 ? 'Nothing to patch in this manifest.' : errMsg(e)); }
  };

  const openPr = async () => {
    setOpening(true); setError('');
    try {
      setPr((await api.post('/autopilot/pr', body, { timeout: 90000 })).data.pr);
      setConfirming(false);
    } catch (e) {
      if (e.response?.status === 501) onSetup();
      setError(errMsg(e));
    } finally { setOpening(false); }
  };

  const prBlocked = !appConfigured ? 'Needs the Insightify GitHub App. See "How to enable" above.'
    : !plan.patchable ? 'No direct dependency in this manifest can be edited. Use the commands instead.' : null;
  const patched = plan.changes.filter((c) => c.patched).length;

  return (
    <Card className="animate-fade-in p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <a href={`https://github.com/${owner}/${plan.repo}`} target="_blank" rel="noreferrer" className="font-semibold text-fg hover:text-accent-hover">{plan.repo}</a>
            <span className="text-subtle">/</span>
            <span className="font-mono text-xs text-muted">{plan.path}</span>
          </div>
          <p className="mt-1 text-xs text-subtle">
            {plan.changes.length} upgrade{plan.changes.length === 1 ? '' : 's'}
            {plan.target !== plan.path && <> · patches <span className="font-mono">{plan.target}</span></>}
            {plan.diff && <> · {patched} line{patched === 1 ? '' : 's'} edited</>}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <SevBadge s={plan.severity} />
          <RiskBadge risk={plan.risk} />
        </div>
      </div>

      <div className="space-y-4 px-5 pb-5">
        <UpgradeTable changes={plan.changes} />

        <div className="overflow-hidden rounded-lg border border-line bg-bg">
          <div className="flex h-8 items-center justify-between border-b border-line px-3">
            <span className="label">Commands</span>
            <CopyButton text={plan.commands.join('\n')} label="Copy commands" className="btn-ghost h-6 px-2 text-2xs" />
          </div>
          <pre className="overflow-x-auto px-3 py-2.5 font-mono text-xs leading-5 text-fg">
            {plan.commands.map((c) => <div key={c}><span className="select-none text-subtle">$ </span>{c}</div>)}
          </pre>
        </div>

        {plan.patchError && (
          <p className="flex items-center gap-1.5 text-xs text-warning"><TriangleAlert size={13} aria-hidden="true" />{plan.patchError}</p>
        )}

        {showExplain && (
          <div className="rounded-lg border border-accent/20 bg-accent-soft p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-accent-hover"><Sparkles size={13} aria-hidden="true" /> What this upgrade means</span>
              {explanation && <ModelTag model={explanation.model} />}
            </div>
            {explaining ? (
              <div className="space-y-2" role="status" aria-label="Generating explanation"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-5/6" /><Skeleton className="h-3 w-2/3" /></div>
            ) : explanation && <AiMarkdown text={explanation.content} />}
          </div>
        )}

        {showDiff && plan.diff && <CodeBlock code={plan.diff} lang="diff" title={`${plan.target}.patch`} />}

        {error && <ErrorMsg message={error} />}

        {pr && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3.5 py-2.5 text-[13px] text-success">
            <GitPullRequest size={14} aria-hidden="true" />
            Fix PR opened:
            <a href={pr.url} target="_blank" rel="noreferrer" className="font-mono font-medium underline-offset-4 hover:underline">#{pr.number}</a>
            <span className="font-mono text-xs text-success/80">{pr.branch}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-raised/40 px-5 py-3">
        <button type="button" onClick={explanation && showExplain ? () => setShowExplain(false) : explain} disabled={explaining} className="btn-secondary btn-sm" aria-expanded={showExplain}>
          <Sparkles size={13} aria-hidden="true" /> {explaining ? 'Explaining…' : showExplain && explanation ? 'Hide explanation' : 'Explain changes'}
        </button>
        {plan.diff ? (
          <>
            <button type="button" onClick={() => setShowDiff(!showDiff)} className="btn-ghost btn-sm" aria-expanded={showDiff}>
              <FileDiff size={13} aria-hidden="true" /> {showDiff ? 'Hide diff' : 'View diff'}
            </button>
            <button type="button" onClick={download} className="btn-ghost btn-sm"><Download size={13} aria-hidden="true" /> Download patch</button>
          </>
        ) : (
          <Disabled reason={plan.patchError || 'Nothing in this manifest can be edited automatically'}>
            <button type="button" disabled className="btn-ghost btn-sm opacity-50"><Download size={13} aria-hidden="true" /> Download patch</button>
          </Disabled>
        )}

        <div className="ml-auto flex items-center gap-2">
          {pr ? (
            <a href={pr.url} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">View PR #{pr.number} <ExternalLink size={12} aria-hidden="true" /></a>
          ) : prBlocked ? (
            <Disabled reason={prBlocked}>
              <button type="button" disabled className="btn-primary btn-sm opacity-40 shadow-none"><GitPullRequest size={13} aria-hidden="true" /> Open fix PR</button>
            </Disabled>
          ) : confirming ? (
            <>
              <span className="text-xs text-muted">Open a PR on <span className="font-mono text-fg">{owner}/{plan.repo}</span>?</span>
              <button type="button" onClick={() => setConfirming(false)} disabled={opening} className="btn-ghost btn-sm">Cancel</button>
              <button type="button" onClick={openPr} disabled={opening} className="btn-primary btn-sm" autoFocus>
                {opening ? 'Opening…' : 'Approve & open'}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="btn-primary btn-sm"><GitPullRequest size={13} aria-hidden="true" /> Open fix PR</button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function FixesTab({ appConfigured, onSetup }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setData((await api.get('/autopilot/plans', { timeout: 60000 })).data); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading && !data) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading fix plans">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[92px]" />)}</div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (error) return <ErrorMsg message={error} />;
  if (!data?.scannedAt) {
    return (
      <Card className="glow">
        <EmptyState icon={<ShieldAlert size={20} />} title="No security scan yet" subtitle="Autopilot builds fix plans from your latest dependency scan. Run one and come back.">
          <Link to="/security" className="btn-primary">Run a security scan</Link>
        </EmptyState>
      </Card>
    );
  }

  const { plans } = data;
  const changes = plans.flatMap((p) => p.changes);
  const count = (s) => changes.filter((c) => c.severity === s).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Fix plans" value={plans.length} hint={`across ${new Set(plans.map((p) => p.repo)).size} repositories`} />
        <Stat label="Packages" value={changes.length} hint={`${changes.filter((c) => c.majorBump).length} major bumps`} />
        <Stat label="Critical fixed" value={count('CRITICAL')} hint="by applying every plan" />
        <Stat label="High fixed" value={count('HIGH')} hint="by applying every plan" />
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-xs text-subtle">From your scan {timeAgo(data.scannedAt)} · manifests re-read from each default branch</p>
        <RefreshButton onClick={load} loading={loading} />
      </div>

      {plans.length === 0 ? (
        <Card>
          <EmptyState icon={<ShieldCheck size={20} />} title="Nothing to fix" subtitle="No vulnerable dependency in your last scan has a released fix. Autopilot will pick them up after the next scan.">
            <Link to="/security" className="btn-secondary"><Package size={14} aria-hidden="true" /> View scan</Link>
          </EmptyState>
        </Card>
      ) : plans.map((p) => (
        <PlanCard key={`${p.repo}|${p.path}`} plan={p} owner={data.owner} appConfigured={appConfigured} onSetup={onSetup} />
      ))}
    </div>
  );
}
