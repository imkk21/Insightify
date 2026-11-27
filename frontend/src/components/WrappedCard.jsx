import { forwardRef } from 'react';
import { levels } from './Charts';

// A 1200×630 share card (the standard social-preview size), drawn as plain SVG so it can be
// turned into a PNG with the browser's own canvas. No external images inside: an SVG drawn
// into a canvas can't load them. ponytail: PNG falls back to system fonts; embed Figtree if that matters.

const W = 1200;
const H = 630;
const FONT = 'Figtree, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const TINTS = ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.8)', '#ffffff'];

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
      className="h-auto w-full rounded-lg" role="img" aria-label={`${name}'s year in code: ${w.contributions} contributions`}>
      <rect width={W} height={H} fill="#33332e" />

      {/* Logo */}
      <rect x="64" y="56" width="40" height="40" rx="10" fill="#ffffff" />
      {/* Same mark as favicon.svg (32px grid), scaled to 40px */}
      <g transform="translate(64,56) scale(1.25)">
        <path d="M7 7h10v3.5h-3.25v11H17V25H7v-3.5h3.25v-11H7z" fill="#211922" />
        <circle cx="22" cy="22" r="3" fill="#e60023" />
      </g>
      <text x="120" y="84" fill="#ffffff" fontFamily={FONT} fontSize="26" fontWeight="700">Insightify</text>
      <text x={W - 64} y="84" fill="#91918c" fontFamily={FONT} fontSize="20" textAnchor="end">{range}</text>

      {/* Headline */}
      <text x="64" y="170" fill="#c8c8c1" fontFamily={FONT} fontSize="30" fontWeight="600">{name} · @{username}</text>
      <text x="64" y="300" fill="#ffffff" fontFamily={FONT} fontSize="132" fontWeight="800" letterSpacing="-4">{w.contributions.toLocaleString('en-US')}</text>
      <text x="64" y="346" fill="#e5e5e0" fontFamily={FONT} fontSize="30" fontWeight="600">contributions in the last year</text>

      {/* Stats grid */}
      {stats.map(([label, value], i) => {
        const x = 64 + (i % 3) * 250;
        const y = 430 + Math.floor(i / 3) * 96;
        return (
          <g key={label}>
            <text x={x} y={y} fill="#91918c" fontFamily={FONT} fontSize="20">{label}</text>
            <text x={x} y={y + 40} fill="#ffffff" fontFamily={FONT} fontSize="32" fontWeight="700">{String(value)}</text>
          </g>
        );
      })}

      {/* Mini calendar, top right */}
      <g transform={`translate(${calX}, ${calY})`}>
        {cols.map((col, x) => col.map((d, y) => d && (
          <rect key={d.date} x={x * (cell + gap)} y={y * (cell + gap)} width={cell} height={cell} rx="2" fill={TINTS[level(d.count)]} />
        )))}
      </g>
      <text x={W - 64} y={calY + 7 * (cell + gap) + 34} fill="#91918c" fontFamily={FONT} fontSize="18" textAnchor="end">
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
