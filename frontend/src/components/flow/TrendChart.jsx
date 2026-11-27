// 8-week flow score trend: hand-rolled SVG area + line with an accent gradient.
const W = 560;
const H = 180;
const PAD = { l: 28, r: 12, t: 14, b: 26 };
const fmt = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

export default function TrendChart({ weeks = [] }) {
  if (weeks.length < 2) return null;
  const x = (i) => PAD.l + (i / (weeks.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - v / 100) * (H - PAD.t - PAD.b);
  const pts = weeks.map((w, i) => [x(i), y(w.score)]);
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const area = `${line} L${x(weeks.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const last = weeks[weeks.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
      aria-label={`Flow score by week: ${weeks.map((w) => `${fmt(w.weekEnding)} ${w.score}`).join(', ')}`}>
      <defs>
        <linearGradient id="flow-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="flow-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#8f74ff" />
        </linearGradient>
      </defs>
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" strokeDasharray={v ? '3 4' : undefined} />
          <text x={PAD.l - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#71717a" fontFamily="ui-monospace, monospace">{v}</text>
        </g>
      ))}
      <path d={area} fill="url(#flow-area)" />
      <path d={line} fill="none" stroke="url(#flow-line)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 6px rgba(124,92,255,0.5))' }} />
      {weeks.map((w, i) => (
        <g key={w.weekEnding}>
          <circle cx={pts[i][0]} cy={pts[i][1]} r={w === last ? 4.5 : 3}
            fill={w.estimated ? '#111114' : '#8f74ff'} stroke="#8f74ff" strokeWidth="1.5">
            <title>{`Week ending ${fmt(w.weekEnding)}: ${w.score}${w.estimated ? ' (estimated from calendar only)' : ''}`}</title>
          </circle>
          <text x={pts[i][0]} y={H - 8} textAnchor="middle" fontSize="10" fill={w === last ? '#a1a1aa' : '#71717a'}
            fontFamily="ui-monospace, monospace">{fmt(w.weekEnding)}</text>
        </g>
      ))}
    </svg>
  );
}
