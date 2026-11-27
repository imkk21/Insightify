import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInsight } from '../hooks/useData';
import { reportAPI } from '../services/api';
import { PageHeader, Card, CardTitle, Masonry, DENSE_COLS, Segmented, Loader, EmptyState, ErrorMsg } from '../components/UI';
import Markdown from '../components/Markdown';
import { timeAgo } from '../utils';
import { FileText, Copy, Check, Send, Sparkles, ArrowUp, MessageSquare } from 'lucide-react';

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

const modelNote = (m) => (m === 'fallback-template' ? 'template · AI unavailable' : m);

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
    <div className="overflow-hidden rounded-lg border border-line bg-bg/60">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <span className="mr-auto font-mono text-2xs text-subtle">{timeAgo(report.createdAt)} · {modelNote(report.model)}</span>
        <button onClick={copy} className="btn-ghost btn-sm">
          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy Markdown'}
        </button>
        {slackConnected ? (
          <button onClick={send} disabled={slack.state !== 'idle'} className="btn-secondary btn-sm">
            {slack.state === 'sent' ? <Check size={13} className="text-success" /> : <Send size={13} />}
            {slack.state === 'sending' ? 'Sending…' : slack.state === 'sent' ? 'Sent to Slack' : 'Send to Slack'}
          </button>
        ) : (
          <Link to="/settings" className="btn-ghost btn-sm"><Send size={13} /> Connect Slack</Link>
        )}
      </div>
      {slack.error && <div className="px-4 pt-4"><ErrorMsg message={slack.error} /></div>}
      <div className="p-5"><Markdown text={report.content} /></div>
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

  const typeInfo = TYPES.find((t) => t[0] === type);

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
      <PageHeader eyebrow="Workspace" title="Reports" subtitle="Standups and weekly reports, written from your commits, pull requests and tasks." />

      <div className="mb-10 grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Segmented label="Report type" options={TYPES.map(([id, label]) => [id, label])} value={type}
              onChange={(v) => { setType(v); setCurrent(null); }} />
            <button onClick={create} disabled={creating} className="btn-primary ml-auto">
              <Sparkles size={14} aria-hidden="true" />
              {creating ? 'Writing…' : `Generate ${typeInfo[1].toLowerCase()}`}
            </button>
          </div>
          {error && <div className="mb-4"><ErrorMsg message={error} /></div>}
          {creating ? <Loader label="Reading your activity…" />
            : current ? <ReportView key={current._id} report={current} slackConnected={profile?.slackConnected} />
            : (
              <div className="rounded-lg border border-dashed border-line-strong">
                <EmptyState icon={<FileText size={20} />} title={typeInfo[1]} subtitle={typeInfo[2]} />
              </div>
            )}
        </Card>

        <Card>
          <CardTitle icon={<MessageSquare size={14} />} title="Ask about your work" subtitle="Answers use your own GitHub activity and tasks" />
          <div className="mb-3 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map(([label, text]) => (
              <button key={label} onClick={() => { setPrompt(text); ask(text); }} disabled={generating}
                className="btn-secondary btn-sm rounded-full">
                {label}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(); }}
            className="relative rounded-lg border border-line-strong bg-raised transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
            <label htmlFor="ask" className="sr-only">Your question</label>
            <textarea id="ask" value={prompt} maxLength={2000} onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
              placeholder="Ask anything about your work…"
              className="block h-24 w-full resize-none bg-transparent px-3 py-2.5 text-[13px] text-fg placeholder:text-subtle focus:outline-none" />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <span className="text-2xs text-subtle"><span className="kbd">Enter</span> to send · <span className="kbd">Shift</span>+<span className="kbd">Enter</span> newline</span>
              <button type="submit" disabled={generating || !prompt.trim()} className="btn-primary btn-sm w-7 px-0" aria-label="Ask"><ArrowUp size={14} /></button>
            </div>
          </form>
          {generating && <Loader label="Thinking…" />}
          {askError && <div className="mt-4"><ErrorMsg message={askError} /></div>}
          {answer && !generating && (
            <div className="mt-4 rounded-lg border border-line bg-bg/60 p-4">
              <div className="mb-2 flex items-center gap-1.5 font-mono text-2xs text-subtle"><Sparkles size={11} className="text-accent-hover" /> {modelNote(answer.model)}</div>
              <p className="whitespace-pre-wrap text-[13px] leading-6 text-fg">{answer.content}</p>
            </div>
          )}
        </Card>
      </div>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold">History</h2>
          {history.length > 0 && <span className="font-mono text-xs text-subtle">{history.length} items</span>}
        </div>
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
                  className={isReport ? 'card-hover cursor-pointer' : ''}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className={`badge ${isReport ? 'badge-accent' : ''}`}>{LABELS[item.type]}</span>
                    <span className="font-mono text-2xs text-subtle">{timeAgo(item.createdAt)}</span>
                  </div>
                  {item.type === 'custom' && item.prompt && <p className="mb-2 text-[13px] font-medium text-fg">{item.prompt}</p>}
                  {isReport
                    ? <div className="max-h-56 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"><Markdown text={item.content} /></div>
                    : <p className="line-clamp-[8] text-[13px] text-muted">{item.content}</p>}
                </Card>
              );
            })}
          </Masonry>
        ) : <Card><EmptyState icon={<FileText size={20} />} title="Nothing here yet" subtitle="Reports, insights and answers collect here." /></Card>}
      </section>
    </div>
  );
}
