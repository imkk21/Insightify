import { Sparkles } from 'lucide-react';
import { timeAgo } from '../utils';

export default function InsightBanner({ insight, onGenerate, generating }) {
  const isTemplate = insight?.model === 'fallback-template';

  return (
    <section className="rounded-xl bg-char p-6 text-white sm:p-8">
      <div className="flex items-center gap-2 text-xs font-bold text-silver">
        <Sparkles size={14} aria-hidden="true" /> Weekly insight
      </div>

      {insight ? (
        <>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed">{insight.content}</p>
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-silver">
            <span>{timeAgo(insight.createdAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{isTemplate ? 'Template (AI unavailable)' : insight.model}</span>
            {insight.dataSnapshot?.city && (
              <>
                <span aria-hidden="true">·</span>
                <span>{insight.dataSnapshot.city}, {insight.dataSnapshot.commits ?? 0} commits</span>
              </>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 max-w-3xl text-lg text-sand">
          No insight yet. Generate one from your GitHub activity, weather and the latest tech news.
        </p>
      )}

      <button onClick={onGenerate} disabled={generating} className="btn-primary mt-6">
        {generating ? 'Generating…' : insight ? 'Regenerate' : 'Generate insight'}
      </button>
    </section>
  );
}
