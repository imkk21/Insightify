import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Card, ErrorMsg, EmptyState, Skeleton } from '../UI';
import { timeAgo } from '../../utils';
import { errMsg } from './shared';
import { GitPullRequest, Sparkles, Siren, History } from 'lucide-react';

const TYPES = {
  'fix-pr': [GitPullRequest, 'Fix PR'],
  explain: [Sparkles, 'Explained upgrade'],
  incident: [Siren, 'Incident analysis'],
};

function Entry({ a }) {
  const [Icon, label] = TYPES[a.type] || [History, a.type];
  const failed = a.status === 'failed';
  const r = a.result || {};
  return (
    <li className="relative flex gap-3.5 pb-5 last:pb-0">
      <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${failed ? 'border-danger/30 bg-danger-soft text-danger' : 'border-line-strong bg-raised text-muted'}`}>
        <Icon size={13} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[13px] font-medium text-fg">{label}</span>
          <span className="font-mono text-xs text-muted">{a.repo}{a.path ? `/${a.path}` : ''}</span>
          {failed && <span className="badge badge-danger">failed</span>}
          <span className="ml-auto font-mono text-2xs text-subtle" title={new Date(a.createdAt).toLocaleString()}>{timeAgo(a.createdAt)}</span>
        </div>
        {a.type === 'fix-pr' && !failed && r.url && (
          <a href={r.url} target="_blank" rel="noreferrer" className="link mt-1 inline-block text-xs">PR #{r.number} · <span className="font-mono">{r.branch}</span></a>
        )}
        {failed && r.error && <p className="mt-1 text-xs text-danger">{r.error}</p>}
        {a.type === 'incident' && (
          <p className="mt-1 truncate font-mono text-2xs text-subtle">
            {r.headline}{r.files?.length ? ` → ${r.files.join(', ')}` : ''}
          </p>
        )}
      </div>
    </li>
  );
}

export default function HistoryTab() {
  const [actions, setActions] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/autopilot/history').then(({ data }) => setActions(data.actions)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <ErrorMsg message={error} />;
  if (!actions) return <Skeleton className="h-64" />;
  if (!actions.length) {
    return <Card><EmptyState icon={<History size={20} />} title="No actions yet" subtitle="Every PR Autopilot opens, explanation it writes and incident it analyzes is logged here." /></Card>;
  }
  return (
    <Card>
      <ol className="relative before:absolute before:bottom-3 before:left-[13px] before:top-3 before:w-px before:bg-line">
        {actions.map((a) => <Entry key={a._id} a={a} />)}
      </ol>
    </Card>
  );
}
