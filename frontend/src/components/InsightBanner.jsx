import { Sparkles, RefreshCw } from 'lucide-react';
import { timeAgo } from '../utils';

export default function InsightBanner({ insight, onGenerate, generating }) {
  const isTemplate = insight?.model === 'fallback-template';

  return (
    <section aria-label="Weekly insight"
      className="card glow relative flex h-full flex-col overflow-hidden border-accent/25 shadow-glow">
      {/* Hairline accent along the top edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-70" aria-hidden="true" />

      <div className="flex items-center justify-between gap-3">
        <span className="badge-accent badge"><Sparkles size={12} aria-hidden="true" /> AI insight</span>
        {insight && <span className="font-mono text-2xs text-subtle">{timeAgo(insight.createdAt)}</span>}
      </div>

      {insight ? (
        <>
          <p className="mt-4 flex-1 text-[15px] leading-7 text-fg">{insight.content}</p>
          <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1 font-mono text-2xs text-subtle">
            <span>{isTemplate ? 'template · AI unavailable' : insight.model}</span>
            {insight.dataSnapshot?.city && (
              <>
                <span aria-hidden="true">/</span>
                <span>{insight.dataSnapshot.city} · {insight.dataSnapshot.commits ?? 0} commits</span>
              </>
            )}
          </div>
        </>
      ) : (
        <p className="mt-4 flex-1 text-[15px] leading-7 text-muted">
          No insight yet. Generate one from your GitHub activity, local weather and the latest tech news.
        </p>
      )}

      <div className="mt-5">
        <button onClick={onGenerate} disabled={generating} className={insight ? 'btn-secondary btn-sm' : 'btn-primary'}>
          {insight ? <RefreshCw size={13} className={generating ? 'animate-spin' : ''} aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
          {generating ? 'Generating…' : insight ? 'Regenerate' : 'Generate insight'}
        </button>
      </div>
    </section>
  );
}
