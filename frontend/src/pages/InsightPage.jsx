import { useState } from 'react';
import { useInsight } from '../hooks/useData';
import { PageHeader, Card, CardHeader, CardBody, DotLoader, EmptyState, ErrorMsg } from '../components/UI';

const QUICK_PROMPTS = [
  { label: '📊 Weekly Summary',  text: 'Summarize my GitHub activity this week and what I should focus on next.' },
  { label: '🚀 Tech Trends',     text: 'Given my tech stack, what trending tools should I learn this quarter?' },
  { label: '📰 News Digest',     text: 'What are the top tech headlines and how do they relate to my stack?' },
  { label: '🌤️ Weather & Work',  text: 'How should the weather forecast affect my work schedule and productivity?' },
  { label: '⭐ Repo Strategy',   text: 'Which of my repositories should I prioritize to maximize community engagement?' },
  { label: '🎯 Next Sprint',     text: 'Based on my activity, what should my development goals be for the next sprint?' },
];

const timeAgo = (date) => {
  if (!date) return '';
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
};

export default function InsightPage() {
  const { latest, history, loading, error, generating, generate, askCustom } = useInsight();
  const [prompt,        setPrompt]       = useState('');
  const [customResult,  setCustomResult] = useState(null);
  const [customError,   setCustomError]  = useState('');
  const [customLoading, setCustomLoading]= useState(false);

  const handleCustom = async (text) => {
    const p = (text || prompt).trim();
    if (!p) return;
    setCustomError(''); setCustomResult(null); setCustomLoading(true);
    try {
      const res = await askCustom(p);
      setCustomResult(res);
    } catch (e) { setCustomError(e.message); }
    finally { setCustomLoading(false); }
  };

  return (
    <div>
      <PageHeader title="AI Insights" subtitle="Powered by Google Gemini · Your personalized developer intelligence">
        <button onClick={generate} disabled={generating} className="btn-primary flex items-center gap-2">
          {generating
            ? <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Generating…</>
            : '✦ Generate Weekly Insight'}
        </button>
      </PageHeader>

      {error && <div className="mb-5"><ErrorMsg message={error} /></div>}

      {/* Latest insight */}
      <Card className="mb-5">
        <CardHeader title="Latest Weekly Insight" subtitle="AI-generated from your GitHub, Weather & News data" badge="✦ Gemini" badgeStyle="bg-rose/10 text-rose border-rose/20" />
        <CardBody>
          {loading ? <DotLoader label="Loading insight…" />
            : latest ? (
              <div>
                <p className="text-ink2 leading-relaxed text-[15px]">{latest.content}</p>
                <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-black/[0.06]">
                  <span className="text-xs font-mono text-ink3">Generated {timeAgo(latest.createdAt)}</span>
                  <span className="text-xs font-mono text-ink3">Model: {latest.model}</span>
                  {latest.dataSnapshot?.commits != null && <span className="text-xs font-mono text-ink3">Commits: {latest.dataSnapshot.commits}</span>}
                  {latest.dataSnapshot?.city      && <span className="text-xs font-mono text-ink3">📍 {latest.dataSnapshot.city} {latest.dataSnapshot.temp}°C</span>}
                  <button onClick={generate} disabled={generating} className="ml-auto text-[11px] font-mono text-ink3 hover:text-amber transition-colors disabled:opacity-40">
                    {generating ? '⟳ Generating…' : '↺ Regenerate'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <EmptyState emoji="✨" title="No insight yet" subtitle="Click 'Generate Weekly Insight' to create your first AI-powered summary" />
                <div className="text-center mt-4">
                  <button onClick={generate} disabled={generating} className="btn-primary mx-auto">
                    {generating ? 'Generating…' : '✦ Generate Now'}
                  </button>
                </div>
              </div>
            )}
        </CardBody>
      </Card>

      {/* Custom AI chat */}
      <Card className="mb-5">
        <CardHeader title="Ask Insightify AI" subtitle="Ask anything about your data" badge="✦ Gemini" badgeStyle="bg-amber/10 text-amber border-amber/20" />
        <CardBody>
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK_PROMPTS.map(({ label, text }) => (
              <button key={label} onClick={() => handleCustom(text)} disabled={customLoading || generating}
                className="btn-outline text-xs py-1.5">{label}</button>
            ))}
          </div>
          <div className="flex gap-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCustom(); }}}
              placeholder="Ask about your developer data… (Enter to send, Shift+Enter for newline)"
              className="input flex-1 resize-none h-20"
            />
            <button onClick={() => handleCustom()} disabled={customLoading || !prompt.trim()} className="btn-primary self-end">Ask AI</button>
          </div>
          {customLoading && <div className="mt-4"><DotLoader label="Insightify AI is thinking…" /></div>}
          {customError  && <div className="mt-4"><ErrorMsg message={customError} /></div>}
          {customResult && !customLoading && (
            <div className="mt-4 p-4 bg-cream rounded-xl border-l-4 border-amber animate-fade-up">
              <div className="text-[10px] font-mono text-amber uppercase tracking-[2px] mb-2">AI Response · {customResult.model}</div>
              <p className="text-ink2 text-[14px] leading-relaxed whitespace-pre-wrap">{customResult.content}</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* History */}
      <Card>
        <CardHeader title="Insight History" subtitle={`${history.length} insights generated`} />
        <CardBody className="!p-0">
          {history.length ? history.map((item, i) => (
            <div key={i} className="px-6 py-5 border-b border-black/[0.05] last:border-b-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className={`badge text-[10px] font-mono ${item.type === 'weekly' ? 'bg-teal2/10 text-teal2 border-teal2/20' : 'bg-amber/10 text-amber border-amber/20'}`}>
                  {item.type === 'weekly' ? 'Weekly' : 'Custom'}
                </span>
                <span className="text-[11px] font-mono text-ink3">{timeAgo(item.createdAt)}</span>
                <span className="text-[11px] font-mono text-ink3">{item.model}</span>
                {item.dataSnapshot?.city && (
                  <span className="text-[11px] font-mono text-ink3">📍 {item.dataSnapshot.city}</span>
                )}
              </div>
              <p className="text-sm text-ink2 leading-relaxed line-clamp-3">{item.content}</p>
            </div>
          )) : (
            <div className="px-6 py-4">
              <EmptyState emoji="📜" title="No history yet" subtitle="Generated insights will appear here" />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
