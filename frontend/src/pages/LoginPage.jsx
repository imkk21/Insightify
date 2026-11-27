import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo, Footer } from '../components/Brand';
import { ErrorMsg, Stat, ScoreRing } from '../components/UI';
import { ContributionCalendar } from '../components/Charts';
import { Activity, FileText, ShieldCheck, Radar, Waves, BadgeCheck, Radio, Users, Sparkles, ArrowRight, LayoutDashboard, GitCommit } from 'lucide-react';

const PILLARS = [
  { icon: Activity,    title: 'Activity analytics', text: 'Contribution calendar, streaks, coding hours, languages and PRs — from GitHub GraphQL.' },
  { icon: FileText,    title: 'AI reports',         text: 'Standups and weekly reports written from your real work, sent straight to Slack.' },
  { icon: ShieldCheck, title: 'Security + Autopilot', text: 'Dependency scanning against OSV.dev, with fixes proposed for you automatically.' },
  { icon: Radar,       title: 'Codebase X-ray',     text: 'Hotspots, ownership and complexity across your repositories, at a glance.' },
  { icon: Waves,       title: 'Flow & wellbeing',   text: 'Spot deep-work windows, late nights and burnout risk before they spot you.' },
  { icon: BadgeCheck,  title: 'Proof of skill',     text: 'Verified skills backed by the code you actually shipped, not keywords.' },
  { icon: Radio,       title: 'Morning briefing',   text: 'One calm digest: what changed overnight, what needs you, what to read.' },
  { icon: Users,       title: 'Rooms',              text: 'Team up with friends, run coding challenges and keep each other shipping.' },
];

// Deterministic demo data for the preview (26 weeks starting on a Sunday)
const DEMO_DAYS = Array.from({ length: 26 * 7 }, (_, i) => {
  const v = (i * 7919 + 13) % 17;
  return { date: new Date(Date.UTC(2026, 4, 3) + i * 864e5).toISOString().slice(0, 10), count: v > 11 ? v - 6 : v > 5 ? v % 4 : 0 };
});

const GoogleMark = () => (
  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  </span>
);

