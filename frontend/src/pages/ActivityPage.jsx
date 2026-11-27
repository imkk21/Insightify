import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGithub } from '../hooks/useData';
import { PageHeader, Card, CardTitle, Masonry, Stat, LangBar, Loader, EmptyState, ErrorMsg, RefreshButton } from '../components/UI';
import { ContributionCalendar, BarChart, codingPatterns, WEEKDAYS, hourLabel } from '../components/Charts';
import { timeAgo } from '../utils';
import { Star, GitFork, GitCommit, GitPullRequest, ExternalLink, Share2 } from 'lucide-react';

export const GithubMark = ({ size = 24 }) => (
  <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.742 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

function ConnectPanel({ onConnect }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setError(''); setConnecting(true);
    try { await onConnect(username.trim()); }
    catch (err) { setError(err.message); }
    finally { setConnecting(false); }
  };

  return (
    <Card className="mx-auto mt-4 max-w-lg rounded-xl p-8 text-center sm:p-10">
      <span className="btn-circle mx-auto h-16 w-16 bg-plum text-white"><GithubMark size={30} /></span>
      <h2 className="mt-5 text-section">Connect your GitHub</h2>
      <p className="mt-2 text-olive">See your contribution calendar, streaks, coding hours, languages and pull requests.</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="gh-username" className="sr-only">GitHub username</label>
        <input id="gh-username" className="input" placeholder="your-github-username" value={username}
          onChange={(e) => { setUsername(e.target.value); setError(''); }} disabled={connecting} />
        <button type="submit" disabled={connecting || !username.trim()} className="btn-primary">
          {connecting ? 'Connecting…' : 'Connect'}
        </button>
      </form>
      {error && <div className="mt-4 text-left"><ErrorMsg message={error} /></div>}
      <p className="mt-4 text-xs text-olive">Public activity only for now. Each GitHub account links to one Insightify account.</p>
    </Card>
  );
}

const ListRow = ({ href, icon, title, meta }) => (
  <li className="border-t border-sand first:border-0">
    <a href={href} target="_blank" rel="noreferrer" className="group flex items-start gap-3 py-3">
      <span className="btn-circle h-8 w-8">{icon}</span>
      <span className="min-w-0 pt-0.5">
        <span className="block truncate font-semibold group-hover:underline">{title}</span>
        <span className="block text-xs text-olive">{meta}</span>
      </span>
    </a>
  </li>
);

