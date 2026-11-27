import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Card, ErrorMsg, EmptyState, Skeleton, RefreshButton } from '../UI';
import { Disabled, errMsg } from './shared';
import { GitBranch, GitPullRequest, CircleDot, Trash2, XCircle, ExternalLink, PartyPopper, Check } from 'lucide-react';

const STORE = 'autopilot-chores-done';
const readDone = () => { try { return new Set(JSON.parse(localStorage.getItem(STORE) || '[]')); } catch { return new Set(); } };
const NO_WRITE = 'Read-only: Autopilot only reads public data today. Deleting and closing will need write access through the Insightify GitHub App.';

const GROUPS = [
  { key: 'staleBranches', title: 'Stale branches', hint: 'No commits in 60+ days', icon: GitBranch, action: ['Delete', Trash2],
    label: (x) => x.name, meta: (x) => `last commit ${x.days}d ago` },
  { key: 'oldPrs', title: 'Pull requests waiting', hint: 'Open for more than 14 days', icon: GitPullRequest, action: ['Close', XCircle],
    label: (x) => x.title, meta: (x) => `#${x.number}${x.author ? ` by ${x.author}` : ''}${x.draft ? ' · draft' : ''}` },
  { key: 'unansweredIssues', title: 'Issues with no reply', hint: 'Open, zero comments', icon: CircleDot, action: ['Close', XCircle],
    label: (x) => x.title, meta: (x) => `#${x.number}${x.author ? ` by ${x.author}` : ''}` },
];

function Group({ group, items, done, toggle }) {
  const Icon = group.icon;
  const [actionLabel, ActionIcon] = group.action;
  const remaining = items.filter((x) => !done.has(x.url)).length;
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Icon size={15} className="text-subtle" aria-hidden="true" />
          <h2 className="text-[13px] font-semibold">{group.title}</h2>
          <span className="text-xs text-subtle">{group.hint}</span>
        </div>
        <span className={`badge font-mono ${remaining ? 'badge-accent' : 'badge-success'}`}>{remaining} / {items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-5 py-4 text-[13px] text-subtle"><Check size={14} className="text-success" aria-hidden="true" /> Nothing here.</p>
      ) : (
        <ul>
          {items.map((x) => {
            const isDone = done.has(x.url);
            const id = `chore-${group.key}-${x.repo}-${x.number ?? x.name}`;
            return (
              <li key={x.url} className="group flex items-center gap-3 border-t border-line px-5 py-2.5 first:border-0 hover:bg-raised/50">
                <input id={id} type="checkbox" checked={isDone} onChange={() => toggle(x.url)} className="h-3.5 w-3.5 shrink-0 accent-accent" />
                <label htmlFor={id} className={`min-w-0 flex-1 cursor-pointer ${isDone ? 'opacity-40' : ''}`}>
                  <span className={`block truncate text-[13px] ${group.key === 'staleBranches' ? 'font-mono text-xs' : ''} ${isDone ? 'line-through' : 'text-fg'}`}>{group.label(x)}</span>
                  <span className="block truncate text-2xs text-subtle"><span className="font-mono">{x.repo}</span> · {group.meta(x)}</span>
                </label>
                <span className="hidden shrink-0 font-mono text-2xs text-subtle sm:inline">{x.days}d</span>
                <a href={x.url} target="_blank" rel="noreferrer" className="btn-ghost btn-icon h-7 w-7 shrink-0" aria-label={`Open ${group.label(x)} on GitHub`}>
                  <ExternalLink size={13} />
                </a>
                <Disabled reason={NO_WRITE}>
                  <button type="button" disabled className="btn-ghost btn-sm shrink-0 opacity-40"><ActionIcon size={12} aria-hidden="true" /> {actionLabel}</button>
                </Disabled>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default function ChoresTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [done, setDone] = useState(readDone);

  const load = async () => {
    setLoading(true); setError('');
    try { setData((await api.get('/autopilot/chores', { timeout: 30000 })).data); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggle = (url) => {
    const next = new Set(done);
    if (next.has(url)) next.delete(url); else next.add(url);
    setDone(next);
    try { localStorage.setItem(STORE, JSON.stringify([...next])); } catch { /* storage blocked: keep in memory */ }
  };

  if (loading && !data) return <div className="space-y-4" role="status" aria-label="Loading chores">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>;
  if (error) return <ErrorMsg message={error} />;

  const total = GROUPS.reduce((n, g) => n + data[g.key].length, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-subtle">
          Housekeeping across your {data.repos.length} most recently pushed repositories. Tick items off as you handle them.
        </p>
        <RefreshButton onClick={load} loading={loading} />
      </div>
      {total === 0 ? (
        <Card><EmptyState icon={<PartyPopper size={20} />} title="All tidy" subtitle="No stale branches, waiting PRs or unanswered issues." /></Card>
      ) : GROUPS.map((g) => <Group key={g.key} group={g} items={data[g.key]} done={done} toggle={toggle} />)}
    </div>
  );
}
