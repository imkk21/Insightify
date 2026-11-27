import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import { useGithub, useNews, useInsight, useTasks } from '../hooks/useData';
import { securityAPI } from '../services/api';
import { PageHeader, Card, CardTitle, Stat, Loader, EmptyState, Skeleton } from '../components/UI';
import { ContributionCalendar } from '../components/Charts';
import InsightBanner from '../components/InsightBanner';
import NewsCard from '../components/NewsCard';
import FeatureCards from '../components/FeatureCards';
import { FeedRow } from './ActivityPage';
import { timeAgo } from '../utils';
import { GitCommit, GitPullRequest, GitBranch, Music, Circle, CircleDashed, ArrowUpRight, ArrowDownRight, Plus, FileText, AudioLines, Newspaper } from 'lucide-react';

const LinkMore = ({ to, children = 'View all' }) => (
  <Link to={to} className="inline-flex shrink-0 items-center gap-0.5 text-xs text-subtle transition-colors hover:text-fg">
    {children} <ArrowUpRight size={12} aria-hidden="true" />
  </Link>
);

/** A KPI tile that links to its page. */
const Kpi = ({ to, ...stat }) => (
  <Link to={to} className="block rounded-xl"><Stat {...stat} className="card-hover h-full" /></Link>
);

function KpiStrip({ gh, openCount, tasksLoading, urgent }) {
  const sev = urgent?.bySeverity;
  return (
    <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Kpi to="/activity" label="Contributions · week" value={gh?.totals ? gh.weeklyContributions : '—'}
        trend={gh?.totals ? gh.weeklyContributions - gh.lastWeekContributions : undefined}
        hint={gh?.totals ? 'vs last week' : 'Connect GitHub'} />
      <Kpi to="/activity" label="Streak" value={gh?.totals ? `${gh.streak.current}d` : '—'}
        hint={gh?.totals ? `best ${gh.streak.longest} days` : 'No data yet'} />
      <Kpi to="/focus" label="Open tasks" value={tasksLoading ? '…' : openCount} hint={openCount ? 'across your board' : 'All clear'} />
      <Kpi to="/security" label="Security · urgent" value={urgent ? urgent.count : '—'}
        hint={!urgent ? 'No scan yet'
          : urgent.count ? [sev.CRITICAL && `${sev.CRITICAL} critical`, sev.HIGH && `${sev.HIGH} high`].filter(Boolean).join(' · ')
          : 'No critical or high issues'} />
    </div>
  );
}

function ThisWeek({ github }) {
  const gh = github.data;
  if (github.loading && !gh) return <Card className="xl:col-span-2"><Skeleton className="mb-6 h-16 w-48" /><Skeleton className="h-32" /></Card>;
  if (!gh?.totals) {
    return (
      <Card className="glow xl:col-span-2">
        <EmptyState icon={<GitBranch size={20} />} title="Connect GitHub to see your week" subtitle="Contributions, streaks and a year of activity, at a glance.">
          <Link to="/activity" className="btn-primary">Connect GitHub</Link>
        </EmptyState>
      </Card>
    );
  }

  const delta = gh.weeklyContributions - gh.lastWeekContributions;
  const Arrow = delta >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <Card className="xl:col-span-2">
      <CardTitle title="This week" subtitle="Last 26 weeks of contributions" action={<LinkMore to="/activity">All activity</LinkMore>} />
      <div className="mb-6 flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <div className="font-mono text-5xl font-semibold leading-none tracking-tighter text-gradient">{gh.weeklyContributions}</div>
          <div className="mt-2 flex items-center gap-2 text-[13px] text-muted">
            contributions
            <span className={`badge ${delta >= 0 ? 'badge-success' : 'badge-danger'}`}>
              <Arrow size={11} aria-hidden="true" /> <span className="font-mono">{Math.abs(delta)}</span> vs last week
            </span>
          </div>
        </div>
        <dl className="flex gap-8">
          {[['Streak', `${gh.streak.current}d`], ['Best', `${gh.streak.longest}d`], ['This year', gh.totals.contributionsYear]].map(([k, v]) => (
            <div key={k}><dt className="label">{k}</dt><dd className="mt-1 font-mono text-lg font-semibold text-fg">{v}</dd></div>
          ))}
        </dl>
      </div>
      <div className="overflow-x-auto no-scrollbar"><ContributionCalendar days={gh.calendar} weeks={26} /></div>
    </Card>
  );
}

