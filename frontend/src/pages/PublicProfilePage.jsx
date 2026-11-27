import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Logo, Footer } from '../components/Brand';
import { Card, CardTitle, Masonry, Stat, LangBar, Loader, EmptyState } from '../components/UI';
import { ContributionCalendar } from '../components/Charts';
import WrappedCard, { downloadCardPng } from '../components/WrappedCard';
import { timeAgo } from '../utils';
import { Star, GitFork, ExternalLink, Download, Link2, Share2, Check } from 'lucide-react';

function ShareActions({ cardRef, username, name }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button onClick={() => downloadCardPng(cardRef.current, `${username}-year-in-code.png`)} className="btn-primary">
        <Download size={16} aria-hidden="true" /> Download image
      </button>
      <button onClick={copy} className="btn-secondary">
        {copied ? <Check size={16} /> : <Link2 size={16} />} {copied ? 'Link copied' : 'Copy link'}
      </button>
      {navigator.share && (
        <button onClick={() => navigator.share({ title: `${name}'s year in code`, url }).catch(() => {})} className="btn-secondary">
          <Share2 size={16} aria-hidden="true" /> Share
        </button>
      )}
    </div>
  );
}

export default function PublicProfilePage() {
  const { username } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | missing
  const cardRef = useRef(null);

  useEffect(() => {
    setState('loading');
    api.get(`/public/${encodeURIComponent(username)}`)
      .then(({ data }) => { setData(data); setState('ok'); })
      .catch(() => setState('missing'));
  }, [username]);

  useEffect(() => {
    if (data) document.title = `${data.profile.name} · Insightify`;
    return () => { document.title = 'Insightify'; };
  }, [data]);

  const t = data?.totals;
  const p = data?.profile;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex h-16 w-full max-w-[1680px] items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Insightify home"><Logo /></Link>
        {user
          ? <Link to="/" className="btn-secondary">Back to your dashboard</Link>
          : <Link to="/login" className="btn-primary">Create your own</Link>}
      </header>

      <main className="mx-auto w-full max-w-[1312px] flex-1 px-4 py-8 sm:px-6">
        {state === 'loading' ? <Loader /> : state === 'missing' ? (
          <Card className="mx-auto mt-10 max-w-lg rounded-xl">
            <EmptyState title="This profile isn't public" subtitle={`@${username} hasn't shared a public Insightify profile, or it doesn't exist.`}>
              <Link to="/login" className="btn-primary">Make your own</Link>
            </EmptyState>
          </Card>
        ) : (
          <>
            <section className="mb-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <img src={p.avatarUrl} alt="" className="h-24 w-24 rounded-full bg-sand" />
              <div className="min-w-0 flex-1">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{p.name}</h1>
                <p className="mt-1 text-lg text-olive">@{data.username}{p.bio ? ` · ${p.bio}` : ''}</p>
              </div>
              <a href={p.url} target="_blank" rel="noreferrer" className="btn-secondary"><ExternalLink size={16} aria-hidden="true" /> GitHub</a>
            </section>

            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Stat label="Contributions" value={t.contributionsYear} hint="last 12 months" />
              <Stat label="Commits" value={t.commitsYear} />
              <Stat label="Pull requests" value={t.prsYear} hint={`${t.reviewsYear} reviews`} />
              <Stat label="Longest streak" value={`${data.streak.longest}d`} hint={`current ${data.streak.current}d`} />
              <Stat label="Repositories" value={t.repos} />
              <Stat label="Stars" value={t.stars} />
            </div>

            <Card className="mb-8">
              <CardTitle title={`${t.contributionsYear} contributions in the last year`} subtitle={`Updated ${timeAgo(data.fetchedAt)}`} />
              <div className="overflow-x-auto"><div className="min-w-[680px]"><ContributionCalendar days={data.calendar} maxScale={0} /></div></div>
            </Card>

            <div className="mb-8 grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <section aria-label="Year in code">
                <h2 className="mb-4 font-bold">Year in code</h2>
                <WrappedCard ref={cardRef} username={data.username} name={p.name} wrapped={data.wrapped} calendar={data.calendar} />
                <ShareActions cardRef={cardRef} username={data.username} name={p.name} />
              </section>
              <Card>
                <CardTitle title="Languages" subtitle="Share of code across repositories" />
                <div className="space-y-4">{data.languages.map((l) => <LangBar key={l.name} name={l.name} pct={l.pct} />)}</div>
              </Card>
            </div>

            {data.topRepos.length > 0 && (
              <section>
                <h2 className="mb-4 font-bold">Repositories</h2>
                <Masonry>
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
              </section>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
