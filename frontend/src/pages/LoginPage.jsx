import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleGoogle = async () => {
    setLoading(true); setError('');
    try { await loginWithGoogle(); }
    catch (e) { setError(e.message || 'Login failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber/10 blur-xl" />
        <div className="absolute bottom-20 -left-16 w-48 h-48 rounded-full bg-teal2/10 blur-xl" />

        <div className="relative z-10">
          <div className="font-syne font-black text-3xl text-white tracking-tight">
            Insightify<span className="text-amber">.</span>
          </div>
          <div className="text-xs font-mono text-white/30 tracking-[2.5px] uppercase mt-1">Developer Intelligence</div>
        </div>

        <div className="relative z-10 space-y-8">
          <blockquote className="text-white/70 text-xl font-light leading-relaxed italic">
            "Your code tells a story.<br/>Let AI help you understand it."
          </blockquote>
          <div className="space-y-4">
            {[
              { icon: '⚡', text: 'GitHub activity — connect after login' },
              { icon: '📍', text: 'Weather via your real-time location' },
              { icon: '📰', text: 'Tech headlines from News API' },
              { icon: '🤖', text: 'AI weekly insights via Gemini' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <span className="text-white/50 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex gap-2 flex-wrap">
          {['React.js','Node.js','MongoDB','Firebase','Gemini AI'].map((t) => (
            <span key={t} className="px-3 py-1 rounded-full border border-white/10 text-white/30 text-xs font-mono">{t}</span>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden text-center mb-10">
            <div className="font-syne font-black text-3xl text-ink">Insightify<span className="text-amber">.</span></div>
            <p className="text-sm text-ink3 mt-1">AI-Powered Developer Insights</p>
          </div>

          <h2 className="font-syne font-black text-2xl text-ink tracking-tight">Welcome back</h2>
          <p className="text-sm text-ink3 mt-1.5 mb-8">
            Sign in with Google to access your developer dashboard.<br/>
            <span className="text-amber">Connect GitHub separately</span> after login.
          </p>

          {error && (
            <div className="mb-5 text-rose text-sm bg-rose/5 border border-rose/20 rounded-xl px-4 py-3">⚠ {error}</div>
          )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-black/10 rounded-xl px-5 py-4 text-sm font-medium text-ink hover:border-black/20 hover:shadow-sm transition-all duration-200 disabled:opacity-50"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <div className="mt-6 p-4 bg-ink/[0.03] rounded-xl border border-black/[0.06]">
            <div className="text-xs font-syne font-semibold text-ink mb-2">After login you can:</div>
            <ul className="space-y-1.5">
              {[
                '🔗 Connect your GitHub username to load stats',
                '📍 Allow location access for real-time weather',
                '✦ Generate AI insights from your data',
              ].map((item) => (
                <li key={item} className="text-xs text-ink3">{item}</li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-ink3 text-center mt-6">
            By signing in you agree to our <span className="underline cursor-pointer">Terms</span> &{' '}
            <span className="underline cursor-pointer">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
