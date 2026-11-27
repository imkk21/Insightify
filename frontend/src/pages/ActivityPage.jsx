import { Link } from 'react-router-dom';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { useGithub } from '../hooks/useData';
import { PageHeader, Card, CardTitle, Stat, Loader, EmptyState, RefreshButton } from '../components/UI';
import { timeAgo } from '../utils';
import { GitCommit, GitBranch } from 'lucide-react';

function Heatmap({ commits = [] }) {
  const counts = {};
  commits.forEach((c) => {
    const d = new Date(c.date).toISOString().split('T')[0];
    counts[d] = (counts[d] || 0) + 1;
  });
  const start = new Date();
  start.setMonth(start.getMonth() - 6);

  return (
    <div className="overflow-x-auto">
      {/* The SVG scales with its container; cap it so cells and labels stay small */}
      <div className="min-w-[640px] max-w-[880px]">
        <CalendarHeatmap
          startDate={start}
          endDate={new Date()}
          values={Object.entries(counts).map(([date, count]) => ({ date, count }))}
          classForValue={(v) => (v?.count ? `color-scale-${Math.min(v.count, 4)}` : 'color-empty')}
          titleForValue={(v) => (v?.count ? `${v.count} commit${v.count > 1 ? 's' : ''} on ${v.date}` : null)}
          showWeekdayLabels
        />
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const { data, loading, sync } = useGithub();
  const connected = !!data?.username;

  if (!loading && !connected) {
    return (
      <div>
        <PageHeader title="Activity" subtitle="Your commits over time" />
        <Card className="mx-auto max-w-lg rounded-xl">
          <EmptyState icon={<GitBranch size={22} />} title="Connect GitHub first" subtitle="Your commit history shows up here once GitHub is connected.">
            <Link to="/github" className="btn-primary">Connect GitHub</Link>
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Activity" subtitle="Your commits over time">
        {connected && <RefreshButton onClick={sync} loading={loading} />}
      </PageHeader>

      {loading && !connected ? <Loader /> : (
        <>
          <Card className="mb-8">
            <CardTitle title="Commit calendar" subtitle="Your latest commits from your 5 most recently updated repositories" />
            <Heatmap commits={data.recentCommits} />
          </Card>

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card>
              <CardTitle title="Recent commits" />
              {data.recentCommits?.length ? (
                <ul>
                  {data.recentCommits.map((c) => (
                    <li key={c.sha + c.repo} className="border-t border-sand first:border-0">
                      <a href={c.url} target="_blank" rel="noreferrer" className="group flex items-start gap-3 py-3">
                        <span className="btn-circle h-8 w-8"><GitCommit size={16} aria-hidden="true" /></span>
                        <span className="min-w-0 pt-0.5">
                          <span className="block truncate font-semibold group-hover:underline">{c.message}</span>
                          <span className="block text-xs text-olive">{c.repo} · {c.sha} · {timeAgo(c.date)}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState title="No commits found" />}
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Stat label="Commits this week" value={data.weeklyCommits} />
              <Stat label="Productivity score" value={data.productivityScore} hint="out of 100" />
              <Stat label="Repositories" value={data.totalRepos} />
              <Stat label="Stars" value={data.totalStars} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
