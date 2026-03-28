export default function InsightBanner({ insight, onGenerate, generating }) {
  const timeAgo = (date) => {
    if (!date) return 'Never';
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 3600)  return `${Math.round(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)} hrs ago`;
    return `${Math.round(diff / 86400)} days ago`;
  };

  return (
    <div className="bg-ink rounded-2xl p-7 relative overflow-hidden animate-slide-in">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-amber/10 blur-xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-36 h-36 rounded-full bg-teal2/10 blur-xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse-dot" />
          <span className="text-[10px] font-mono text-amber tracking-[3px] uppercase">
            Weekly AI Insight · Powered by Gemini
          </span>
        </div>

        {insight ? (
          <>
            <p className="text-white/85 text-[16px] font-light italic leading-relaxed max-w-3xl">
              {insight.content}
            </p>
            <div className="flex items-center gap-4 mt-5 flex-wrap">
              <span className="text-[11px] font-mono text-white/30">Generated · {timeAgo(insight.createdAt)}</span>
              <span className="px-3 py-1 rounded-full bg-amber/15 border border-amber/30 text-amber text-[11px] font-mono">
                ✦ {insight.model === 'fallback-template' ? 'Template' : insight.model}
              </span>
              {insight.dataSnapshot?.city && (
                <span className="text-[11px] font-mono text-white/25">
                  📍 {insight.dataSnapshot.city} · {insight.dataSnapshot.commits ?? 0} commits
                </span>
              )}
              <button onClick={onGenerate} disabled={generating}
                className="ml-auto text-[11px] font-mono text-white/40 hover:text-amber transition-colors disabled:opacity-40">
                {generating ? '⟳ Generating…' : '↺ Regenerate'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-white/50 text-sm italic">
              No insight yet. Sync your data and generate your first weekly insight.
            </p>
            <button onClick={onGenerate} disabled={generating}
              className="ml-6 px-4 py-2 bg-amber text-ink rounded-xl text-sm font-syne font-bold hover:bg-amber/90 transition-colors disabled:opacity-50 flex-shrink-0">
              {generating ? 'Generating…' : '✦ Generate Insight'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
