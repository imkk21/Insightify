import { useState } from 'react';
import { useGithub } from '../hooks/useData';
import { PageHeader, Card, CardTitle, Masonry, Stat, LangBar, Loader, EmptyState, ErrorMsg, RefreshButton } from '../components/UI';
import { timeAgo } from '../utils';
import { Star, GitFork } from 'lucide-react';

const GithubMark = ({ size = 24 }) => (
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
      <p className="mt-2 text-olive">Enter your username to load your repositories, languages, stars and recent commits.</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="gh-username" className="sr-only">GitHub username</label>
        <input
          id="gh-username"
          className="input"
          placeholder="your-github-username"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setError(''); }}
          disabled={connecting}
        />
        <button type="submit" disabled={connecting || !username.trim()} className="btn-primary">
          {connecting ? 'Connecting…' : 'Connect'}
        </button>
      </form>
      {error && <div className="mt-4 text-left"><ErrorMsg message={error} /></div>}
      <p className="mt-4 text-xs text-olive">Each GitHub account can be linked to one Insightify account.</p>
    </Card>
  );
}

export default function GithubPage() {
  const { data, loading, error, sync, connect, disconnect } = useGithub();
  const connected = !!data?.username;

  if (!connected) {
    return (
      <div>
        <PageHeader title="GitHub" subtitle="Repository and activity insights" />
        {loading ? <Loader /> : <ConnectPanel onConnect={connect} />}
      </div>
    );
  }

  const langs = data.languages ? Object.entries(data.languages).sort((a, b) => b[1] - a[1]).slice(0, 6) : [];
  const total = langs.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div>
      <PageHeader title="GitHub" subtitle={`@${data.username} · updated ${timeAgo(data.fetchedAt)}`}>
        <RefreshButton onClick={sync} loading={loading} />
        <button onClick={disconnect} className="btn-ghost">Disconnect</button>
      </PageHeader>

      {error && <div className="mb-6"><ErrorMsg message={error} /></div>}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Repositories" value={data.totalRepos} />
        <Stat label="Stars" value={data.totalStars} />
        <Stat label="Forks" value={data.totalForks} />
        <Stat label="Followers" value={data.followers} />
      </div>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <CardTitle title="Languages" subtitle={`Share of ${data.totalRepos} repositories`} />
          {langs.length ? (
            <div className="space-y-4">
              {langs.map(([lang, n]) => <LangBar key={lang} name={lang} pct={Math.round((n / total) * 100)} />)}
            </div>
          ) : <EmptyState title="No language data" />}
        </Card>

        <section>
          <h2 className="mb-4 font-bold">Top repositories</h2>
          {data.topRepos?.length ? (
            <Masonry cols="columns-1 md:columns-2">
              {data.topRepos.map((repo) => (
                <a key={repo.url} href={repo.url} target="_blank" rel="noreferrer" className="card group block hover:bg-sand">
                  <div className="font-bold group-hover:underline">{repo.name}</div>
                  {repo.description && <p className="mt-1 text-sm text-olive">{repo.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-olive">
                    {repo.language && <span className="badge bg-white">{repo.language}</span>}
                    <span className="inline-flex items-center gap-1"><Star size={14} aria-hidden="true" /> {repo.stars}</span>
                    <span className="inline-flex items-center gap-1"><GitFork size={14} aria-hidden="true" /> {repo.forks}</span>
                  </div>
                </a>
              ))}
            </Masonry>
          ) : <Card><EmptyState title="No repositories yet" /></Card>}
        </section>
      </div>
    </div>
  );
}
