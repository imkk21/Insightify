import { useEffect, useState } from 'react';
import { GitCommitHorizontal, GitPullRequest, Activity, Hand } from 'lucide-react';
import api from '../../services/api';
import { timeAgo } from '../../utils';
import { Card, CardTitle, EmptyState } from '../UI';
import Avatar from './Avatar';

function KudosButton({ code, item, mineItem }) {
  const [k, setK] = useState(item.kudos);
  const [busy, setBusy] = useState(false);
  useEffect(() => setK(item.kudos), [item.kudos]);

  const who = k.from.length ? `Kudos from ${k.from.join(', ')}` : 'No kudos yet';
  if (mineItem) {
    return k.count ? <span className="inline-flex items-center gap-1 text-xs text-subtle" title={who}><Hand size={13} /> <span className="font-mono">{k.count}</span></span> : null;
  }
  const toggle = async () => {
    setBusy(true);
    const prev = k;
    setK({ ...k, mine: !k.mine, count: k.count + (k.mine ? -1 : 1) }); // optimistic
    try {
      const { data } = await api.post(`/rooms/${code}/kudos`, { itemUrl: item.url });
      setK((cur) => ({ ...cur, mine: data.mine, count: data.count }));
    } catch { setK(prev); } finally { setBusy(false); }
  };
  return (
    <button onClick={toggle} disabled={busy} aria-pressed={k.mine} title={who}
      aria-label={`${k.mine ? 'Remove kudos' : 'Give kudos'} (${k.count})`}
      className={`btn btn-sm gap-1.5 border ${k.mine ? 'border-accent/30 bg-accent-soft text-accent-hover' : 'border-line text-subtle hover:border-line-strong hover:text-fg'}`}>
      <Hand size={13} className={k.mine ? 'motion-safe:animate-fade-in' : ''} />
      <span className="font-mono">{k.count || ''}</span>
      <span className="sr-only sm:not-sr-only">{k.mine ? '' : 'Kudos'}</span>
    </button>
  );
}

export default function ActivityFeed({ code, feed, me }) {
  return (
    <Card>
      <CardTitle title="Room activity" subtitle="Commits and pull requests from the last 7 days." icon={<Activity size={15} />} />
      {!feed.length ? (
        <EmptyState icon={<GitCommitHorizontal size={18} />} title="Quiet week"
          subtitle="When members push commits or open PRs on public repos, they'll show up here." />
      ) : (
        <ol className="-mx-2">
          {feed.map((item) => (
            <li key={item.url} className="flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-raised">
              <Avatar member={item.member} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-subtle">
                  <span className="font-medium text-muted">{item.member.name}</span>
                  {item.type === 'pr'
                    ? <><GitPullRequest size={12} className="text-accent-hover" /> opened a PR in</>
                    : <><GitCommitHorizontal size={12} /> pushed to</>}
                  <span className="truncate font-mono">{item.repo}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={item.date}>{timeAgo(item.date)}</time>
                </div>
                <a href={item.url} target="_blank" rel="noreferrer" className="mt-0.5 block truncate text-[13px] text-fg hover:underline">
                  {item.title || '(no message)'}
                </a>
              </div>
              <KudosButton code={code} item={item} mineItem={item.member.uid === me} />
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
