import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInsight } from '../hooks/useData';
import { reportAPI } from '../services/api';
import { PageHeader, Card, CardTitle, Masonry, DENSE_COLS, Loader, EmptyState, ErrorMsg } from '../components/UI';
import Markdown from '../components/Markdown';
import { timeAgo } from '../utils';
import { FileText, Copy, Check, Send } from 'lucide-react';

const TYPES = [
  ['standup', 'Daily standup', 'Yesterday, today and blockers, from your last working day.'],
  ['report', 'Weekly report', 'Highlights, work by repository and pull requests from the last 7 days.'],
];
const LABELS = { standup: 'Standup', report: 'Weekly report', weekly: 'Weekly insight', custom: 'Question' };
const QUICK_PROMPTS = [
  ['What should I focus on?', 'Based on my recent activity, what should I focus on next week?'],
  ['Tech to learn', 'Given my tech stack, what tools or skills are worth learning this quarter?'],
  ['Repo strategy', 'Which of my repositories should I prioritise, and why?'],
];

const modelNote = (m) => (m === 'fallback-template' ? 'Template (AI unavailable)' : m);

function ReportView({ report, slackConnected }) {
  const [copied, setCopied] = useState(false);
  const [slack, setSlack] = useState({ state: 'idle', error: '' });

  const copy = async () => {
    await navigator.clipboard.writeText(report.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const send = async () => {
    setSlack({ state: 'sending', error: '' });
    try {
      await reportAPI.sendToSlack(report._id);
      setSlack({ state: 'sent', error: '' });
    } catch (e) {
      setSlack({ state: 'idle', error: e.response?.data?.error || e.message });
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={copy} className="btn-secondary px-3 py-2">
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy Markdown'}
        </button>
        {slackConnected ? (
          <button onClick={send} disabled={slack.state !== 'idle'} className="btn-secondary px-3 py-2">
            {slack.state === 'sent' ? <Check size={16} /> : <Send size={16} />}
            {slack.state === 'sending' ? 'Sending…' : slack.state === 'sent' ? 'Sent to Slack' : 'Send to Slack'}
          </button>
        ) : (
          <Link to="/settings" className="btn-ghost px-3 py-2 text-olive"><Send size={16} /> Connect Slack</Link>
        )}
        <span className="ml-auto text-xs text-olive">{timeAgo(report.createdAt)} · {modelNote(report.model)}</span>
      </div>
      {slack.error && <div className="mb-4"><ErrorMsg message={slack.error} /></div>}
      <div className="rounded-sm bg-white p-5"><Markdown text={report.content} /></div>
    </div>
  );
}

export default function ReportsPage() {
  const { profile } = useAuth();
  const { history, generating, askCustom, refreshHistory } = useInsight();
  const [type, setType] = useState('standup');
  const [current, setCurrent] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState(null);
  const [askError, setAskError] = useState('');

  const create = async () => {
    setCreating(true); setError('');
    try {
      const { data } = await reportAPI.create(type);
      setCurrent(data);
      refreshHistory();
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setCreating(false); }
  };

  const ask = async (text) => {
    const p = (text ?? prompt).trim();
    if (!p) return;
    setAskError(''); setAnswer(null);
    try { setAnswer(await askCustom(p)); }
    catch (e) { setAskError(e.message); }
  };

  const open = (item) => {
    if (item.type === 'standup' || item.type === 'report') {
      setType(item.type);
      setCurrent(item);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Standups and weekly reports, written from your commits, pull requests and tasks." />

      <div className="mb-12 grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="rounded-xl p-6 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Report type">
            {TYPES.map(([id, label]) => (
              <button key={id} role="radio" aria-checked={type === id} onClick={() => { setType(id); setCurrent(null); }}
                className={`btn px-4 py-2 ${type === id ? 'bg-plum text-white' : 'bg-white text-plum hover:bg-sand'}`}>
                {label}
              </button>
            ))}
            <button onClick={create} disabled={creating} className="btn-primary ml-auto">
              {creating ? 'Writing…' : `Generate ${TYPES.find((t) => t[0] === type)[1].toLowerCase()}`}
            </button>
          </div>
          {error && <div className="mb-4"><ErrorMsg message={error} /></div>}
          {creating ? <Loader label="Reading your activity…" />
            : current ? <ReportView key={current._id} report={current} slackConnected={profile?.slackConnected} />
            : <EmptyState icon={<FileText size={22} />} title={TYPES.find((t) => t[0] === type)[1]} subtitle={TYPES.find((t) => t[0] === type)[2]} />}
        </Card>

        <Card className="rounded-xl p-6 sm:p-8">
          <CardTitle title="Ask about your work" subtitle="Answers use your own GitHub activity and tasks" />
          <div className="mb-4 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(([label, text]) => (
              <button key={label} onClick={() => { setPrompt(text); ask(text); }} disabled={generating} className="btn-secondary px-3 py-2 text-xs">
                {label}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="flex flex-col gap-2">
            <label htmlFor="ask" className="sr-only">Your question</label>
            <textarea id="ask" value={prompt} maxLength={2000} onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
              placeholder="Ask anything… (Enter to send)" className="input h-24 resize-none" />
            <button type="submit" disabled={generating || !prompt.trim()} className="btn-primary self-end">Ask</button>
          </form>
          {generating && <Loader label="Thinking…" />}
          {askError && <div className="mt-4"><ErrorMsg message={askError} /></div>}
          {answer && !generating && (
            <div className="mt-4 rounded-sm bg-white p-4">
              <div className="mb-1 text-xs font-bold text-olive">{modelNote(answer.model)}</div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer.content}</p>
            </div>
          )}
        </Card>
      </div>

      <section>
        <h2 className="mb-4 font-bold">History</h2>
        {history.length ? (
          <Masonry cols={DENSE_COLS}>
            {history.map((item) => {
              const isReport = item.type === 'standup' || item.type === 'report';
              return (
                <Card key={item._id}
                  {...(isReport && {
                    role: 'button', tabIndex: 0, 'aria-label': `Open ${LABELS[item.type]} from ${timeAgo(item.createdAt)}`,
                    onClick: () => open(item),
                    onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open(item)),
                  })}
                  className={isReport ? 'cursor-pointer hover:bg-sand' : ''}>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-olive">
                    <span className={`badge ${isReport ? 'bg-plum text-white' : ''}`}>{LABELS[item.type]}</span>
                    <span>{timeAgo(item.createdAt)}</span>
                  </div>
                  {item.type === 'custom' && item.prompt && <p className="mb-2 text-sm font-bold">{item.prompt}</p>}
                  {isReport
                    ? <div className="max-h-56 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"><Markdown text={item.content} /></div>
                    : <p className="line-clamp-[8] text-sm text-olive">{item.content}</p>}
                </Card>
              );
            })}
          </Masonry>
        ) : <Card><EmptyState icon={<FileText size={22} />} title="Nothing here yet" subtitle="Reports, insights and answers collect here." /></Card>}
      </section>
    </div>
  );
}
