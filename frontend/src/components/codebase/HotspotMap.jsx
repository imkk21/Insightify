import { useMemo, useState } from 'react';
import { timeAgo } from '../../utils';

const W = 1000;
const H = 440;

/** Binary-split treemap: halve by weight, cut along the longer side. Items sorted by value desc. */
const layout = (items, x, y, w, h, out = []) => {
  if (!items.length) return out;
  if (items.length === 1) { out.push({ ...items[0], x, y, w, h }); return out; }
  const total = items.reduce((s, i) => s + i.value, 0);
  let acc = items[0].value;
  let cut = 1;
  while (cut < items.length - 1 && acc + items[cut].value <= total / 2) acc += items[cut++].value;
  const f = acc / total;
  if (w >= h) {
    layout(items.slice(0, cut), x, y, w * f, h, out);
    layout(items.slice(cut), x + w * f, y, w * (1 - f), h, out);
  } else {
    layout(items.slice(0, cut), x, y, w, h * f, out);
    layout(items.slice(cut), x, y + h * f, w, h * (1 - f), out);
  }
  return out;
};

// Sequential, one hue: dim violet (rarely changed) → bright violet (changed constantly)
const LOW = [33, 27, 58];
const HIGH = [143, 116, 255];
const shade = (t) => `rgb(${LOW.map((l, i) => Math.round(l + (HIGH[i] - l) * t)).join(',')})`;

const base = (p) => p.split('/').pop();
const dir = (p) => p.split('/').slice(0, -1).join('/');

/** Treemap of measured files: area = lines of code, color = churn. Top hotspots get a red outline. */
export default function HotspotMap({ files, hotspots, totalCommits }) {
  const [active, setActive] = useState(null);
  const hot = useMemo(() => new Map(hotspots.slice(0, 5).map((h, i) => [h.path, i + 1])), [hotspots]);

  const cells = useMemo(() => {
    const maxChurn = Math.max(1, ...files.map((f) => f.commits));
    const items = files.filter((f) => f.loc > 0)
      .map((f) => ({ ...f, value: f.loc, t: Math.sqrt(f.commits / maxChurn) })) // sqrt spreads the long tail
      .sort((a, b) => b.value - a.value);
    return layout(items, 0, 0, W, H);
  }, [files]);

  if (!cells.length) return <p className="py-10 text-center text-[13px] text-subtle">No source files to map.</p>;
  const tip = cells.find((c) => c.path === active);

  return (
    <div>
      <div className="relative" onMouseLeave={() => setActive(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="group" aria-label="Treemap of source files: area is lines of code, brightness is how often the file changed">
          {cells.map((c) => {
            const rank = hot.get(c.path);
            const dark = c.t > 0.7;
            const chars = Math.floor((c.w - 16) / 7.2);
            const name = base(c.path);
            return (
              <g key={c.path} tabIndex={0}
                aria-label={`${c.path}: ${c.loc} lines, changed in ${c.commits} commits, complexity ${c.complexity}${rank ? `, hotspot #${rank}` : ''}`}
                onMouseEnter={() => setActive(c.path)} onFocus={() => setActive(c.path)} onBlur={() => setActive(null)}
                className="cursor-default outline-none">
                <rect x={c.x + 1} y={c.y + 1} width={Math.max(0, c.w - 2)} height={Math.max(0, c.h - 2)} rx="4"
                  fill={shade(c.t)} stroke={rank ? '#f2555a' : active === c.path ? '#ededef' : 'none'}
                  strokeWidth={rank || active === c.path ? 2 : 0}
                  opacity={active && active !== c.path ? 0.55 : 1} style={{ transition: 'opacity .15s' }} />
                {c.w > 56 && c.h > 26 && chars > 3 && (
                  <text x={c.x + 9} y={c.y + 19} fontSize="12" fontWeight="500" fill={dark ? '#09090b' : '#ededef'}
                    fontFamily='"Geist Mono", ui-monospace, monospace' pointerEvents="none">
                    {name.length > chars ? `${name.slice(0, chars - 1)}…` : name}
                  </text>
                )}
                {c.w > 56 && c.h > 44 && (
                  <text x={c.x + 9} y={c.y + 35} fontSize="11" fill={dark ? '#18181c' : '#a1a1aa'} fillOpacity="0.85"
                    fontFamily='"Geist Mono", ui-monospace, monospace' pointerEvents="none">
                    {c.loc} loc · {c.commits}×
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {tip && (
          <div role="tooltip"
            className="pointer-events-none absolute z-10 w-64 rounded-md border border-line-strong bg-overlay p-3 text-xs shadow-lg animate-fade-in"
            style={{
              left: `${Math.min(((tip.x + tip.w / 2) / W) * 100, 100)}%`,
              top: `${((tip.y + tip.h / 2) / H) * 100}%`,
              transform: `translate(${tip.x + tip.w / 2 > W * 0.6 ? 'calc(-100% - 8px)' : '8px'}, -50%)`,
            }}>
            <div className="truncate font-mono text-subtle">{dir(tip.path) || '/'}</div>
            <div className="truncate font-mono text-[13px] font-medium text-fg">{base(tip.path)}</div>
            {hot.has(tip.path) && <span className="badge badge-danger mt-1.5">Hotspot #{hot.get(tip.path)}</span>}
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              {[
                ['Changed', `${tip.commits} / ${totalCommits} commits`],
                ['Lines', tip.loc],
                ['Complexity', tip.complexity],
                ['+/−', `+${tip.added} −${tip.deleted}`],
                ['Owner', `${tip.owner} ${Math.round(tip.ownerShare * 100)}%`],
                ['Last change', timeAgo(tip.lastModified)],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-subtle">{k}</dt>
                  <dd className="truncate text-right font-mono text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-2xs text-subtle">
        <span className="flex items-center gap-2">
          Rarely changed
          <span className="h-2 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${shade(0)}, ${shade(1)})` }} />
          Changed often
        </span>
        <span>Area = lines of code</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border-2 border-danger" /> Top 5 hotspots
        </span>
      </div>
    </div>
  );
}
