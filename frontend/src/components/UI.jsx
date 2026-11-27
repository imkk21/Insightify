import { RefreshCw } from 'lucide-react';

// ── Insightify UI kit (dark dev-tool). Pair with the classes in index.css:
//    .card .card-hover .glow · .btn-primary/-secondary/-ghost/-danger (+ .btn-sm, .btn-icon)
//    .input · .badge(-accent|-success|-warning|-danger|-info) · .link · .kbd · .label

export const PageHeader = ({ title, subtitle, eyebrow, children }) => (
  <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div className="min-w-0">
      {eyebrow && <div className="label mb-2">{eyebrow}</div>}
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-gradient">{title}</h1>
      {subtitle && <p className="mt-1.5 max-w-2xl text-muted">{subtitle}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);

export const Card = ({ className = '', children, ...rest }) => (
  <div className={`card ${className}`} {...rest}>{children}</div>
);

export const CardTitle = ({ title, subtitle, action, icon }) => (
  <div className="mb-4 flex items-start justify-between gap-3">
    <div className="flex min-w-0 items-start gap-2.5">
      {icon && <span className="mt-0.5 text-subtle">{icon}</span>}
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold text-fg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-subtle">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

// Native CSS-columns masonry; pass the full responsive column set via `cols`.
export const DENSE_COLS = 'columns-1 sm:columns-2 lg:columns-3 2xl:columns-4';
export const Masonry = ({ cols = 'columns-1 md:columns-2 xl:columns-3', children }) => (
  <div className={`gap-4 [&>*]:mb-4 [&>*]:break-inside-avoid ${cols}`}>{children}</div>
);

export const Stat = ({ label, value, hint, trend, className = '' }) => (
  <div className={`card ${className}`}>
    <div className="label">{label}</div>
    <div className="mt-2 flex items-baseline gap-2">
      <span className="font-mono text-2xl font-semibold tracking-tight text-fg">{value ?? '—'}</span>
      {trend != null && (
        <span className={`font-mono text-xs ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
          {trend >= 0 ? '+' : ''}{trend}
        </span>
      )}
    </div>
    {hint && <div className="mt-1 text-xs text-subtle">{hint}</div>}
  </div>
);

// Literal class names: Tailwind can't see dynamically built ones like `bg-${tone}`
const TONE_BG = { accent: 'bg-accent', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', info: 'bg-info' };

export const Progress = ({ value, max = 100, tone = 'accent' }) => (
  <div className="h-1.5 overflow-hidden rounded-full bg-raised">
    <div className={`h-full rounded-full ${TONE_BG[tone]}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
  </div>
);

export const LangBar = ({ name, pct }) => (
  <div>
    <div className="mb-1.5 flex justify-between text-[13px]">
      <span className="text-fg">{name}</span>
      <span className="font-mono text-xs text-subtle">{pct}%</span>
    </div>
    <Progress value={pct} />
  </div>
);

/** Circular score 0–100 with a soft glow. */
export const ScoreRing = ({ value = 0, size = 120, label, tone = '#7c5cff' }) => {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, value) / 100)}
          style={{ filter: `drop-shadow(0 0 6px ${tone}88)`, transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-semibold tracking-tight">{value}</span>
        {label && <span className="text-2xs text-subtle">{label}</span>}
      </div>
    </div>
  );
};

/** Pill tabs. options = [[value, label], …] */
export const Segmented = ({ options, value, onChange, label }) => (
  <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-raised p-0.5">
    {options.map(([v, l]) => (
      <button key={v} role="radio" aria-checked={value === v} onClick={() => onChange(v)}
        className={`h-7 rounded-sm px-3 text-xs font-medium transition-colors ${value === v ? 'bg-overlay text-fg shadow' : 'text-subtle hover:text-fg'}`}>
        {l}
      </button>
    ))}
  </div>
);

export const Loader = ({ label = 'Loading…' }) => (
  <div role="status" className="flex items-center gap-2.5 py-6 text-[13px] text-subtle">
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
    {label}
  </div>
);

export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-raised ${className}`} />
);

export const ErrorMsg = ({ message }) => (
  <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
    {message || 'Something went wrong.'}
  </div>
);

export const EmptyState = ({ icon, title, subtitle, children }) => (
  <div className="flex flex-col items-center px-6 py-10 text-center">
    {icon && (
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-line-strong bg-raised text-muted shadow">
        {icon}
      </div>
    )}
    <div className="font-medium text-fg">{title}</div>
    {subtitle && <div className="mt-1 max-w-sm text-[13px] text-subtle">{subtitle}</div>}
    {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
  </div>
);

export const RefreshButton = ({ onClick, loading, label = 'Refresh' }) => (
  <button onClick={onClick} disabled={loading} className="btn-secondary">
    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
    {loading ? 'Refreshing…' : label}
  </button>
);
