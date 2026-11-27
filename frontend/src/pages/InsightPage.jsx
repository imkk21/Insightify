import { useState } from 'react';
import { useInsight } from '../hooks/useData';
import { PageHeader, Card, CardTitle, Masonry, DENSE_COLS, Loader, Skeleton, EmptyState, ErrorMsg } from '../components/UI';
import InsightBanner from '../components/InsightBanner';
import { timeAgo } from '../utils';
import { Sparkles } from 'lucide-react';

const QUICK_PROMPTS = [
  ['Weekly summary', 'Summarize my GitHub activity this week and what I should focus on next.'],
  ['Tech trends',    'Given my tech stack, what trending tools should I learn this quarter?'],
  ['News digest',    'What are the top tech headlines and how do they relate to my stack?'],
  ['Weather & work', 'How should the weather forecast affect my work schedule and productivity?'],
  ['Repo strategy',  'Which of my repositories should I prioritize to maximize community engagement?'],
  ['Next sprint',    'Based on my activity, what should my development goals be for the next sprint?'],
];

export default function InsightPage() {
  const { latest, history, loading, error, generating, generate, askCustom } = useInsight();
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState(null);
  const [askError, setAskError] = useState('');
  const [asking, setAsking] = useState(false);

  const ask = async (text) => {
    const p = (text ?? prompt).trim();
    if (!p) return;
    setAskError(''); setAnswer(null); setAsking(true);
    try { setAnswer(await askCustom(p)); }
    catch (e) { setAskError(e.message); }
    finally { setAsking(false); }
  };

  return (
    <div>
      <PageHeader title="Insights" subtitle="Gemini reads your GitHub activity, weather and tech news" />

      {error && <div className="mb-6"><ErrorMsg message={error} /></div>}

      <div className="mb-10 grid items-start gap-4 xl:grid-cols-2">
        {loading ? <Skeleton className="h-64 rounded-xl" /> : <InsightBanner insight={latest} onGenerate={generate} generating={generating} />}

        <Card className="rounded-xl p-6 sm:p-8">
          <CardTitle title="Ask about your week" subtitle="Answers use your own GitHub, weather and news data" />
          <div className="mb-4 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(([label, text]) => (
              <button key={label} onClick={() => { setPrompt(text); ask(text); }} disabled={asking} className="btn-secondary px-3 py-2 text-xs">
                {label}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label htmlFor="ask" className="sr-only">Your question</label>
            <textarea
              id="ask"
              value={prompt}
              maxLength={2000}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
              placeholder="Ask anything… (Enter to send, Shift+Enter for a new line)"
              className="input h-24 resize-none"
            />
            <button type="submit" disabled={asking || !prompt.trim()} className="btn-primary">Ask</button>
          </form>
          {asking && <Loader label="Thinking…" />}
          {askError && <div className="mt-4"><ErrorMsg message={askError} /></div>}
          {answer && !asking && (
            <div className="mt-4 rounded-sm bg-white p-4">
              <div className="mb-1 text-xs font-bold text-olive">{answer.model === 'fallback-template' ? 'Template answer (AI unavailable)' : answer.model}</div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer.content}</p>
            </div>
          )}
        </Card>
      </div>

      <section>
        <h2 className="mb-4 font-bold">History</h2>
        {history.length ? (
          <Masonry cols={DENSE_COLS}>
            {history.map((item) => (
              <Card key={item._id}>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-olive">
                  <span className={`badge ${item.type === 'weekly' ? 'bg-plum text-white' : ''}`}>
                    {item.type === 'weekly' ? 'Weekly' : 'Question'}
                  </span>
                  <span>{timeAgo(item.createdAt)}</span>
                </div>
                {item.type === 'custom' && item.prompt && <p className="mb-2 text-sm font-bold">{item.prompt}</p>}
                <p className="line-clamp-[10] text-sm text-olive">{item.content}</p>
              </Card>
            ))}
          </Masonry>
        ) : (
          <Card><EmptyState icon={<Sparkles size={22} />} title="No insights yet" subtitle="Generated insights and answers will collect here." /></Card>
        )}
      </section>
    </div>
  );
}
