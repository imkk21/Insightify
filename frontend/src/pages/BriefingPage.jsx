import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pause, Play, RefreshCw, Radio, Sparkles, FileText, Volume2 } from 'lucide-react';
import { PageHeader, Card, CardTitle, Segmented, Progress, Loader, ErrorMsg, EmptyState } from '../components/UI';
import Visualizer from '../components/briefing/Visualizer';
import useBriefingPlayer from '../components/briefing/useBriefingPlayer';
import { briefingAPI, fmtTime } from '../components/briefing/briefingApi';
import { timeAgo } from '../utils';

const SPEEDS = [0.9, 1, 1.1, 1.25].map((v) => [v, `${v}×`]);
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Transcript({ briefing, player }) {
  const box = useRef(null);
  const active = useRef(null);
  let n = -1; // running sentence index across sections

  useEffect(() => {
    const el = active.current;
    if (!player.playing || !el || !box.current) return;
    box.current.scrollTo({ top: el.offsetTop - box.current.clientHeight / 3, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [player.index, player.playing]);

  return (
    <div ref={box} className="relative max-h-[440px] space-y-6 overflow-y-auto pr-2">
      {briefing.sections.map((sec, si) => (
        <section key={sec.id} aria-labelledby={`bs-${sec.id}`}>
          <h3 id={`bs-${sec.id}`} className={`label mb-2 ${player.section === si ? 'text-accent-hover' : ''}`}>{sec.title}</h3>
          <p className="text-[15px] leading-7">
            {sec.sentences.map((s) => {
              n += 1;
              const on = n === player.index;
              return (
                <span key={n} ref={on ? active : undefined} aria-current={on ? 'true' : undefined}
                  className={`rounded-sm transition-colors duration-300 ${on ? 'bg-accent-soft text-fg' : n < player.index ? 'text-muted' : 'text-subtle'}`}>
                  {s}{' '}
                </span>
              );
            })}
          </p>
        </section>
      ))}
    </div>
  );
}

export default function BriefingPage() {
  const [briefing, setBriefing] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [params, setParams] = useSearchParams();
  const player = useBriefingPlayer(briefing, !!status?.elevenlabs);

  useEffect(() => {
    briefingAPI.get().then((r) => setBriefing(r.data)).catch((e) => setError(e.response?.data?.error || e.message));
    briefingAPI.status().then((r) => setStatus(r.data)).catch(() => setStatus({ elevenlabs: false }));
  }, []);

  // /briefing?play=1 (from BriefingMini) starts playback once everything is loaded.
  useEffect(() => {
    if (!briefing || !status || !params.get('play')) return;
    setParams({}, { replace: true });
    player.play();
  }, [briefing, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const regenerate = async () => {
    player.pause();
    setRegenerating(true); setError('');
    try { setBriefing((await briefingAPI.regenerate()).data); }
    catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setRegenerating(false); }
  };

  const header = (
    <PageHeader eyebrow={briefing ? new Date(`${briefing.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Today'}
      title="Morning briefing" subtitle="Your day in about two minutes: yesterday's work, today's plan, security, weather and the news that matters to you.">
      <button onClick={regenerate} disabled={regenerating || !briefing} className="btn-secondary">
        <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} /> {regenerating ? 'Rewriting…' : 'Regenerate'}
      </button>
    </PageHeader>
  );

  if (!briefing) {
    return (
      <div>
        {header}
        {error ? <ErrorMsg message={error} /> : <Card><Loader label="Writing your briefing…" /></Card>}
      </div>
    );
  }

  const greeting = briefing.sections[0]?.sentences[0];
  const isAI = briefing.model !== 'fallback-template';
  const busy = player.loadingAudio || regenerating;

  return (
    <div className="animate-fade-in">
      {header}
      {error && <div className="mb-4"><ErrorMsg message={error} /></div>}

      <Card className="glow relative mb-4 overflow-hidden border-accent/25 p-6 md:p-8">
        <div className="flex items-center gap-5 md:gap-7">
          <button onClick={player.toggle} disabled={busy || !player.supported}
            aria-label={player.playing ? 'Pause briefing' : 'Play briefing'}
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg shadow-glow transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 md:h-20 md:w-20">
            {player.loadingAudio ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent-fg/40 border-t-accent-fg" />
              : player.playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="translate-x-0.5" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="label flex items-center gap-1.5"><Radio size={12} /> {player.loadingAudio ? 'Preparing voice…' : player.playing ? 'Now playing' : 'Ready'}</div>
            <h2 className="mt-1.5 text-xl font-semibold leading-snug tracking-tight text-fg md:text-2xl">{greeting}</h2>
            <div className="mt-3 flex items-center gap-4">
              <span className="font-mono text-xs tabular-nums text-muted" aria-label={`Elapsed ${fmtTime(player.elapsed)} of about ${fmtTime(player.total)}`}>
                {fmtTime(player.elapsed)} <span className="text-subtle">/ {player.mode === 'audio' ? '' : '~'}{fmtTime(player.total)}</span>
              </span>
              <Visualizer playing={player.playing} className="h-7 flex-1 overflow-hidden" />
            </div>
          </div>
        </div>

        <div className="mt-6"><Progress value={player.elapsed} max={player.total || 1} /></div>

        <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Chapters">
          {briefing.sections.map((s, i) => (
            <button key={s.id} onClick={() => player.jump(i)} aria-current={player.section === i ? 'true' : undefined}
              className={`h-7 rounded-full border px-3 text-xs font-medium transition-colors ${player.section === i
                ? 'border-accent/40 bg-accent-soft text-fg' : 'border-line bg-raised text-muted hover:border-line-strong hover:text-fg'}`}>
              {s.title}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <Segmented label="Playback speed" options={SPEEDS} value={player.rate} onChange={player.setRate} />
          <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
            <span>Generated {timeAgo(briefing.createdAt)}</span>
            <span className={isAI ? 'badge badge-accent' : 'badge'} title={briefing.model}>
              {isAI ? <Sparkles size={11} /> : <FileText size={11} />} {isAI ? 'AI' : 'Template'}
            </span>
            <span className="badge"><Volume2 size={11} /> {player.mode === 'audio' || (!player.mode && status?.elevenlabs) ? 'ElevenLabs' : 'Browser voice'}</span>
            <span className="font-mono">{briefing.wordCount} words</span>
          </div>
        </div>
        {!player.supported && <p className="mt-3 text-xs text-warning">This browser can't speak the briefing aloud; the transcript is below.</p>}
      </Card>

      <Card>
        <CardTitle title="Transcript" subtitle="Follows along as the briefing plays." icon={<FileText size={15} />} />
        {briefing.sections.length ? <Transcript briefing={briefing} player={player} />
          : <EmptyState title="Nothing to read yet" subtitle="Try regenerating your briefing." />}
      </Card>
    </div>
  );
}
