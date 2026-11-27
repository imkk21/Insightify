import { Check } from 'lucide-react';
import { Progress } from '../UI';
import Avatar from './Avatar';

// Gold/silver/bronze as three accent intensities (no extra palette).
const RANK = [
  'bg-accent text-accent-fg shadow-glow',
  'bg-accent-soft text-accent-hover border border-accent/40',
  'border border-accent/25 text-muted',
];

export const RankBadge = ({ rank }) => (
  <span aria-label={`Rank ${rank}`}
    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-2xs font-semibold ${RANK[rank - 1] || 'text-subtle'}`}>
    {rank}
  </span>
);

/** rows: [{uid,name,photoURL,value,rank,completed,noData}] from the API. */
export default function Leaderboard({ rows, target, unit, me }) {
  const max = target || Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.uid} className={`flex items-center gap-3 rounded-md px-2 py-1.5 ${r.uid === me ? 'bg-raised' : ''}`}>
          <RankBadge rank={r.rank} />
          <Avatar member={r} size={24} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
              <span className="truncate text-fg">{r.name}{r.uid === me && <span className="text-subtle"> (you)</span>}</span>
              <span className="flex shrink-0 items-center gap-1 font-mono text-xs text-muted">
                {r.completed && <Check size={12} className="text-success" aria-label="Target reached" />}
                {r.noData ? <span className="text-subtle">no GitHub</span> : <>{r.value}{target ? <span className="text-subtle">/{target}</span> : ''} {unit}</>}
              </span>
            </div>
            <Progress value={r.value} max={max} tone={r.completed ? 'success' : 'accent'} />
          </div>
        </li>
      ))}
    </ol>
  );
}
