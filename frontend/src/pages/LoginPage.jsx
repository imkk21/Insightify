import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setLoading(true); setError('');
    try { await loginWithGoogle(); }
    catch (e) { setError(e.message || 'Login failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex text-foreground overflow-hidden">
      {/* Visuals Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 relative overflow-hidden bg-[#1a1714]">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#14b8a6]/20 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-syne font-black text-4xl text-white tracking-tight">
            Insightify<span className="text-amber">.</span>
          </motion.div>
        </div>

        <div className="relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-white text-6xl font-syne font-black leading-tight mb-6"
          >
            Unleash your<br />true potential.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="text-white/60 text-xl font-light max-w-md leading-relaxed"
          >
            The intelligence platform that transforms your coding activity into actionable weekly insights.
          </motion.p>
        </div>

        <div className="relative z-10 flex gap-3 flex-wrap">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex gap-2">
            {['React', 'Node.js', 'Firebase', 'Gemini AI'].map(t => (
              <span key={t} className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-mono backdrop-blur-md">{t}</span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Login Panel */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10 dark:bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
          className="w-full max-w-sm backdrop-blur-2xl bg-card border border-border p-10 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.05)]"
        >
          <div className="lg:hidden text-center mb-10">
            <div className="font-syne font-black text-4xl text-foreground">Insightify<span className="text-amber">.</span></div>
          </div>

          <h2 className="font-syne font-black text-3xl text-foreground tracking-tight mb-2">Welcome</h2>
          <p className="text-sm text-ink3 mb-10">
            Sign in to access your developer core.
          </p>

          {error && (
            <div className="mb-5 text-rose text-sm bg-rose/10 border border-rose/20 rounded-xl px-4 py-3">⚠ {error}</div>
          )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-foreground border border-border rounded-2xl px-6 py-4 text-sm font-bold text-background hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 shadow-lg shadow-black/10"
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </button>

          {/iPhone|iPad|iPod|Android/i.test(window.navigator.userAgent) && (
            <div className="mt-8 p-4 bg-amber/5 border border-amber/10 rounded-2xl flex gap-3">
              <div className="w-5 h-5 rounded-full bg-amber/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-black text-amber">!</span>
              </div>
              <p className="text-[10px] text-ink3 leading-relaxed">
                <span className="text-foreground font-bold uppercase tracking-wider block mb-1">Mobile Optimize</span>
                For the best experience, open this link directly in <b>Safari</b> or <b>Chrome</b>. Some in-app browsers (like Instagram/GitHub) may block the login secure layer.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
