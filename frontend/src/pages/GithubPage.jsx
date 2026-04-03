import { useState } from 'react';
import { useGithub } from '../hooks/useData';
import {
  PageHeader, StatCard, Card, CardHeader, CardBody,
  LangBar, SyncButton, DotLoader, EmptyState, ErrorMsg
} from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const LANG_COLORS = ['#e8a030','#4361b8','#14b8a6','#e05a6a','#6b6258'];

function ConnectGithubPanel({ onConnect, loading }) {
  const [username,   setUsername]   = useState('');
  const [error,      setError]      = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    const uname = username.trim();
    if (!uname) { setError('Please enter your GitHub username.'); return; }
    setError(''); setConnecting(true);
    try {
      await onConnect(uname, '');
    } catch (e) {
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  };

  const isAlreadyLinked = error.includes('already connected to another');

  return (
    <div className="card p-10 text-center max-w-lg mx-auto mt-8 animate-fade-up">
      {/* GitHub icon */}
      <div className="w-16 h-16 rounded-2xl bg-ink flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.742 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
        </svg>
      </div>

      <h2 className="font-syne font-black text-xl text-ink mb-2">Connect your GitHub</h2>
      <p className="text-sm text-ink3 mb-7 leading-relaxed">
        Enter your GitHub username to load your repositories, languages, stars, and commit activity.
        <br />
        <span className="text-[11px] font-mono text-amber mt-1 block">
          Each GitHub account can only be linked to one Insightify account.
        </span>
      </p>

      <div className="flex gap-3 mb-3">
        <input
          className="input flex-1"
          placeholder="your-github-username"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          disabled={connecting || loading}
        />
        <button
          onClick={handleConnect}
          disabled={connecting || loading || !username.trim()}
          className="btn-primary whitespace-nowrap"
        >
          {connecting || loading ? (
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Connecting…
            </span>
          ) : 'Connect'}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className={`mt-3 rounded-xl px-4 py-3 text-sm text-left ${
          isAlreadyLinked
            ? 'bg-rose/5 border border-rose/20 text-rose'
            : 'bg-rose/5 border border-rose/20 text-rose'
        }`}>
          {isAlreadyLinked ? (
            <div>
              <div className="font-semibold mb-1">⛔ Account Already Linked</div>
              <div className="text-xs leading-relaxed">{error}</div>
              <div className="mt-2 text-xs text-rose/70">
                Please use a different GitHub username, or sign in to the Insightify account that already has this GitHub connected.
              </div>
            </div>
          ) : (
            <span>⚠ {error}</span>
          )}
        </div>
      )}

      <p className="text-xs text-ink3 mt-4">
        Your username is stored securely and only used to call the GitHub public API.
      </p>
    </div>
  );
}

export default function GithubPage() {
  const { data, loading, error, sync, connect, disconnect } = useGithub();
  const isConnected = !!data?.username;

  const langs = data?.languages
    ? Object.entries(data.languages).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];
  const total = langs.reduce((s, [, v]) => s + v, 0) || 1;
  const chartData = langs.map(([name, count]) => ({
    name, pct: Math.round((count / total) * 100),
  }));

  return (
    <div>
      <PageHeader title="GitHub Analytics" subtitle="Repository & activity insights">
        {isConnected && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-teal2/10 border border-teal2/20 rounded-xl text-xs font-mono text-teal2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal2 animate-pulse" />
              @{data.username}
            </div>
            <SyncButton onClick={sync} loading={loading} />
            <button
              onClick={disconnect}
              className="btn-outline text-xs py-2 text-rose border-rose/20 hover:border-rose hover:text-rose"
            >
              Disconnect
            </button>
          </div>
        )}
      </PageHeader>

      {/* Show non-auth errors only when connected */}
      {error && isConnected && (
        <div className="mb-5"><ErrorMsg message={error} /></div>
      )}

      {!isConnected && !loading ? (
        <ConnectGithubPanel onConnect={connect} loading={loading} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="card h-36 animate-pulse bg-black/[0.03]" />
              ))
            ) : (
              <>
                <StatCard icon="📦" value={data?.totalRepos}  label="Repositories" accentColor="#e8a030" delay={0}   />
                <StatCard icon="⭐" value={data?.totalStars}  label="Total Stars"   accentColor="#14b8a6" delay={80}  />
                <StatCard icon="🍴" value={data?.totalForks}  label="Total Forks"   accentColor="#e05a6a" delay={160} />
                <StatCard icon="👥" value={data?.followers}   label="Followers"     accentColor="#4361b8" delay={240} />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <Card>
              <CardHeader
                title="Language Usage"
                subtitle={`Across ${data?.totalRepos || 0} repositories`}
                badge="GitHub API"
                badgeStyle="bg-amber/10 text-amber border-amber/20"
              />
              <CardBody>
                {loading ? <DotLoader label="Fetching languages…" /> : langs.length ? (
                  <div className="space-y-4">
                    {langs.map(([lang, count], i) => (
                      <LangBar key={lang} name={lang} pct={Math.round((count / total) * 100)} color={LANG_COLORS[i]} />
                    ))}
                  </div>
                ) : <EmptyState emoji="💻" title="No language data" />}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Language Chart" subtitle="Visual breakdown" />
              <CardBody>
                {loading ? <DotLoader label="Building chart…" /> : chartData.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} barCategoryGap="30%">
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#6b6258' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#6b6258' }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip formatter={(v) => [`${v}%`, 'Usage']} contentStyle={{ borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                      <Bar dataKey="pct" fill="#e8a030" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState emoji="📊" title="No chart data" />}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Top Repositories" subtitle="Sorted by stars" />
            <CardBody className="!p-0">
              {loading ? (
                <div className="px-6 py-4"><DotLoader label="Loading repos…" /></div>
              ) : data?.topRepos?.length ? (
                <div>
                  {data.topRepos.map((repo, i) => (
                    <a key={i} href={repo.url} target="_blank" rel="noreferrer"
                      className="flex items-start justify-between px-6 py-4 border-b border-black/[0.05] last:border-b-0 hover:bg-cream/50 transition-colors no-underline group"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="font-syne font-semibold text-sm text-ink group-hover:text-teal transition-colors">{repo.name}</div>
                        <div className="text-xs text-ink3 mt-0.5 truncate">{repo.description || 'No description'}</div>
                        <div className="flex gap-2 mt-2">
                          {repo.language && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20">{repo.language}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-mono font-medium text-ink">⭐ {repo.stars}</div>
                        <div className="text-xs text-ink3 mt-0.5">🍴 {repo.forks}</div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-4"><EmptyState emoji="📦" title="No repositories" /></div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
