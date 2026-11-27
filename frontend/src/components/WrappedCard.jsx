import { forwardRef } from 'react';
import { levels } from './Charts';

// A 1200×630 share card (the standard social-preview size), drawn as plain SVG so it can be
// turned into a PNG with the browser's own canvas. No external images inside: an SVG drawn
// into a canvas can't load them. ponytail: PNG falls back to system fonts; embed Geist if that matters.

const W = 1200;
const H = 630;
const FONT = 'Geist, Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const MONO = '"Geist Mono", ui-monospace, SFMono-Regular, Consolas, monospace';
const TINTS = ['rgba(255,255,255,0.06)', 'rgba(124,92,255,0.3)', 'rgba(124,92,255,0.55)', 'rgba(124,92,255,0.8)', '#9d85ff'];

const fmtDate = (d, opts) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', ...opts });

const WrappedCard = forwardRef(function WrappedCard({ username, name, wrapped: w, calendar = [] }, ref) {
  const level = levels(calendar);
  const cols = [];
  for (const d of calendar) {
    const wd = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    if (wd === 0 || !cols.length) cols.push([]);
    cols[cols.length - 1][wd] = d;
  }
  const cell = 7;
  const gap = 2;
  const calY = 222; // top-right, beside the big number, clear of the stats grid
  const calW = cols.length * (cell + gap);
  const calX = W - 64 - calW;

  const stats = [
    ['Active days', w.activeDays],
    ['Longest streak', `${w.longestStreak} days`],
    ['Busiest month', w.busiestMonth?.month ?? '—'],
    ['Favourite day', w.favoriteWeekday ?? '—'],
    ['Top language', w.topLanguage ?? '—'],
    ['Pull requests', w.pullRequests],
  ];
  const range = w.from && w.to ? `${fmtDate(w.from, { month: 'short', year: 'numeric' })} – ${fmtDate(w.to, { month: 'short', year: 'numeric' })}` : '';

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H}
      className="h-auto w-full rounded-xl border border-line" role="img" aria-label={`${name}'s year in code: ${w.contributions} contributions`}>
      <defs>
        <linearGradient id="wc-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8f74ff" />
          <stop offset="1" stopColor="#5b3df5" />
        </linearGradient>
        <radialGradient id="wc-haze" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(160 40) scale(760 520)">
          <stop offset="0" stopColor="#7c5cff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#7c5cff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wc-num" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.3" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.6" />
        </linearGradient>
        <pattern id="wc-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="#ffffff" strokeOpacity="0.035" />
        </pattern>
      </defs>

      <rect width={W} height={H} fill="#09090b" />
      <rect width={W} height={H} fill="url(#wc-grid)" />
      <rect width={W} height={H} fill="url(#wc-haze)" />
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="20" fill="none" stroke="#ffffff" strokeOpacity="0.08" />

      {/* Logo: same mark as Brand.jsx (32px grid), scaled to 40px */}
      <g transform="translate(64,56) scale(1.25)">
        <rect width="32" height="32" rx="8" fill="url(#wc-mark)" />
        <path d="M7 7h10v3.5h-3.25v11H17V25H7v-3.5h3.25v-11H7z" fill="#ffffff" />
        <circle cx="22" cy="22" r="3" fill="#ffffff" fillOpacity="0.75" />
      </g>
      <text x="120" y="84" fill="#ededef" fontFamily={FONT} fontSize="24" fontWeight="600" letterSpacing="-0.5">Insightify</text>
      <text x={W - 64} y="82" fill="#71717a" fontFamily={MONO} fontSize="18" textAnchor="end">{range}</text>

      {/* Headline */}
      <text x="64" y="170" fill="#a1a1aa" fontFamily={FONT} fontSize="28" fontWeight="500">
        {name} <tspan fill="#71717a" fontFamily={MONO} fontSize="24">@{username}</tspan>
      </text>
      <text x="64" y="300" fill="url(#wc-num)" fontFamily={FONT} fontSize="132" fontWeight="700" letterSpacing="-6">{w.contributions.toLocaleString('en-US')}</text>
      <text x="64" y="346" fill="#ededef" fontFamily={FONT} fontSize="28" fontWeight="500">contributions in the last year</text>

      {/* Stats grid on a hairline panel */}
      <rect x="48" y="392" width="776" height="190" rx="16" fill="#111114" stroke="#ffffff" strokeOpacity="0.08" />
      {stats.map(([label, value], i) => {
        const x = 76 + (i % 3) * 250;
        const y = 436 + Math.floor(i / 3) * 86;
        return (
          <g key={label}>
            <text x={x} y={y} fill="#71717a" fontFamily={FONT} fontSize="15" fontWeight="500" letterSpacing="1.5">{label.toUpperCase()}</text>
            <text x={x} y={y + 36} fill="#ededef" fontFamily={MONO} fontSize="28" fontWeight="600">{String(value)}</text>
          </g>
        );
      })}

      {/* Mini calendar, top right */}
      <g transform={`translate(${calX}, ${calY})`}>
        {cols.map((col, x) => col.map((d, y) => d && (
          <rect key={d.date} x={x * (cell + gap)} y={y * (cell + gap)} width={cell} height={cell} rx="1.5" fill={TINTS[level(d.count)]} />
        )))}
      </g>
      <text x={W - 64} y={calY + 7 * (cell + gap) + 34} fill="#8f74ff" fontFamily={MONO} fontSize="17" textAnchor="end">
        insightifyweb.vercel.app/u/{username}
      </text>
    </svg>
  );
});

/** Rasterise the card SVG at 2× and download it as a PNG. */
export const downloadCardPng = async (svgEl, filename) => {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = W * 2;
  canvas.height = H * 2;
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

export default WrappedCard;
