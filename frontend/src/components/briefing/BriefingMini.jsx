import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Radio } from 'lucide-react';
import { Skeleton } from '../UI';
import { briefingAPI, fmtTime } from './briefingApi';
import Visualizer from './Visualizer';

/** Compact "play today's briefing" card for the Today page. Playing happens on /briefing. */
export default function BriefingMini() {
  const [b, setB] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    briefingAPI.get().then((r) => setB(r.data)).catch(() => setFailed(true));
  }, []);

  if (failed) return null;
  const greeting = b?.sections?.[0]?.sentences?.[0];

  return (
    <div className="card glow flex items-center gap-4">
      <Link to="/briefing?play=1" aria-label="Play today's morning briefing"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg shadow-glow transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
        <Play size={18} className="translate-x-px" fill="currentColor" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="label flex items-center gap-1.5"><Radio size={12} /> Morning briefing</div>
        {b ? (
          <Link to="/briefing" className="mt-1 block truncate text-[13px] font-medium text-fg hover:text-accent-hover">{greeting}</Link>
        ) : <Skeleton className="mt-1.5 h-4 w-48" />}
      </div>
      <div className="hidden flex-col items-end gap-1 sm:flex">
        <Visualizer playing={false} className="h-5" />
        <span className="font-mono text-2xs text-subtle">{b ? fmtTime(b.estSeconds) : '–:––'}</span>
      </div>
    </div>
  );
}
