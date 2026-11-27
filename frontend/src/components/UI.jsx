import { RefreshCw } from 'lucide-react';

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="text-section">{title}</h1>
      {subtitle && <p className="mt-1 text-olive">{subtitle}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);

export const Card = ({ className = '', children, ...rest }) => (
  <div className={`card ${className}`} {...rest}>{children}</div>
);

export const CardTitle = ({ title, subtitle, action }) => (
  <div className="mb-4 flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h2 className="font-bold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-olive">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// Pin-style masonry grid using native CSS columns. Pass the full column set via `cols`
// (not className) so responsive column classes never conflict.
export const DENSE_COLS = 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 3xl:columns-5';
export const Masonry = ({ cols = 'columns-1 md:columns-2 xl:columns-3', children }) => (
  <div className={`gap-4 [&>*]:mb-4 [&>*]:break-inside-avoid ${cols}`}>{children}</div>
);

export const Stat = ({ label, value, hint, className = 'card' }) => (
  <div className={className}>
    <div className="text-xs font-semibold text-olive">{label}</div>
    <div className="mt-1 text-[28px] font-bold leading-tight tracking-tight">{value ?? '—'}</div>
    {hint && <div className="mt-1 text-xs text-olive">{hint}</div>}
  </div>
);

export const LangBar = ({ name, pct }) => (
  <div>
    <div className="mb-1.5 flex justify-between text-sm">
      <span className="font-semibold">{name}</span>
      <span className="text-olive">{pct}%</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-sand">
      <div className="h-full rounded-full bg-plum" style={{ width: `${pct}%` }} />
    </div>
  </div>
);

export const Loader = ({ label = 'Loading…' }) => (
  <div role="status" className="flex items-center gap-2 py-6 text-sm text-olive">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-sand border-t-plum" />
    {label}
  </div>
);

export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-sand ${className}`} />
);

export const ErrorMsg = ({ message }) => (
  <div role="alert" className="rounded bg-error/10 px-4 py-3 text-sm font-semibold text-error">
    {message || 'Something went wrong.'}
  </div>
);

export const EmptyState = ({ icon, title, subtitle, children }) => (
  <div className="flex flex-col items-center px-6 py-10 text-center">
    {icon && <div className="btn-circle mb-4 h-14 w-14">{icon}</div>}
    <div className="font-bold">{title}</div>
    {subtitle && <div className="mt-1 max-w-xs text-sm text-olive">{subtitle}</div>}
    {children && <div className="mt-4">{children}</div>}
  </div>
);

export const RefreshButton = ({ onClick, loading, label = 'Refresh' }) => (
  <button onClick={onClick} disabled={loading} className="btn-secondary">
    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
    {loading ? 'Refreshing…' : label}
  </button>
);
