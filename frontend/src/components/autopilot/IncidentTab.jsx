import { useMemo, useState } from 'react';
import api from '../../services/api';
import { useGithub } from '../../hooks/useData';
import { Card, CardTitle, ErrorMsg, EmptyState, Skeleton } from '../UI';
import { timeAgo } from '../../utils';
import { AiMarkdown, ModelTag, errMsg } from './shared';
import { Siren, Sparkles, GitCommit, GitPullRequest, FileCode2, ExternalLink, CircleSlash, Package } from 'lucide-react';

const MAX = 20000;
const PLACEHOLDER = `TypeError: Cannot read properties of undefined (reading 'id')
    at getUser (/srv/app/src/services/user.js:42:17)
    at async handler (/srv/app/src/routes/users.js:18:5)`;

function Implicated({ x, index }) {
  return (
    <li className="rounded-lg border border-line bg-raised/50">
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-line-strong font-mono text-2xs text-muted">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <a href={x.url} target="_blank" rel="noreferrer" className="break-all font-mono text-xs text-fg hover:text-accent-hover">
            {x.path}<span className="text-accent-hover">:{x.line}</span>
          </a>
          {x.fn && <div className="mt-0.5 truncate font-mono text-2xs text-subtle">in {x.fn}</div>}
          {x.commit ? (
            <div className="mt-2.5 space-y-1.5 border-l border-line-strong pl-3 text-xs">
              <div className="flex items-start gap-1.5">
                <GitCommit size={13} className="mt-0.5 shrink-0 text-subtle" aria-hidden="true" />
                <span className="min-w-0">
                  <a href={x.commit.url} target="_blank" rel="noreferrer" className="link font-mono">{x.commit.short}</a>{' '}
                  <span className="text-muted">{x.commit.message}</span>
                  <span className="block text-2xs text-subtle">{x.commit.author} · {timeAgo(x.commit.date)}</span>
                </span>
              </div>
              {x.commit.pr && (
                <a href={x.commit.pr.url} target="_blank" rel="noreferrer" className="flex items-start gap-1.5 text-muted hover:text-fg">
                  <GitPullRequest size={13} className="mt-0.5 shrink-0 text-subtle" aria-hidden="true" />
                  <span><span className="font-mono">#{x.commit.pr.number}</span> {x.commit.pr.title}</span>
                </a>
              )}
            </div>
          ) : <div className="mt-2 text-2xs text-subtle">Blame unavailable for this line.</div>}
        </div>
      </div>
      {x.context.length > 0 && (
        <details className="group border-t border-line">
          <summary className="cursor-pointer list-none px-3.5 py-2 text-2xs text-subtle hover:text-fg [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show code</span><span className="hidden group-open:inline">Hide code</span>
          </summary>
          <pre className="max-h-72 overflow-auto border-t border-line bg-bg py-2 font-mono text-[11.5px] leading-5">
            {x.context.map((l) => (
              <div key={l.n} className={`flex whitespace-pre pr-3 ${l.n === x.line ? 'bg-danger-soft text-fg' : 'text-muted'}`}>
                <span className={`w-11 shrink-0 select-none pr-3 text-right ${l.n === x.line ? 'text-danger' : 'text-subtle'}`}>{l.n}</span>{l.text || ' '}
              </div>
            ))}
          </pre>
        </details>
      )}
    </li>
  );
}