/** Faux app window built from the real UI kit, so the preview always matches the product. */
function ProductPreview() {
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 rounded-[40px] bg-accent/20 blur-3xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-xl border border-line-strong bg-bg shadow-lg" aria-hidden="true">
        <div className="flex h-9 items-center gap-1.5 border-b border-line bg-surface px-3">
          {[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-full bg-line-strong" />)}
          <span className="mx-auto rounded-sm bg-raised px-3 py-0.5 font-mono text-2xs text-subtle">insightify.app</span>
        </div>
        <div className="flex">
          <div className="hidden w-44 shrink-0 space-y-1 border-r border-line p-3 md:block">
            {[[LayoutDashboard, 'Today', true], [Activity, 'Activity'], [Radar, 'Codebase X-ray'], [ShieldCheck, 'Security'], [Waves, 'Flow'], [FileText, 'Reports']].map(([Icon, label, active]) => (
              <div key={label} className={`flex h-7 items-center gap-2 rounded-md px-2 text-xs ${active ? 'bg-raised text-fg' : 'text-subtle'}`}>
                <Icon size={13} className={active ? 'text-accent-hover' : ''} /> {label}
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-3 p-4 text-left sm:p-5">
            <div>
              <div className="label">Thursday, 26 November</div>
              <div className="mt-1 text-lg font-semibold text-gradient">Good morning, Ada</div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="This week" value="47" trend={12} hint="contributions" />
              <Stat label="Streak" value="23d" hint="best 41 days" />
              <Stat label="Open tasks" value="5" hint="2 in progress" />
              <Stat label="Security" value="0" hint="all clear" className="hidden lg:block" />
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="card lg:col-span-2">
                <div className="mb-3 text-[13px] font-semibold">This week</div>
                <ContributionCalendar days={DEMO_DAYS} maxScale={0} />
              </div>
              <div className="card glow hidden flex-col border-accent/25 lg:flex">
                <span className="badge badge-accent w-fit"><Sparkles size={11} /> AI insight</span>
                <p className="mt-3 text-[13px] leading-6 text-muted">
                  You shipped <span className="text-fg">3× more PRs</span> on Tuesday mornings. Block 9–11am for deep work.
                </p>
                <div className="mt-auto flex items-center gap-3 pt-3">
                  <ScoreRing value={82} size={56} />
                  <span className="text-xs text-subtle">Flow score</span>
                </div>
              </div>
            </div>
            <div className="card hidden space-y-2 sm:block">
              {['feat: add OSV batch scanning', 'fix: streak off-by-one on UTC midnight'].map((m, i) => (
                <div key={m} className="flex items-center gap-2 text-xs">
                  <GitCommit size={13} className="text-subtle" />
                  <span className="truncate text-fg">{m}</span>
                  <span className="ml-auto shrink-0 font-mono text-2xs text-subtle">{i ? '3h' : '12m'} ago</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" aria-hidden="true" />
    </div>
  );
}

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setLoading(true); setError('');
    try { await loginWithGoogle(); }
    catch (e) { setError(e.message || 'Sign-in failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="app-backdrop flex min-h-screen flex-col overflow-x-hidden">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1">
            <a href="#features" className="btn-ghost hidden sm:inline-flex">Features</a>
            <button onClick={handleGoogle} disabled={loading} className="btn-secondary btn-sm">Sign in</button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 pb-14 pt-16 text-center sm:px-6 sm:pt-24">
          <a href="#features" className="badge badge-accent mx-auto h-6 rounded-full px-2.5 text-xs transition-colors hover:bg-accent/25">
            <Sparkles size={12} aria-hidden="true" /> New: Codebase X-ray, Autopilot and Rooms <ArrowRight size={12} aria-hidden="true" />
          </a>
          <h1 className="mt-6 text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.04em] text-gradient sm:text-[60px] lg:text-[72px]">
            Engineering intelligence for developers who ship.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted sm:text-lg">
            Insightify turns your GitHub activity into a daily command center: analytics, AI-written standups,
            security scanning and focus tools — in one fast, keyboard-first workspace.
          </p>
          {error && <div className="mx-auto mt-6 max-w-md text-left"><ErrorMsg message={error} /></div>}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button onClick={handleGoogle} disabled={loading} className="btn-primary h-11 px-5 text-sm">
              <GoogleMark />
              {loading ? 'Signing in…' : 'Continue with Google'}
            </button>
            <a href="#features" className="btn-ghost h-11 px-4 text-sm">See what's inside <ArrowRight size={14} aria-hidden="true" /></a>
          </div>
          <p className="mt-4 text-xs text-subtle">Free · public GitHub data only · no credit card</p>
        </section>

        <section className="px-4 pb-20 sm:px-6" aria-label="Product preview">
          <ProductPreview />
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6" aria-labelledby="features-title">
          <div className="mb-10 max-w-2xl">
            <div className="label">The platform</div>
            <h2 id="features-title" className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-gradient sm:text-[36px]">
              Everything about your engineering, in one place.
            </h2>
            <p className="mt-3 text-muted">Eight pillars that work together, powered by your own code and activity.</p>
          </div>
          <div className="grid overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 1 }}>
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="group bg-surface p-6 transition-colors hover:bg-raised">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line-strong bg-raised text-muted shadow transition-colors group-hover:border-accent/40 group-hover:text-accent-hover">
                  <Icon size={16} aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-[15px] font-semibold text-fg">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-6 text-muted">{text}</p>
              </div>
            ))}
          </div>

          <div className="card glow mt-16 flex flex-col items-center gap-5 border-accent/25 px-6 py-12 text-center shadow-glow">
            <h2 className="text-[24px] font-semibold tracking-tight text-gradient sm:text-[28px]">Start your first briefing in 30 seconds.</h2>
            <button onClick={handleGoogle} disabled={loading} className="btn-primary h-11 px-5 text-sm">
              <GoogleMark /> {loading ? 'Signing in…' : 'Continue with Google'}
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
