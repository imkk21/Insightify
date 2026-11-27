import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGithub } from '../hooks/useData';
import { PageHeader, Card, CardTitle, Masonry, Stat, LangBar, Skeleton, EmptyState, ErrorMsg, RefreshButton } from '../components/UI';
import { ContributionCalendar, BarChart, codingPatterns, WEEKDAYS, hourLabel } from '../components/Charts';
import { timeAgo } from '../utils';
import { Star, GitFork, GitCommit, GitPullRequest, ExternalLink, Share2, Unplug, Clock } from 'lucide-react';

export const GithubMark = ({ size = 24 }) => (
  <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.742 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

/** One row in a commit / PR feed. Also used on the Today page. */
export const FeedRow = ({ href, icon: Icon, title, meta }) => (
  <li>
    <a href={href} target="_blank" rel="noreferrer" className="group -mx-2 flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-raised">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-line bg-raised text-subtle group-hover:text-accent-hover">
        <Icon size={13} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] text-fg">{title}</span>
        <span className="block truncate font-mono text-2xs text-subtle">{meta}</span>
      </span>
    </a>
  </li>
);

/** Repository tile. Also used on the public profile. */
export const RepoCard = ({ repo, showPushed = true }) => (
  <a href={repo.url} target="_blank" rel="noreferrer" className="card card-hover group block">
    <div className="flex items-start justify-between gap-2">
      <div className="truncate font-mono text-[13px] font-medium text-fg">{repo.name}</div>
      <ExternalLink size={13} className="mt-0.5 shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
    </div>
    {repo.description && <p className="mt-1.5 text-[13px] text-muted">{repo.description}</p>}
    <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-2xs text-subtle">
      {repo.language && <span className="badge">{repo.language}</span>}
      <span className="inline-flex items-center gap-1"><Star size={12} aria-hidden="true" /> {repo.stars}</span>
      <span className="inline-flex items-center gap-1"><GitFork size={12} aria-hidden="true" /> {repo.forks}</span>
      {showPushed && repo.pushedAt && <span>pushed {timeAgo(repo.pushedAt)}</span>}
    </div>
  </a>
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
    <Card className="glow mx-auto max-w-lg p-8 text-center sm:p-10">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-line-strong bg-raised text-fg shadow">
        <GithubMark size={24} />
      </span>
      <h2 className="mt-5 text-lg font-semibold">Connect your GitHub</h2>
      <p className="mt-1.5 text-muted">See your contribution calendar, streaks, coding hours, languages and pull requests.</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="gh-username" className="sr-only">GitHub username</label>
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-subtle">github.com/</span>
          <input id="gh-username" className="input pl-[92px] font-mono" placeholder="username" value={username} autoComplete="off"
            onChange={(e) => { setUsername(e.target.value); setError(''); }} disabled={connecting} />
        </div>
        <button type="submit" disabled={connecting || !username.trim()} className="btn-primary">
          {connecting ? 'Connecting…' : 'Connect'}
        </button>
      </form>
      {error && <div className="mt-4 text-left"><ErrorMsg message={error} /></div>}
      <p className="mt-4 text-xs text-subtle">Public activity only for now. Each GitHub account links to one Insightify account.</p>
    </Card>
  );
}

export default function ActivityPage() {
  const { data, loading, error, sync, connect, disconnect } = useGithub();
  const { profile: me } = useAuth();
  const connected = !!data?.totals;

  if (!connected) {
    return (
      <div>
        <PageHeader eyebrow="Engineering" title="Activity" subtitle="Your GitHub activity, in depth." />
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
            <Skeleton className="h-48" />
          </div>
        ) : <ConnectPanel onConnect={connect} />}
      </div>
    );
  }

  const t = data.totals;
  const p = data.profile;
  const patterns = codingPatterns(data.recentCommits);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <img src={p.avatarUrl} alt="" className="h-14 w-14 shrink-0 rounded-full bg-raised ring-1 ring-line-strong ring-offset-2 ring-offset-bg" />
          <div className="min-w-0">
            <h1 className="truncate text-[24px] font-semibold leading-tight tracking-tight text-gradient">{p.name}</h1>
            <p className="truncate text-[13px] text-muted">
              <span className="font-mono text-subtle">@{data.username}</span>{p.bio ? ` · ${p.bio}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={me?.publicProfile ? `/u/${data.username}` : '/settings'} className="btn-ghost"
            title={me?.publicProfile ? 'Your public profile' : 'Turn on your public profile in Settings'}>
            <Share2 size={14} aria-hidden="true" /> {me?.publicProfile ? 'Public profile' : 'Share'}
          </Link>
          <a href={p.url} target="_blank" rel="noreferrer" className="btn-ghost"><GithubMark size={14} /> GitHub</a>
          <button onClick={disconnect} className="btn-ghost"><Unplug size={14} aria-hidden="true" /> Disconnect</button>
          <RefreshButton onClick={sync} loading={loading} label="Sync" />
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

      <Card className="mb-4">
        <CardTitle
          title={<><span className="font-mono">{t.contributionsYear.toLocaleString()}</span> contributions in the last year</>}
          subtitle={`Updated ${timeAgo(data.fetchedAt)}`} />
        <div className="overflow-x-auto no-scrollbar"><div className="min-w-[680px]"><ContributionCalendar days={data.calendar} maxScale={0} /></div></div>
      </Card>

      <div className="mb-4 grid items-start gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle
            icon={<Clock size={14} />}
            title="When you code"
            subtitle={data.recentCommits.length
              ? `Peak around ${hourLabel(patterns.peakHour)} on ${WEEKDAYS[patterns.peakDay]}s · last ${data.recentCommits.length} commits, your time zone`
              : 'No recent commits to analyse'}
          />
          {data.recentCommits.length > 0 && (
            <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
              <div><div className="label mb-3">By hour</div><BarChart values={patterns.hours} labels={patterns.hourLabels} labelEvery={3} highlight={patterns.peakHour} /></div>
              <div><div className="label mb-3">By weekday</div><BarChart values={patterns.weekdays} labels={WEEKDAYS} highlight={patterns.peakDay} /></div>
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

      <div className="mb-10 grid items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle icon={<GitCommit size={14} />} title="Recent commits" />
          {data.recentCommits.length ? (
            <ul className="space-y-0.5">
              {data.recentCommits.slice(0, 8).map((c) => (
                <FeedRow key={c.sha + c.repo} href={c.url} icon={GitCommit} title={c.message} meta={`${c.repo} · ${c.sha} · ${timeAgo(c.date)}`} />
              ))}
            </ul>
          ) : <EmptyState title="No recent commits" />}
        </Card>
        <Card>
          <CardTitle icon={<GitPullRequest size={14} />} title="Pull requests" />
          {data.pullRequests.length ? (
            <ul className="space-y-0.5">
              {data.pullRequests.slice(0, 8).map((pr) => (
                <FeedRow key={pr.url} href={pr.url} icon={GitPullRequest} title={pr.title} meta={`${pr.repo} · ${pr.state.toLowerCase()} · ${timeAgo(pr.createdAt)}`} />
              ))}
            </ul>
          ) : <EmptyState title="No pull requests yet" subtitle="Open one on a project you use: it's the fastest way to grow." />}
        </Card>
      </div>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold">Repositories</h2>
          <span className="font-mono text-xs text-subtle">{data.topRepos.length} shown</span>
        </div>
        <Masonry cols="columns-1 md:columns-2 xl:columns-3 2xl:columns-4">
          {data.topRepos.map((repo) => <RepoCard key={repo.url} repo={repo} />)}
        </Masonry>
      </section>
    </div>
  );
}
