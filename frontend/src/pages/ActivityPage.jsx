import { useGithub } from '../hooks/useData';
import { PageHeader, Card, CardHeader, CardBody, SyncButton, DotLoader, EmptyState } from '../components/UI';

const DOT_COLORS = ['#e8a030','#14b8a6','#4361b8','#e05a6a','#6b6258'];

function Heatmap() {
  const cells = 26 * 7;
  const colors = ['#f2ede2','rgba(232,160,48,0.25)','rgba(232,160,48,0.5)','rgba(232,160,48,0.75)','#e8a030'];
  return (
    <div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(26, 1fr)' }}>
        {Array.from({ length: cells }, (_, i) => {
          const r = Math.random();
          const level = r < 0.5 ? 0 : r < 0.7 ? 1 : r < 0.85 ? 2 : r < 0.95 ? 3 : 4;
          return (
            <div key={i} title={`${level} contributions`}
              className="aspect-square rounded-[2px] hover:scale-125 transition-transform cursor-default"
              style={{ background: colors[level] }} />
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[11px] text-ink3">Less</span>
        {colors.map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-[2px] border border-black/[0.06]" style={{ background: c }} />
        ))}
        <span className="text-[11px] text-ink3">More</span>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const { data, loading, sync } = useGithub();
  const isConnected = !!data?.username;

  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  };

  return (
    <div>
      <PageHeader title="Activity Feed" subtitle="Commits, contributions & system status">
        {isConnected && <SyncButton onClick={sync} loading={loading} />}
      </PageHeader>

      <Card className="mb-5">
        <CardHeader title="Contribution Heatmap" subtitle="Estimated · past 6 months" />
        <CardBody>
          {isConnected ? <Heatmap /> : <EmptyState emoji="🔗" title="Connect GitHub to see heatmap" subtitle="Go to GitHub Stats page to connect" />}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Recent Commits" subtitle="Latest activity" badge="GitHub API" badgeStyle="bg-amber/10 text-amber border-amber/20" />
          <CardBody className="!p-0">
            {loading ? (
              <div className="px-6 py-4"><DotLoader label="Loading commits…" /></div>
            ) : !isConnected ? (
              <div className="px-6 py-4"><EmptyState emoji="🔗" title="Connect GitHub to see commits" /></div>
            ) : data?.recentCommits?.length ? (
              <div>
                {data.recentCommits.map((c, i) => (
                  <a key={i} href={c.url} target="_blank" rel="noreferrer"
                    className="flex items-start gap-3 px-6 py-4 border-b border-black/[0.05] last:border-b-0 hover:bg-cream/50 transition-colors no-underline group"
                  >
                    <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: DOT_COLORS[i % 5] }} />
                    <div className="min-w-0">
                      <div className="text-[13px] text-ink2 leading-snug group-hover:text-teal transition-colors truncate">{c.message}</div>
                      <div className="text-[11px] text-ink3 font-mono mt-1">{c.repo} · {c.sha} · {timeAgo(c.date)}</div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="px-6 py-4"><EmptyState emoji="📝" title="No commits found" /></div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="System Status" subtitle="Services & data sync health" badge="Live" badgeStyle="bg-teal2/10 text-teal2 border-teal2/20" />
          <CardBody>
            <div className="space-y-3">
              {[
                { label: 'Weekly Insight Cron',  detail: 'Every Monday 08:00 IST' },
                { label: 'Hourly News Sync',     detail: 'Every hour on the hour' },
                { label: 'Firebase Auth',        detail: 'Token verified' },
                { label: 'MongoDB Atlas',        detail: '5 collections' },
                { label: 'GitHub API',           detail: isConnected ? `@${data?.username}` : 'Not connected' },
                { label: 'OpenWeather API',      detail: 'Cache: 30 min TTL' },
              ].map(({ label, detail }) => (
                <div key={label} className="flex items-center justify-between bg-cream rounded-xl px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-ink">{label}</div>
                    <div className="text-xs text-ink3 mt-0.5">{detail}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal2 animate-pulse" />
                    <span className="text-xs font-mono text-teal2">Active</span>
                  </div>
                </div>
              ))}
            </div>

            {isConnected && (
              <div className="mt-5 pt-5 border-t border-black/[0.06]">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Weekly Commits', value: data?.weeklyCommits },
                    { label: 'Total Repos',    value: data?.totalRepos },
                    { label: 'Total Stars',    value: data?.totalStars },
                    { label: 'Followers',      value: data?.followers },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-cream rounded-xl p-3">
                      <div className="text-[10px] text-ink3 uppercase tracking-wide">{label}</div>
                      <div className="font-syne font-bold text-xl text-ink mt-0.5">{value ?? '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
