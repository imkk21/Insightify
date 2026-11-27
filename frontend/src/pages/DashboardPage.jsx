import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import { useGithub, useWeather, useNews, useInsight, useTasks } from '../hooks/useData';
import { Card, CardTitle, Masonry, LangBar, Loader, EmptyState, Skeleton } from '../components/UI';
import InsightBanner from '../components/InsightBanner';
import NewsCard from '../components/NewsCard';
import { timeAgo } from '../utils';
import { GitCommit, GitBranch, Music, CloudSun } from 'lucide-react';

const ScoreRing = ({ score = 0 }) => {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e5e0" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#211922" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight">{score}</span>
        <span className="text-xs text-olive">of 100</span>
      </div>
    </div>
  );
};

const LinkMore = ({ to, children = 'View all' }) => <Link to={to} className="link shrink-0 text-sm">{children}</Link>;

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { selectedPlaylist } = useMusic();
  const github  = useGithub();
  const weather = useWeather();
  const news    = useNews();
  const insight = useInsight();
  const { tasks } = useTasks();

  const name = (profile?.displayName || user?.displayName || 'there').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const gh = github.data;
  const connected = !!gh?.username;
  const openTasks = tasks.filter((t) => t.status !== 'done').length;
  const langs = gh?.languages ? Object.entries(gh.languages).sort((a, b) => b[1] - a[1]).slice(0, 5) : [];
  const langTotal = langs.reduce((s, [, v]) => s + v, 0) || 1;
  const w = weather.data;
  const c = w?.current;

  return (
    <div>
      <section className="mb-10">
        <p className="font-semibold text-olive">{today}</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl 2xl:text-display">
          {greeting}, {name}
        </h1>
      </section>

      <Masonry>
        {insight.loading
          ? <Skeleton className="h-56 rounded-xl" />
          : <InsightBanner insight={insight.latest} onGenerate={insight.generate} generating={insight.generating} />}

        <Card>
          <CardTitle title="Productivity" subtitle="Based on your GitHub activity" action={connected && <LinkMore to="/github">GitHub</LinkMore>} />
          {github.loading ? <Loader /> : connected ? (
            <div className="flex items-center gap-6">
              <ScoreRing score={gh.productivityScore || 0} />
              <dl className="space-y-3 text-sm">
                <div><dt className="text-olive">Commits this week</dt><dd className="text-xl font-bold">{gh.weeklyCommits}</dd></div>
                <div><dt className="text-olive">Open tasks</dt><dd className="text-xl font-bold"><Link to="/tasks" className="hover:underline">{openTasks}</Link></dd></div>
              </dl>
            </div>
          ) : (
            <EmptyState icon={<GitBranch size={22} />} title="Connect GitHub" subtitle="See your score, languages and commits.">
              <Link to="/github" className="btn-primary">Connect</Link>
            </EmptyState>
          )}
        </Card>

        <Card>
          <CardTitle title="Weather" subtitle={w ? `${w.city}, ${w.country}` : 'Finding your location…'} action={w && <LinkMore to="/weather">Details</LinkMore>} />
          {weather.loading || weather.locating ? <Loader /> : c ? (
            <>
              <div className="flex items-center gap-2">
                {c.icon && <img src={`https://openweathermap.org/img/wn/${c.icon}@2x.png`} alt="" className="-my-2 -ml-3 h-20 w-20" />}
                <div>
                  <div className="text-5xl font-bold tracking-tight">{c.temp}°</div>
                  <div className="capitalize text-olive">{c.description}</div>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2">
                {[['Humidity', `${c.humidity}%`], ['Wind', `${c.windSpeed} km/h`], ['Visibility', `${c.visibility} km`]].map(([k, v]) => (
                  <div key={k} className="rounded-sm bg-white p-3">
                    <dt className="text-xs text-olive">{k}</dt>
                    <dd className="font-bold">{v}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : <EmptyState icon={<CloudSun size={22} />} title="No weather data" subtitle={weather.error} />}
        </Card>

        <Card>
          <CardTitle title="Music" action={<LinkMore to="/music">{selectedPlaylist ? 'Change' : 'Browse'}</LinkMore>} />
          {selectedPlaylist ? (
            <>
              {selectedPlaylist.images?.[0]?.url && (
                <img src={selectedPlaylist.images[0].url} alt="" className="aspect-square w-full rounded-sm object-cover" />
              )}
              <div className="mt-3 font-bold">{selectedPlaylist.name}</div>
              <div className="text-xs text-olive">Playing in the mini player</div>
            </>
          ) : (
            <EmptyState icon={<Music size={22} />} title="Nothing playing" subtitle="Pick a Spotify playlist to listen while you work." />
          )}
        </Card>

        {connected && langs.length > 0 && (
          <Card>
            <CardTitle title="Languages" subtitle={`Across ${gh.totalRepos} repositories`} />
            <div className="space-y-4">
              {langs.map(([lang, n]) => <LangBar key={lang} name={lang} pct={Math.round((n / langTotal) * 100)} />)}
            </div>
          </Card>
        )}

        {connected && gh.recentCommits?.length > 0 && (
          <Card>
            <CardTitle title="Recent commits" action={<LinkMore to="/activity" />} />
            <ul>
              {gh.recentCommits.slice(0, 5).map((cm) => (
                <li key={cm.sha + cm.repo} className="border-t border-sand first:border-0">
                  <a href={cm.url} target="_blank" rel="noreferrer" className="group flex items-start gap-3 py-2.5">
                    <GitCommit size={16} className="mt-0.5 shrink-0 text-olive" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold group-hover:underline">{cm.message}</span>
                      <span className="block text-xs text-olive">{cm.repo} · {timeAgo(cm.date)}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {news.loading
          ? [1, 2, 3].map((i) => <Skeleton key={i} className={i === 2 ? 'h-72' : 'h-52'} />)
          : (news.data?.articles || []).slice(0, 6).map((a) => <NewsCard key={a.url} article={a} />)}
      </Masonry>
    </div>
  );
}
