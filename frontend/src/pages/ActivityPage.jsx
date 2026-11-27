import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { useGithub } from '../hooks/useData';
import { PageHeader, Card, CardHeader, CardBody, SyncButton, DotLoader, EmptyState } from '../components/UI';
import { motion } from 'framer-motion';
import { GitCommit } from 'lucide-react';
import { timeAgo, PALETTE } from '../utils';


function GithubHeatmap({ commits }) {
  const counts = {};
  commits?.forEach(c => {
    const d = new Date(c.date).toISOString().split('T')[0];
    counts[d] = (counts[d] || 0) + 1;
  });

  const values = Object.entries(counts).map(([date, count]) => ({ date, count }));
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  return (
    <div className="w-full overflow-x-auto p-4">
      <div className="min-w-[700px]">
        <CalendarHeatmap
          startDate={startDate}
          endDate={endDate}
          values={values}
          classForValue={(value) => {
            if (!value || value.count === 0) return 'color-empty';
            return `color-scale-${Math.min(value.count, 4)}`;
          }}
          showWeekdayLabels={true}
        />
      </div>
      <style>{`
        .react-calendar-heatmap text { font-size: 10px; fill: var(--ink3); font-family: 'JetBrains Mono'; }
        .react-calendar-heatmap .color-empty   { fill: var(--background); stroke: var(--border); stroke-width: 1px; }
        .react-calendar-heatmap .color-scale-1 { fill: rgba(232,160,48,0.25); }
        .react-calendar-heatmap .color-scale-2 { fill: rgba(232,160,48,0.5); }
        .react-calendar-heatmap .color-scale-3 { fill: rgba(232,160,48,0.75); }
        .react-calendar-heatmap .color-scale-4 { fill: #e8a030; }
        .react-calendar-heatmap rect { rx: 3; ry: 3; }
        .react-calendar-heatmap rect:hover { stroke: #e8a030; stroke-width: 1px; transition: 0.2s }
      `}</style>
    </div>
  );
}

export default function ActivityPage() {
  const { data, loading, sync } = useGithub();
  const isConnected = !!data?.username;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.4 } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <PageHeader title="Activity Feed" subtitle="Commits, contributions & system status">
        {isConnected && <SyncButton onClick={sync} loading={loading} />}
      </PageHeader>

      <motion.div variants={itemVariants}>
        <Card className="mb-6 overflow-hidden">
          <CardHeader title="Contribution Heatmap" subtitle="Your recent commits (latest 5 per repo, 5 most recently updated repos)" />
          <CardBody className="bg-card backdrop-blur-md">
            {isConnected ? <GithubHeatmap commits={data?.recentCommits} /> : <EmptyState emoji="🔗" title="Connect GitHub to see telemetry map" subtitle="Go to GitHub Stats page to connect" />}
          </CardBody>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader title="Recent Commits" subtitle="Latest system activity" badge="GitHub" badgeStyle="bg-amber/10 text-amber border-amber/20" />
            <div className="p-2">
              {loading ? (
                <div className="px-6 py-4"><DotLoader label="Loading commits…" /></div>
              ) : !isConnected ? (
                <div className="px-6 py-4"><EmptyState emoji="🔗" title="Connect GitHub to see commits" /></div>
              ) : data?.recentCommits?.length ? (
                <div>
                  {data.recentCommits.map((c, i) => (
                    <a key={i} href={c.url} target="_blank" rel="noreferrer"
                      className="flex items-start gap-4 px-6 py-4 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors no-underline group"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-background border border-border shadow-sm group-hover:scale-110 transition-transform">
                        <GitCommit size={14} style={{ color: PALETTE[i % 5] }} />
                      </div>
                      <div className="min-w-0 pt-1">
                        <div className="text-[14px] font-medium text-foreground leading-snug group-hover:text-amber transition-colors truncate">{c.message}</div>
                        <div className="text-xs text-ink3 font-mono mt-2">{c.repo} · {c.sha} · {timeAgo(c.date)}</div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-4"><EmptyState emoji="📝" title="No commits found" /></div>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader title="GitHub Summary" subtitle="From your last sync" />
            <CardBody>
              {isConnected ? (
                <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Weekly Commits', value: data?.weeklyCommits },
                      { label: 'Total Repos',    value: data?.totalRepos },
                      { label: 'Total Stars',    value: data?.totalStars },
                      { label: 'Followers',      value: data?.followers },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-card backdrop-blur-md rounded-2xl p-4 shadow-sm border border-border">
                        <div className="text-[10px] text-ink3 uppercase tracking-wide font-mono">{label}</div>
                        <div className="font-syne font-black text-2xl text-foreground mt-1">{value ?? '—'}</div>
                      </div>
                    ))}
                </div>
              ) : <EmptyState emoji="🔗" title="Connect GitHub to see your stats" />}
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
