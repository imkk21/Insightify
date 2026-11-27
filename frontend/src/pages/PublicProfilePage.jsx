import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Logo, Footer } from '../components/Brand';
import { Card, CardTitle, Masonry, Stat, LangBar, Skeleton, EmptyState } from '../components/UI';
import { ContributionCalendar } from '../components/Charts';
import WrappedCard, { downloadCardPng } from '../components/WrappedCard';
import { GithubMark, RepoCard } from './ActivityPage';
import PublicSkills from '../components/skills/PublicSkills';
import { timeAgo } from '../utils';
import { Download, Link2, Share2, Check, UserX } from 'lucide-react';

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
        <Download size={14} aria-hidden="true" /> Download image
      </button>
      <button onClick={copy} className="btn-secondary">
        {copied ? <Check size={14} className="text-success" /> : <Link2 size={14} />} {copied ? 'Link copied' : 'Copy link'}
      </button>
      {navigator.share && (
        <button onClick={() => navigator.share({ title: `${name}'s year in code`, url }).catch(() => {})} className="btn-secondary">
          <Share2 size={14} aria-hidden="true" /> Share
        </button>
      )}
    </div>
  );
}

const SectionTitle = ({ children, meta }) => (
  <div className="mb-4 flex items-baseline justify-between">
    <h2 className="text-[15px] font-semibold">{children}</h2>
    {meta && <span className="font-mono text-xs text-subtle">{meta}</span>}
  </div>
);

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
    <div className="app-backdrop flex min-h-screen flex-col overflow-x-hidden">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Insightify home"><Logo /></Link>
          {user
            ? <Link to="/" className="btn-secondary btn-sm">Back to dashboard</Link>
            : <Link to="/login" className="btn-primary btn-sm">Create your own</Link>}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {state === 'loading' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-5"><Skeleton className="h-20 w-20 rounded-full" /><div className="space-y-2"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-40" /></div></div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
            <Skeleton className="h-48" />
          </div>
        ) : state === 'missing' ? (
          <Card className="mx-auto mt-10 max-w-lg">
            <EmptyState icon={<UserX size={20} />} title="This profile isn't public"
              subtitle={`@${username} hasn't shared a public Insightify profile, or it doesn't exist.`}>
              <Link to="/login" className="btn-primary">Make your own</Link>
            </EmptyState>
          </Card>
        ) : (
          <>
            <section className="mb-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <div className="relative">
                <div className="absolute -inset-3 rounded-full bg-accent/25 blur-xl" aria-hidden="true" />
                <img src={p.avatarUrl} alt="" className="relative h-20 w-20 rounded-full bg-raised ring-1 ring-line-strong ring-offset-4 ring-offset-bg sm:h-24 sm:w-24" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="label mb-1.5">Developer profile</div>
                <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-gradient sm:text-[40px]">{p.name}</h1>
                <p className="mt-1 text-muted"><span className="font-mono text-subtle">@{data.username}</span>{p.bio ? ` · ${p.bio}` : ''}</p>
              </div>
              <a href={p.url} target="_blank" rel="noreferrer" className="btn-secondary"><GithubMark size={14} /> View on GitHub</a>
            </section>

            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Stat label="Contributions" value={t.contributionsYear} hint="last 12 months" />
              <Stat label="Commits" value={t.commitsYear} />
              <Stat label="Pull requests" value={t.prsYear} hint={`${t.reviewsYear} reviews`} />
              <Stat label="Longest streak" value={`${data.streak.longest}d`} hint={`current ${data.streak.current}d`} />
              <Stat label="Repositories" value={t.repos} />
              <Stat label="Stars" value={t.stars} />
            </div>

            <PublicSkills username={username} />

            <Card className="mb-10">
              <CardTitle
                title={<><span className="font-mono">{t.contributionsYear.toLocaleString()}</span> contributions in the last year</>}
                subtitle={`Updated ${timeAgo(data.fetchedAt)}`} />
              <div className="overflow-x-auto no-scrollbar"><div className="min-w-[680px]"><ContributionCalendar days={data.calendar} maxScale={0} /></div></div>
            </Card>

            <div className="mb-10 grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <section aria-labelledby="wrapped-title">
                <SectionTitle meta="1200 × 630 PNG"><span id="wrapped-title">Year in code</span></SectionTitle>
                <WrappedCard ref={cardRef} username={data.username} name={p.name} wrapped={data.wrapped} calendar={data.calendar} />
                <ShareActions cardRef={cardRef} username={data.username} name={p.name} />
              </section>
              <Card>
                <CardTitle title="Languages" subtitle="Share of code across repositories" />
                {data.languages.length
                  ? <div className="space-y-4">{data.languages.map((l) => <LangBar key={l.name} name={l.name} pct={l.pct} />)}</div>
                  : <EmptyState title="No language data" />}
              </Card>
            </div>

            {data.topRepos.length > 0 && (
              <section>
                <SectionTitle meta={`${data.topRepos.length} public`}>Repositories</SectionTitle>
                <Masonry>
                  {data.topRepos.map((repo) => <RepoCard key={repo.url} repo={repo} showPushed={false} />)}
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