function Frames({ frames }) {
  const state = (f) => (f.external ? ['dependency', <Package key="i" size={11} />] : f.path ? ['mapped', <FileCode2 key="i" size={11} />] : ['not in repo', <CircleSlash key="i" size={11} />]);
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-xs text-subtle hover:text-fg [&::-webkit-details-marker]:hidden">
        {frames.length} parsed frame{frames.length === 1 ? '' : 's'} <span className="group-open:hidden">· show</span>
      </summary>
      <ul className="mt-2 space-y-1">
        {frames.map((f) => {
          const [label, icon] = state(f);
          return (
            <li key={`${f.file}:${f.line}`} className="flex items-center gap-2 font-mono text-2xs">
              <span className={`flex items-center gap-1 ${f.path ? 'text-success' : 'text-subtle'}`} title={label}>{icon}<span className="sr-only">{label}</span></span>
              <span className={`truncate ${f.path ? 'text-muted' : 'text-subtle'}`}>{f.file}:{f.line}</span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export default function IncidentTab() {
  const github = useGithub();
  const [repo, setRepo] = useState('');
  const [trace, setTrace] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const repos = useMemo(() => {
    const gh = github.data;
    return [...new Set([...(gh?.recentCommits || []).map((c) => c.repo), ...(gh?.topRepos || []).map((r) => r.name)])].filter(Boolean);
  }, [github.data]);
  const chosenRepo = repo || repos[0] || '';

  const analyze = async (e) => {
    e?.preventDefault();
    if (!chosenRepo || !trace.trim() || loading) return;
    setLoading(true); setError(''); setResult(null);
    try { setResult((await api.post('/autopilot/incident', { repo: chosenRepo, trace }, { timeout: 90000 })).data); }
    catch (err) { setError(errMsg(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <Card className="glow xl:col-span-2 xl:self-start">
        <CardTitle icon={<Siren size={15} />} title="Incident copilot" subtitle="Paste an error. Autopilot maps each frame to your repo, blames the lines and proposes a fix." />
        <form onSubmit={analyze} className="space-y-4">
          <div>
            <label htmlFor="ap-repo" className="label mb-1.5 block">Repository</label>
            <input id="ap-repo" list="ap-repos" value={repo} onChange={(e) => setRepo(e.target.value.trim())}
              placeholder={repos[0] || 'repository-name'} className="input font-mono" autoComplete="off" spellCheck={false} />
            <datalist id="ap-repos">{repos.map((r) => <option key={r} value={r} />)}</datalist>
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor="ap-trace" className="label">Error or stack trace</label>
              <span className={`font-mono text-2xs ${trace.length > MAX ? 'text-danger' : 'text-subtle'}`}>{trace.length.toLocaleString()} / {MAX.toLocaleString()}</span>
            </div>
            <textarea id="ap-trace" value={trace} onChange={(e) => setTrace(e.target.value)} rows={14} spellCheck={false}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyze(e); }}
              placeholder={PLACEHOLDER} className="input resize-y font-mono text-xs leading-5" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-2xs text-subtle">JS/TS, Python, Java, Go, Ruby, PHP, .NET</span>
            <button type="submit" disabled={loading || !chosenRepo || !trace.trim() || trace.length > MAX} className="btn-primary">
              <Sparkles size={14} aria-hidden="true" /> {loading ? 'Analyzing…' : 'Analyze'} <span className="kbd ml-1 border-white/20 bg-white/10 text-white/80">Ctrl ↵</span>
            </button>
          </div>
        </form>
      </Card>

      <div className="space-y-4 xl:col-span-3">
        {error && <ErrorMsg message={error} />}
        {loading ? (
          <Card>
            <div role="status" aria-label="Analyzing incident" className="space-y-3">
              <p className="text-xs text-subtle">Mapping frames to files, blaming lines, asking the model…</p>
              <Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-5/6" /><Skeleton className="h-3 w-2/3" /><Skeleton className="h-24" />
            </div>
          </Card>
        ) : result ? (
          <>
            <Card>
              <CardTitle icon={<FileCode2 size={15} />} title="Implicated lines"
                subtitle={`${result.owner}/${result.repo} · default branch`}
                action={<a href={`https://github.com/${result.owner}/${result.repo}`} target="_blank" rel="noreferrer" className="btn-ghost btn-icon h-7 w-7" aria-label="Open repository"><ExternalLink size={13} /></a>} />
              {result.implicated.length ? (
                <ol className="space-y-2.5">{result.implicated.map((x, i) => <Implicated key={`${x.path}:${x.line}`} x={x} index={i} />)}</ol>
              ) : <p className="text-[13px] text-subtle">No frame matched a file in this repository.</p>}
              {result.frames.length > 0 && <div className="mt-4 border-t border-line pt-3"><Frames frames={result.frames} /></div>}
            </Card>
            <Card>
              <CardTitle icon={<Sparkles size={15} />} title="Analysis" action={<ModelTag model={result.model} />} />
              <AiMarkdown text={result.analysis} />
            </Card>
          </>
        ) : (
          <Card className="flex min-h-[360px] items-center justify-center">
            <EmptyState icon={<Siren size={20} />} title="Waiting for a stack trace"
              subtitle="You'll get the implicated files, the commit and PR that last touched each line, and a suggested fix as a diff." />
          </Card>
        )}
      </div>
    </div>
  );
}
