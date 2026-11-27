import { useCallback, useEffect, useState } from 'react';
import { Compass, Star, ExternalLink, MessageSquare } from 'lucide-react';
import api from '../../services/api';
import { Card, CardTitle, Loader, ErrorMsg, EmptyState } from '../UI';
import { timeAgo } from '../../utils';

/** Good first issues in popular repos, matched to the user's evidence. Fetches on mount. */
export default function Matchmaker() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback((refresh) => {
    setLoading(true); setError('');
    api.get('/skills/matches', { params: refresh ? { refresh: 1 } : {}, timeout: 60000 })
      .then(({ data }) => setData(data))
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(false); }, [load]);

  return (
    <Card>
      <CardTitle icon={<Compass size={15} />} title="Contribution matchmaker"
        subtitle="Open good-first-issues in popular projects, picked from what your commits prove you can do."
        action={data && !loading && <button onClick={() => load(true)} className="btn-ghost btn-sm">Find more</button>} />
      {loading ? <Loader label="Searching GitHub for issues that fit your skills…" />
        : error ? <ErrorMsg message={error} />
        : !data?.matches?.length ? <EmptyState title="No matching issues right now" subtitle="Try again later; new good first issues are opened every day." />
        : (
          <ul className="-mx-2 divide-y divide-line">
            {data.matches.map((m) => (
              <li key={m.url} className="px-2 py-3.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a href={m.repoUrl} target="_blank" rel="noreferrer" className="font-mono text-xs text-muted hover:text-fg">{m.repo}</a>
                  <span className="inline-flex items-center gap-1 font-mono text-2xs text-warning"><Star size={11} aria-hidden="true" />{m.stars.toLocaleString()}</span>
                  {m.language && <span className="badge">{m.language}</span>}
                  {m.gap && <span className="badge badge-success">builds a gap</span>}
                  <span className="ml-auto inline-flex items-center gap-2 font-mono text-2xs text-subtle">
                    <MessageSquare size={11} aria-hidden="true" />{m.comments} · {timeAgo(m.createdAt)}
                  </span>
                </div>
                <a href={m.url} target="_blank" rel="noreferrer" className="group mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-fg">
                  <span className="group-hover:text-accent-hover">{m.title}</span>
                  <ExternalLink size={12} className="mt-1 shrink-0 text-subtle" aria-hidden="true" />
                </a>
                <p className="mt-1 text-xs text-subtle"><span className="text-accent-hover">Why you:</span> {m.why}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.labels.slice(0, 5).map((l) => <span key={l} className={`badge ${/good first/i.test(l) ? 'badge-accent' : ''}`}>{l}</span>)}
                </div>
              </li>
            ))}
          </ul>
        )}
    </Card>
  );
}
