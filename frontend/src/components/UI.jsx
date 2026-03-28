// ── Skeleton loader ──────────────────────────────────────────────────
export const Skeleton = ({ className = '' }) => (
  <div className={`bg-black/[0.06] rounded-lg animate-pulse ${className}`} />
);

// ── Section page header ──────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, children }) => (
  <div className="flex items-start justify-between mb-9">
    <div>
      <h1 className="font-syne font-black text-[28px] text-ink tracking-tight leading-none">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-ink3 font-light mt-1.5">{subtitle}</p>
      )}
    </div>
    {children && <div className="flex items-center gap-3">{children}</div>}
  </div>
);

// ── Card wrapper ─────────────────────────────────────────────────────
export const Card = ({ children, className = '', onClick }) => (
  <div
    className={`card ${onClick ? 'cursor-pointer hover:-translate-y-1 transition-transform' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, badge, badgeStyle }) => (
  <div className="flex items-start justify-between px-6 py-5 border-b border-black/[0.06]">
    <div>
      <div className="font-syne font-bold text-[15px] text-ink">{title}</div>
      {subtitle && <div className="text-xs text-ink3 font-light mt-0.5">{subtitle}</div>}
    </div>
    {badge && (
      <span className={`badge text-[10px] font-mono ${badgeStyle}`}>{badge}</span>
    )}
  </div>
);

export const CardBody = ({ children, className = '' }) => (
  <div className={`px-6 py-5 ${className}`}>{children}</div>
);

// ── Stat card ────────────────────────────────────────────────────────
export const StatCard = ({ icon, value, label, change, changeUp = true, accentColor, delay = 0 }) => (
  <div
    className="stat-card animate-fade-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* top accent bar */}
    <div
      className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
      style={{ background: accentColor }}
    />
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
      style={{ background: `${accentColor}18` }}
    >
      <span style={{ color: accentColor }}>{icon}</span>
    </div>
    <div className="font-syne font-black text-[30px] text-ink leading-none tracking-tight">
      {value ?? '—'}
    </div>
    <div className="text-xs text-ink3 mt-1.5">{label}</div>
    {change && (
      <div
        className={`text-[11px] font-mono mt-2.5 flex items-center gap-1 ${changeUp ? 'text-teal' : 'text-rose'}`}
      >
        {changeUp ? '↑' : '↓'} {change}
      </div>
    )}
  </div>
);

// ── Language bar ─────────────────────────────────────────────────────
export const LangBar = ({ name, pct, color }) => (
  <div>
    <div className="flex justify-between items-center mb-1.5">
      <span className="text-[13px] text-ink2 font-medium">{name}</span>
      <span className="text-xs text-ink3 font-mono">{pct}%</span>
    </div>
    <div className="h-1.5 bg-cream2 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  </div>
);

// ── Dot loader ───────────────────────────────────────────────────────
export const DotLoader = ({ label = 'Loading…' }) => (
  <div className="flex items-center gap-2 py-4">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-amber animate-pulse-dot"
        style={{ animationDelay: `${i * 0.2}s` }}
      />
    ))}
    <span className="text-sm text-ink3 ml-1">{label}</span>
  </div>
);

// ── Error message ────────────────────────────────────────────────────
export const ErrorMsg = ({ message }) => (
  <div className="text-rose text-sm bg-rose/5 border border-rose/20 rounded-xl px-4 py-3">
    ⚠ {message || 'Something went wrong'}
  </div>
);

// ── Empty state ──────────────────────────────────────────────────────
export const EmptyState = ({ emoji = '🔍', title, subtitle }) => (
  <div className="text-center py-12">
    <div className="text-4xl mb-3">{emoji}</div>
    <div className="font-syne font-bold text-ink text-base">{title}</div>
    {subtitle && <div className="text-sm text-ink3 mt-1">{subtitle}</div>}
  </div>
);

// ── Date chip ────────────────────────────────────────────────────────
export const DateChip = () => (
  <div className="bg-white border border-black/[0.08] rounded-xl px-4 py-2.5 text-xs text-ink3 font-mono">
    {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
  </div>
);

// ── Sync button ──────────────────────────────────────────────────────
export const SyncButton = ({ onClick, loading }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="btn-primary flex items-center gap-2"
  >
    <svg
      className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
    {loading ? 'Syncing…' : 'Sync Data'}
  </button>
);
