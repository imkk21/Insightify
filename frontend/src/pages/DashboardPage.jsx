import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import { useGithub, useNews, useInsight, useTasks } from '../hooks/useData';
import { Card, CardTitle, Loader, EmptyState, Skeleton } from '../components/UI';
import { ContributionCalendar } from '../components/Charts';
import InsightBanner from '../components/InsightBanner';
import NewsCard from '../components/NewsCard';
import { timeAgo } from '../utils';
import { GitCommit, GitPullRequest, GitBranch, Music, Circle, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const LinkMore = ({ to, children = 'View all' }) => <Link to={to} className="link shrink-0 text-sm">{children}</Link>;

function ThisWeek({ github }) {
  const gh = github.data;
  if (github.loading && !gh) return <Card className="rounded-xl p-6 sm:p-8 xl:col-span-2"><Loader /></Card>;
  if (!gh?.totals) {
    return (
      <Card className="rounded-xl p-6 sm:p-8 xl:col-span-2">
        <EmptyState icon={<GitBranch size={22} />} title="Connect GitHub to see your week" subtitle="Contributions, streaks and a year of activity, at a glance.">
          <Link to="/activity" className="btn-primary">Connect GitHub</Link>
        </EmptyState>
      </Card>
    );
  }

  const delta = gh.weeklyContributions - gh.lastWeekContributions;
  const Arrow = delta >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <Card className="rounded-xl p-6 sm:p-8 xl:col-span-2">
      <CardTitle title="This week" action={<LinkMore to="/activity">All activity</LinkMore>} />
      <div className="mb-6 flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <div className="text-6xl font-bold leading-none tracking-tight">{gh.weeklyContributions}</div>
          <div className="mt-2 text-olive">contributions</div>
        </div>
        <div className={`flex items-center gap-1 pb-7 font-semibold ${delta >= 0 ? 'text-forest' : 'text-olive'}`}>
          <Arrow size={18} aria-hidden="true" />
          {Math.abs(delta)} {delta >= 0 ? 'more' : 'fewer'} than last week
        </div>
        <dl className="flex gap-8 pb-1 text-sm">
          <div><dt className="text-olive">Streak</dt><dd className="text-2xl font-bold">{gh.streak.current}d</dd></div>
          <div><dt className="text-olive">Best</dt><dd className="text-2xl font-bold">{gh.streak.longest}d</dd></div>
          <div><dt className="text-olive">This year</dt><dd className="text-2xl font-bold">{gh.totals.contributionsYear}</dd></div>
        </dl>
      </div>
      <div className="overflow-x-auto"><ContributionCalendar days={gh.calendar} weeks={26} /></div>
    </Card>
  );
}

function RecentWork({ gh }) {
  const items = [
    ...(gh?.recentCommits || []).slice(0, 10).map((c) => ({ key: c.url, icon: GitCommit, title: c.message, meta: c.repo, date: c.date, url: c.url })),
    ...(gh?.pullRequests || []).slice(0, 5).map((p) => ({ key: p.url, icon: GitPullRequest, title: p.title, meta: `${p.repo} · ${p.state.toLowerCase()}`, date: p.createdAt, url: p.url })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  return (
    <Card>
      <CardTitle title="Recent work" action={gh?.totals && <LinkMore to="/activity" />} />
      {items.length ? (
        <ul>
          {items.map(({ key, icon: Icon, title, meta, date, url }) => (
            <li key={key} className="border-t border-sand first:border-0">
              <a href={url} target="_blank" rel="noreferrer" className="group flex items-start gap-3 py-2.5">
                <Icon size={16} className="mt-0.5 shrink-0 text-olive" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold group-hover:underline">{title}</span>
                  <span className="block text-xs text-olive">{meta} · {timeAgo(date)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="Nothing yet" subtitle="Your commits and pull requests show up here." />}
    </Card>
  );
}

function OpenTasks() {
  const { tasks, loading, create } = useTasks();
  const [title, setTitle] = useState('');
  const open = tasks.filter((t) => t.status !== 'done');

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
        <input id="quick-task" className="input py-2" maxLength={500} placeholder="Add a task…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button type="submit" disabled={!title.trim()} className="btn-primary">Add</button>
      </form>
      {loading ? <Loader /> : open.length ? (
        <ul className="space-y-1">
          {open.slice(0, 5).map((t) => (
            <li key={t._id} className="flex items-start gap-2.5 rounded-sm bg-white px-3 py-2.5 text-sm">
              {t.status === 'in-progress'
                ? <Clock size={16} className="mt-0.5 shrink-0" aria-label="In progress" />
                : <Circle size={16} className="mt-0.5 shrink-0 text-olive" aria-label="To do" />}
              <span className="font-semibold">{t.title}</span>
            </li>
          ))}
        </ul>
      ) : <p className="py-4 text-center text-sm text-olive">All clear.</p>}
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
          {selectedPlaylist.images?.[0]?.url && <img src={selectedPlaylist.images[0].url} alt="" className="h-20 w-20 rounded-sm object-cover" />}
          <div className="min-w-0">
            <div className="truncate font-bold">{selectedPlaylist.name}</div>
            <div className="text-xs text-olive">Playing in the mini player</div>
          </div>
        </div>
      ) : <EmptyState icon={<Music size={22} />} title="Nothing playing" subtitle="Pick a Spotify playlist to listen while you work." />}
    </Card>
  );
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const github  = useGithub();
  const news    = useNews();
  const insight = useInsight();

  const name = (profile?.displayName || user?.displayName || 'there').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div>
      <section className="mb-8">
        <p className="font-semibold text-olive">{today}</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">{greeting}, {name}</h1>
      </section>

      <div className="mb-4 grid items-stretch gap-4 xl:grid-cols-3">
        <ThisWeek github={github} />
        {insight.loading
          ? <Skeleton className="h-64 rounded-xl" />
          : <InsightBanner insight={insight.latest} onGenerate={insight.generate} generating={insight.generating} />}
      </div>

      <div className="mb-12 grid items-start gap-4 lg:grid-cols-3">
        <RecentWork gh={github.data} />
        <OpenTasks />
        <NowPlaying />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Headlines</h2>
          <LinkMore to="/news">All news</LinkMore>
        </div>
        {news.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : (
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
            {(news.data?.articles || []).slice(0, 8).map((a) => <NewsCard key={a.url} article={a} compact />)}
          </div>
        )}
      </section>
    </div>
  );
}
