import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo, Footer } from '../components/Brand';
import { Masonry, ErrorMsg } from '../components/UI';
import { GitBranch, Sparkles, CloudSun, Newspaper, Music, Code2 } from 'lucide-react';

// Varied heights and surfaces give the masonry its pinboard rhythm
const FEATURES = [
  { icon: Sparkles,  title: 'A weekly insight, written for you', text: 'Every Monday, Gemini reads your commits, local weather and the week in tech, and tells you what it means.', tone: 'bg-char text-white', pad: 'p-8 pb-16' },
  { icon: GitBranch, title: 'GitHub at a glance', text: 'Repositories, stars, languages and your latest commits in one place.', tone: 'bg-fog', pad: 'p-6' },
  { icon: CloudSun,  title: 'Weather where you code', text: 'Current conditions and a five-day outlook from your browser location.', tone: 'bg-sand', pad: 'p-6 pb-12' },
  { icon: Newspaper, title: 'Tech headlines', text: 'The latest technology news, refreshed every hour.', tone: 'bg-fog', pad: 'p-6 pb-10' },
  { icon: Music,     title: 'Music while you work', text: 'Connect Spotify and keep a playlist going in a small floating player.', tone: 'bg-warm', pad: 'p-8' },
  { icon: Code2,     title: 'A second pair of eyes', text: 'Paste a snippet and get a cleaner version with an explanation. Plus a simple task board.', tone: 'bg-fog', pad: 'p-6 pb-14' },
];

const GoogleMark = () => (
  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  </span>
);

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
    <div className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex h-16 w-full max-w-[1680px] items-center px-4 sm:px-6">
        <Logo />
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 pb-16 pt-12 text-center sm:pt-20">
          <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl xl:text-display">
            Your developer week, at a glance.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-olive">
            GitHub activity, weather, tech news and music in one calm dashboard, with a weekly insight written by Gemini.
          </p>
          {error && <div className="mx-auto mt-6 max-w-md"><ErrorMsg message={error} /></div>}
          <button onClick={handleGoogle} disabled={loading} className="btn-primary mt-8 px-6 py-3 text-base">
            <GoogleMark />
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>
        </section>

        <section className="mx-auto max-w-[1312px] px-4 pb-20 sm:px-6" aria-label="Features">
          <Masonry>
            {FEATURES.map(({ icon: Icon, title, text, tone, pad }) => (
              <div key={title} className={`rounded-xl ${tone} ${pad}`}>
                <span className="btn-circle bg-white/80 text-plum"><Icon size={20} aria-hidden="true" /></span>
                <h2 className="mt-5 text-section">{title}</h2>
                <p className="mt-2 opacity-80">{text}</p>
              </div>
            ))}
          </Masonry>
        </section>
      </main>

      <Footer />
    </div>
  );
}
