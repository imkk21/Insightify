import { motion } from 'framer-motion';

// ── Skeleton loader ──────────────────────────────────────────────────
export const Skeleton = ({ className = '' }) => (
  <div className={`bg-foreground/5 rounded-2xl animate-pulse ${className}`} />
);

// ── Section page header ──────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-col md:flex-row items-baseline md:items-start justify-between gap-6 mb-12">
    <div>
      <h1 className="font-syne font-black text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tighter leading-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-base text-ink3 font-medium mt-3 italic opacity-80">{subtitle}</p>
      )}
    </div>
    {children && <div className="flex items-center gap-4 flex-wrap">{children}</div>}
  </div>
);

// ── Card wrapper ─────────────────────────────────────────────────────
export const Card = ({ children, className = '', onClick }) => (
  <div
    className={`card ${onClick ? 'cursor-pointer hover:-translate-y-2 transition-all duration-500' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, badge, badgeStyle }) => (
  <div className="flex items-start justify-between px-8 py-6 border-b border-border">
    <div>
      <div className="font-syne font-black text-lg text-foreground tracking-tight">{title}</div>
      {subtitle && <div className="text-[11px] text-ink3/60 font-mono uppercase tracking-widest mt-1.5">{subtitle}</div>}
    </div>
    {badge && (
      <span className={`badge ${badgeStyle}`}>{badge}</span>
    )}
  </div>
);

export const CardBody = ({ children, className = '' }) => (
  <div className={`px-8 py-6 ${className}`}>{children}</div>
);

// ── Stat card ────────────────────────────────────────────────────────
export const StatCard = ({ icon, value, label, change, changeUp = true, accentColor, delay = 0 }) => (
  <div
    className="stat-card group animate-fade-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* top accent bar */}
    <div
      className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
      style={{ background: accentColor }}
    />
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/5"
      style={{ background: `${accentColor}15` }}
    >
      <span style={{ color: accentColor }}>{icon}</span>
    </div>
    <div className="font-syne font-black text-3xl sm:text-4xl text-foreground leading-none tracking-tighter">
      {value ?? '—'}
    </div>
    <div className="text-[11px] font-mono uppercase tracking-widest text-ink3/60 mt-3">{label}</div>
    {change && (
      <div
        className={`text-[10px] font-mono mt-4 flex items-center gap-1.5 px-3 py-1 rounded-full w-fit bg-background border border-border ${changeUp ? 'text-teal2' : 'text-rose'}`}
      >
        <span className="opacity-60">{changeUp ? '▲' : '▼'}</span> {change}
      </div>
    )}
  </div>
);

// ── Language bar ─────────────────────────────────────────────────────
export const LangBar = ({ name, pct, color }) => (
  <div className="group">
    <div className="flex justify-between items-center mb-2.5">
      <span className="text-sm text-foreground font-bold tracking-tight">{name}</span>
      <span className="text-[10px] text-ink3 font-mono opacity-60 tracking-widest uppercase">{pct}% Density</span>
    </div>
    <div className="h-2 bg-background rounded-full overflow-hidden shadow-inner border border-white/5">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="h-full rounded-full shadow-[0_0_12px_rgba(0,0,0,0.1)]"
        style={{ background: color }}
      />
    </div>
  </div>
);

// ── Dot loader ───────────────────────────────────────────────────────
export const DotLoader = ({ label = 'Synchronizing…' }) => (
  <div className="flex items-center gap-3 py-6">
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{ 
            duration: 1, 
            repeat: Infinity, 
            delay: i * 0.2 
          }}
          className="w-2 h-2 rounded-full bg-amber shadow-[0_0_10px_rgba(232,160,48,0.4)]"
        />
      ))}
    </div>
    <span className="text-[11px] font-mono uppercase tracking-[3px] text-ink3/60 ml-2">{label}</span>
  </div>
);

// ── Error message ────────────────────────────────────────────────────
export const ErrorMsg = ({ message }) => (
  <div className="text-rose text-[11px] font-mono uppercase tracking-widest bg-rose/5 border border-rose/20 rounded-xl px-6 py-4 flex items-center gap-3 backdrop-blur-xl animate-shake">
    <span className="text-lg">⚠</span> {message || 'Terminal connection failure'}
  </div>
);

// ── Empty state ──────────────────────────────────────────────────────
export const EmptyState = ({ emoji = '🔍', title, subtitle }) => (
  <div className="text-center py-20 px-8 flex flex-col items-center">
    <div className="text-5xl mb-6 filter drop-shadow-2xl">{emoji}</div>
    <div className="font-syne font-black text-foreground text-xl tracking-tight">{title}</div>
    {subtitle && <div className="text-sm text-ink3/60 mt-3 font-medium max-w-[250px] leading-relaxed italic">{subtitle}</div>}
  </div>
);

// ── Date chip ────────────────────────────────────────────────────────
export const DateChip = () => (
  <div className="bg-card border border-border backdrop-blur-3xl rounded-2xl px-6 py-3.5 text-[11px] text-foreground font-mono font-bold tracking-widest shadow-xl shadow-black/5 uppercase">
    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
  </div>
);

// ── Sync button ──────────────────────────────────────────────────────
export const SyncButton = ({ onClick, loading }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground border border-border text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
  >
    <svg
      className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
    {loading ? 'Syncing...' : 'Sync Protocol'}
  </button>
);