function RecentWork({ gh }) {
  const items = [
    ...(gh?.recentCommits || []).slice(0, 10).map((c) => ({ key: c.url, icon: GitCommit, title: c.message, meta: `${c.repo} · ${timeAgo(c.date)}`, date: c.date, url: c.url })),
    ...(gh?.pullRequests || []).slice(0, 5).map((p) => ({ key: p.url, icon: GitPullRequest, title: p.title, meta: `${p.repo} · ${p.state.toLowerCase()} · ${timeAgo(p.createdAt)}`, date: p.createdAt, url: p.url })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  return (
    <Card>
      <CardTitle title="Recent work" action={gh?.totals && <LinkMore to="/activity" />} />
      {items.length ? (
        <ul className="space-y-0.5">
          {items.map(({ key, icon, title, meta, url }) => <FeedRow key={key} href={url} icon={icon} title={title} meta={meta} />)}
        </ul>
      ) : <EmptyState icon={<GitCommit size={20} />} title="Nothing yet" subtitle="Your commits and pull requests show up here." />}
    </Card>
  );
}

function OpenTasks({ open, loading, create }) {
  const [title, setTitle] = useState('');

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await create(title.trim());
    setTitle('');
  };

  return (
    <Card>
      <CardTitle title="Open tasks" subtitle={`${open.length} to go`} action={<LinkMore to="/focus">Board</LinkMore>} />
      <form onSubmit={add} className="mb-3 flex gap-2">
        <label htmlFor="quick-task" className="sr-only">Quick add task</label>
        <input id="quick-task" className="input" maxLength={500} placeholder="Add a task…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button type="submit" disabled={!title.trim()} className="btn-icon btn-secondary" aria-label="Add task"><Plus size={15} /></button>
      </form>
      {loading ? <Loader /> : open.length ? (
        <ul className="space-y-0.5">
          {open.slice(0, 5).map((t) => (
            <li key={t._id} className="flex items-start gap-2.5 rounded-md px-2 py-2 text-[13px] text-fg">
              {t.status === 'in-progress'
                ? <CircleDashed size={14} className="mt-0.5 shrink-0 text-warning" aria-label="In progress" />
                : <Circle size={14} className="mt-0.5 shrink-0 text-subtle" aria-label="To do" />}
              <span className="min-w-0 break-words">{t.title}</span>
            </li>
          ))}
        </ul>
      ) : <p className="py-6 text-center text-[13px] text-subtle">All clear. Nice.</p>}
    </Card>
  );
}

function NowPlaying() {
  const { selectedPlaylist } = useMusic();
  return (
    <Card>
      <CardTitle title="Music" action={<LinkMore to="/focus">{selectedPlaylist ? 'Change' : 'Browse'}</LinkMore>} />
      {selectedPlaylist ? (
        <div className="flex items-center gap-4">
          {selectedPlaylist.images?.[0]?.url
            ? <img src={selectedPlaylist.images[0].url} alt="" className="h-16 w-16 rounded-md object-cover ring-1 ring-line" />
            : <span className="flex h-16 w-16 items-center justify-center rounded-md bg-raised"><Music size={20} className="text-subtle" /></span>}
          <div className="min-w-0">
            <div className="truncate font-medium text-fg">{selectedPlaylist.name}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-accent-hover"><AudioLines size={12} aria-hidden="true" /> Playing in the mini player</div>
          </div>
        </div>
      ) : <EmptyState icon={<Music size={20} />} title="Nothing playing" subtitle="Pick a Spotify playlist to listen while you work." />}
    </Card>
  );
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const github  = useGithub();
  const news    = useNews();
  const insight = useInsight();
  const tasks   = useTasks();
  const [security, setSecurity] = useState(null);

  useEffect(() => { securityAPI.summary().then(({ data }) => setSecurity(data)).catch(() => {}); }, []);
  const sev = security?.totals?.bySeverity;
  const urgent = sev ? { count: (sev.CRITICAL || 0) + (sev.HIGH || 0), bySeverity: sev } : null;
  const open = tasks.tasks.filter((t) => t.status !== 'done');

  const name = (profile?.displayName || user?.displayName || 'there').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div>
      <PageHeader eyebrow={today} title={`${greeting}, ${name}`} subtitle="Here's where your engineering week stands.">
        <Link to="/reports" className="btn-secondary"><FileText size={14} aria-hidden="true" /> Write standup</Link>
      </PageHeader>

      <KpiStrip gh={github.data} openCount={open.length} tasksLoading={tasks.loading} urgent={urgent} />

      <div className="mb-4 grid items-stretch gap-4 xl:grid-cols-3">
        <ThisWeek github={github} />
        {insight.loading
          ? <Skeleton className="h-64 rounded-xl" />
          : <InsightBanner insight={insight.latest} onGenerate={insight.generate} generating={insight.generating} />}
      </div>

      <FeatureCards urgent={urgent?.count || 0} />

      <div className="mb-4 grid items-start gap-4 lg:grid-cols-3">
        <RecentWork gh={github.data} />
        <OpenTasks open={open} loading={tasks.loading} create={tasks.create} />
        <NowPlaying />
      </div>

      <Card>
        <CardTitle icon={<Newspaper size={14} />} title="Headlines" subtitle="Technology news, refreshed hourly" action={<LinkMore to="/news">All news</LinkMore>} />
        {news.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : news.data?.articles?.length ? (
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-4">
            {news.data.articles.slice(0, 8).map((a) => <NewsCard key={a.url} article={a} compact />)}
          </div>
        ) : <p className="py-4 text-center text-[13px] text-subtle">No headlines right now.</p>}
      </Card>
    </div>
  );
}
