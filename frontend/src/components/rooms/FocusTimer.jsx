import { useEffect, useState } from 'react';
import { Timer, Play, Square, UserPlus, PartyPopper } from 'lucide-react';
import { Card, CardTitle, Segmented } from '../UI';
import Avatar from './Avatar';

const fmt = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** Ticks once a second; `offset` = server clock − local clock so every client shows the same countdown. */
export const useNow = (offset = 0, ms = 1000) => {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    setNow(Date.now() + offset);
    const id = setInterval(() => setNow(Date.now() + offset), ms);
    return () => clearInterval(id);
  }, [offset, ms]);
  return now;
};

const Ring = ({ pct, children }) => {
  const r = 54, c = 2 * Math.PI * r;
  return (
    <div className="relative h-44 w-44 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#7c5cff" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-linear"
          style={{ filter: 'drop-shadow(0 0 8px #7c5cff88)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
};

export default function FocusTimer({ room, me, offset, act }) {
  const now = useNow(offset);
  const [minutes, setMinutes] = useState(25);
  const [label, setLabel] = useState('');
  const t = room.timer;
  const end = t ? new Date(t.startedAt).getTime() + t.minutes * 60000 : 0;
  const remaining = Math.max(0, end - now);
  const running = remaining > 0;
  const focusing = room.members.filter((m) => m.focusUntil && new Date(m.focusUntil).getTime() > now);
  const mine = room.members.find((m) => m.uid === me);
  const joined = mine?.focusUntil && new Date(mine.focusUntil).getTime() >= end - 1000;
  const starter = room.members.find((m) => m.uid === t?.startedBy);

  const start = (e) => { e.preventDefault(); act('post', 'timer', { minutes, label }).then(() => setLabel('')); };

  return (
    <Card className={running ? 'glow border-accent/30' : ''}>
      <CardTitle title="Shared focus session" icon={<Timer size={15} />}
        subtitle={running ? `Started by ${starter?.name || 'a member'}${t.label ? ` · ${t.label}` : ''}` : 'Start a session — everyone sees the same countdown.'} />

      {running ? (
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <Ring pct={remaining / (t.minutes * 60000)}>
            <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight" role="timer" aria-live="off">{fmt(remaining)}</span>
            <span className="text-2xs text-subtle">of {t.minutes} min</span>
          </Ring>
          <div className="w-full min-w-0 flex-1 space-y-4">
            <div>
              <div className="label mb-2">In session · {focusing.length}</div>
              <div className="flex flex-wrap gap-2">
                {focusing.map((m) => <span key={m.uid} title={m.name}><Avatar member={m} size={28} presence="focusing" /></span>)}
                {!focusing.length && <span className="text-xs text-subtle">Nobody yet.</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {joined
                ? <span className="badge badge-accent h-7 px-2.5">You're in — heads down</span>
                : <button className="btn-primary btn-sm" onClick={() => act('post', 'timer', { join: true })}><UserPlus size={13} /> Join session</button>}
              <button className="btn-ghost btn-sm" onClick={() => act('delete', 'timer')}><Square size={12} /> Stop for everyone</button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={start} className="space-y-4">
          {t && (
            <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-[13px] text-success">
              <PartyPopper size={14} /> Last session ({t.minutes} min{t.label ? ` · ${t.label}` : ''}) complete. Nice work.
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Segmented label="Session length" value={minutes} onChange={setMinutes} options={[[25, '25m'], [50, '50m'], [90, '90m']]} />
            <label className="sr-only" htmlFor="timer-label">Session label</label>
            <input id="timer-label" className="input h-8 min-w-0 flex-1" placeholder="Label (optional) — e.g. Ship auth" value={label}
              onChange={(e) => setLabel(e.target.value)} maxLength={60} />
          </div>
          <button className="btn-primary"><Play size={13} /> Start {minutes}-minute session</button>
        </form>
      )}
    </Card>
  );
}
