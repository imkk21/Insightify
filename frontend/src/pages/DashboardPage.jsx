import { useAuth } from '../context/AuthContext';
import { useGithub, useWeather, useNews, useInsight } from '../hooks/useData';
import {
  PageHeader, StatCard, Card, CardHeader, CardBody,
  LangBar, DateChip, SyncButton, Skeleton, DotLoader, EmptyState, ErrorMsg
} from '../components/UI';
import InsightBanner from '../components/InsightBanner';
import NewsCard from '../components/NewsCard';

const LANG_COLORS = ['#e8a030','#4361b8','#14b8a6','#e05a6a','#6b6258'];
const DOT_COLORS  = ['#e8a030','#14b8a6','#4361b8','#e05a6a','#6b6258'];

const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
};

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const github  = useGithub();
  const weather = useWeather();
  const news    = useNews();
  const insight = useInsight();

  const name = profile?.displayName || user?.displayName || 'Developer';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const isGithubConnected = !!github.data?.username;

  const langs = github.data?.languages
    ? Object.entries(github.data.languages).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];
  const total = langs.reduce((s, [, v]) => s + v, 0) || 1;

  const c = weather.data?.current;

  return (
    <div>
      <PageHeader title={`${greeting}, ${name.split(' ')[0]} 👋`} subtitle="Your weekly developer snapshot">
        <DateChip />
        <SyncButton onClick={insight.generate} loading={insight.generating} />
      </PageHeader>

      {/* AI Insight Banner */}
      <div className="mb-7">
        {insight.loading
          ? <Skeleton className="h-36 rounded-2xl" />
          : <InsightBanner insight={insight.latest} onGenerate={insight.generate} generating={insight.generating} />
        }
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {github.loading
          ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
          : <>
            <StatCard icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>} value={isGithubConnected ? github.data?.weeklyCommits : '—'} label="Commits This Week" accentColor="#e8a030" delay={0} />
            <StatCard icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>} value={isGithubConnected ? github.data?.totalRepos : '—'} label="Repositories" accentColor="#14b8a6" delay={80} />
            <StatCard icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>} value={isGithubConnected ? github.data?.totalStars : '—'} label="GitHub Stars" accentColor="#e05a6a" delay={160} />
            <StatCard icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} value={isGithubConnected ? github.data?.followers : '—'} label="GitHub Followers" accentColor="#4361b8" delay={240} />
          </>
        }
      </div>

      {/* Connect GitHub nudge if not connected */}
      {!github.loading && !isGithubConnected && (
        <div className="mb-7 bg-amber/5 border border-amber/20 rounded-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <div className="font-syne font-bold text-ink text-sm">Connect GitHub to see your stats</div>
            <div className="text-xs text-ink3 mt-0.5">Go to GitHub Stats page and enter your username</div>
          </div>
          <a href="/github" className="btn-primary text-xs py-2 px-4 no-underline">Connect GitHub →</a>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Languages */}
        <Card>
          <CardHeader title="Language Breakdown" subtitle="All repositories" badge="GitHub" badgeStyle="bg-amber/10 text-amber border-amber/20" />
          <CardBody>
            {github.loading ? <DotLoader label="Fetching stats…" />
              : !isGithubConnected ? <EmptyState emoji="🔗" title="GitHub not connected" subtitle="Connect on the GitHub page" />
              : langs.length ? (
                <div className="space-y-4">
                  {langs.map(([lang, count], i) => (
                    <LangBar key={lang} name={lang} pct={Math.round((count / total) * 100)} color={LANG_COLORS[i]} />
                  ))}
                </div>
              ) : <EmptyState emoji="💻" title="No language data yet" />}
          </CardBody>
        </Card>

        {/* News */}
        <Card>
          <CardHeader title="Tech Headlines" subtitle="From News API" badge="Live" badgeStyle="bg-teal2/10 text-teal2 border-teal2/20" />
          <CardBody className="!p-0">
            {news.loading ? <div className="px-6 py-4"><DotLoader label="Fetching news…" /></div>
              : news.data?.articles?.length
                ? news.data.articles.slice(0, 4).map((a, i) => <NewsCard key={i} article={a} compact />)
                : <div className="px-6 py-4"><EmptyState emoji="📰" title="No news yet" /></div>}
          </CardBody>
        </Card>

        {/* Weather */}
        <Card>
          <CardHeader
            title="Environment"
            subtitle={weather.data ? `${weather.data.city}, ${weather.data.country}` : 'Detecting location…'}
            badge="OpenWeather"
            badgeStyle="bg-indigo/10 text-indigo border-indigo/20"
          />
          <CardBody>
            {weather.loading || weather.locating
              ? <DotLoader label={weather.locating ? 'Getting location…' : 'Fetching weather…'} />
              : c ? (
                <div>
                  <div className="text-center pb-4 border-b border-black/[0.06] mb-4">
                    {c.icon && <img src={`https://openweathermap.org/img/wn/${c.icon}@2x.png`} alt="" className="w-16 h-16 mx-auto" />}
                    <div className="font-syne font-black text-5xl text-ink leading-none tracking-tight">{c.temp}°<span className="text-2xl font-normal">C</span></div>
                    <div className="text-sm text-ink2 mt-1.5 capitalize">{c.description}</div>
                    <div className="text-xs text-ink3 mt-0.5">📍 {weather.data?.city}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[['Humidity', `${c.humidity}%`],['Wind', `${c.windSpeed} km/h`],['Pressure', `${c.pressure} hPa`],['Visibility', `${c.visibility} km`]].map(([lbl, val]) => (
                      <div key={lbl} className="bg-cream rounded-xl p-3 text-center">
                        <div className="font-mono text-sm font-medium text-ink">{val}</div>
                        <div className="text-[10px] text-ink3 uppercase tracking-wide mt-0.5">{lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <EmptyState emoji="🌤️" title="No weather data" />}
          </CardBody>
        </Card>
      </div>

      {/* Recent Commits */}
      <Card>
        <CardHeader title="Recent Commits" subtitle="Latest activity" />
        <CardBody className="!p-0">
          {github.loading ? <div className="px-6 py-4"><DotLoader label="Loading commits…" /></div>
            : !isGithubConnected ? <div className="px-6 py-4"><EmptyState emoji="🔗" title="Connect GitHub to see commits" /></div>
            : github.data?.recentCommits?.length ? (
              github.data.recentCommits.slice(0, 6).map((c, i) => (
                <a key={i} href={c.url} target="_blank" rel="noreferrer"
                  className="flex items-start gap-4 px-6 py-4 border-b border-black/[0.05] hover:bg-cream/50 transition-colors last:border-b-0 no-underline group"
                >
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: DOT_COLORS[i % 5] }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-ink2 leading-snug group-hover:text-teal transition-colors truncate">{c.message}</div>
                    <div className="text-[11px] text-ink3 font-mono mt-1">{c.repo} · {c.sha} · {timeAgo(c.date)}</div>
                  </div>
                </a>
              ))
            ) : <div className="px-6 py-4"><EmptyState emoji="📝" title="No commits found" /></div>}
        </CardBody>
      </Card>
    </div>
  );
}