export default function ActivityPage() {
  const { data, loading, error, sync, connect, disconnect } = useGithub();
  const { profile: me } = useAuth();
  const connected = !!data?.totals;

  if (!connected) {
    return (
      <div>
        <PageHeader title="Activity" subtitle="Your GitHub activity, in depth" />
        {loading ? <Loader /> : <ConnectPanel onConnect={connect} />}
      </div>
    );
  }

  const t = data.totals;
  const p = data.profile;
  const patterns = codingPatterns(data.recentCommits);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <img src={p.avatarUrl} alt="" className="h-16 w-16 shrink-0 rounded-full bg-sand" />
          <div className="min-w-0">
            <h1 className="text-section">{p.name}</h1>
            <p className="truncate text-olive">@{data.username}{p.bio ? ` · ${p.bio}` : ''}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={me?.publicProfile ? `/u/${data.username}` : '/settings'} className="btn-ghost"
            title={me?.publicProfile ? 'Your public profile' : 'Turn on your public profile in Settings'}>
            <Share2 size={16} aria-hidden="true" /> {me?.publicProfile ? 'Public profile' : 'Share'}
          </Link>
          <a href={p.url} target="_blank" rel="noreferrer" className="btn-ghost"><ExternalLink size={16} aria-hidden="true" /> GitHub</a>
          <RefreshButton onClick={sync} loading={loading} />
          <button onClick={disconnect} className="btn-ghost">Disconnect</button>
        </div>
      </div>

      {error && <div className="mb-6"><ErrorMsg message={error} /></div>}

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Contributions" value={t.contributionsYear} hint="last 12 months" />
        <Stat label="Commits" value={t.commitsYear} hint="last 12 months" />
        <Stat label="Pull requests" value={t.prsYear} hint={`${t.reviewsYear} reviews`} />
        <Stat label="Current streak" value={`${data.streak.current}d`} hint={`best ${data.streak.longest} days`} />
        <Stat label="Repositories" value={t.repos} hint={`${t.stars} stars`} />
        <Stat label="Followers" value={p.followers} hint={`following ${p.following}`} />
      </div>

      <Card className="mb-8">
        <CardTitle title={`${t.contributionsYear} contributions in the last year`} subtitle={`Updated ${timeAgo(data.fetchedAt)}`} />
        <div className="overflow-x-auto"><div className="min-w-[680px]"><ContributionCalendar days={data.calendar} maxScale={0} /></div></div>
      </Card>

      <div className="mb-8 grid items-start gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle
            title="When you code"
            subtitle={data.recentCommits.length
              ? `Your peak is around ${hourLabel(patterns.peakHour)} on ${WEEKDAYS[patterns.peakDay]}s · from your last ${data.recentCommits.length} commits, in your time zone`
              : 'No recent commits to analyse'}
          />
          {data.recentCommits.length > 0 && (
            <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
              <BarChart values={patterns.hours} labels={patterns.hourLabels} labelEvery={3} highlight={patterns.peakHour} />
              <BarChart values={patterns.weekdays} labels={WEEKDAYS} highlight={patterns.peakDay} />
            </div>
          )}
        </Card>
        <Card>
          <CardTitle title="Languages" subtitle="Share of code across your repositories" />
          {data.languages.length
            ? <div className="space-y-4">{data.languages.map((l) => <LangBar key={l.name} name={l.name} pct={l.pct} />)}</div>
            : <EmptyState title="No language data" />}
        </Card>
      </div>

      <div className="mb-8 grid items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle title="Recent commits" />
          {data.recentCommits.length ? (
            <ul>
              {data.recentCommits.slice(0, 8).map((c) => (
                <ListRow key={c.sha + c.repo} href={c.url} icon={<GitCommit size={16} aria-hidden="true" />}
                  title={c.message} meta={`${c.repo} · ${c.sha} · ${timeAgo(c.date)}`} />
              ))}
            </ul>
          ) : <EmptyState title="No recent commits" />}
        </Card>
        <Card>
          <CardTitle title="Pull requests" />
          {data.pullRequests.length ? (
            <ul>
              {data.pullRequests.slice(0, 8).map((pr) => (
                <ListRow key={pr.url} href={pr.url} icon={<GitPullRequest size={16} aria-hidden="true" />}
                  title={pr.title} meta={`${pr.repo} · ${pr.state.toLowerCase()} · ${timeAgo(pr.createdAt)}`} />
              ))}
            </ul>
          ) : <EmptyState title="No pull requests yet" subtitle="Open one on a project you use: it's the fastest way to grow." />}
        </Card>
      </div>

      <section>
        <h2 className="mb-4 font-bold">Repositories</h2>
        <Masonry cols="columns-1 md:columns-2 xl:columns-4">
          {data.topRepos.map((repo) => (
            <a key={repo.url} href={repo.url} target="_blank" rel="noreferrer" className="card group block hover:bg-sand">
              <div className="font-bold group-hover:underline">{repo.name}</div>
              {repo.description && <p className="mt-1 text-sm text-olive">{repo.description}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-olive">
                {repo.language && <span className="badge bg-white">{repo.language}</span>}
                <span className="inline-flex items-center gap-1"><Star size={14} aria-hidden="true" /> {repo.stars}</span>
                <span className="inline-flex items-center gap-1"><GitFork size={14} aria-hidden="true" /> {repo.forks}</span>
                <span>pushed {timeAgo(repo.pushedAt)}</span>
              </div>
            </a>
          ))}
        </Masonry>
      </section>
    </div>
  );
}
