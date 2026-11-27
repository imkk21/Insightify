import { initials } from '../../utils';
import { ArrowLeftRight } from 'lucide-react';

// Categorical author hues in fixed order (validated for CVD on the dark surface); authors past 5 fold into "other".
const AUTHOR_COLORS = ['#7c5cff', '#2f9fd6', '#d2588c', '#b88a12', '#2f9c7a'];
const OTHER = '#52525b';

/** Color follows the author's repo-wide rank, so it's the same in every panel. */
export const authorColors = (contributors = []) => {
  const map = Object.fromEntries(contributors.slice(0, AUTHOR_COLORS.length).map((c, i) => [c.name, AUTHOR_COLORS[i]]));
  return (name) => map[name] || OTHER;
};

export const Avatar = ({ name, src, color, size = 20 }) => (
  src
    ? <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full ring-1 ring-line-strong" style={{ width: size, height: size }} />
    : (
      <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-semibold text-white"
        style={{ width: size, height: size, background: color }}>
        {initials(name)}
      </span>
    )
);

const pct = (x) => `${Math.round(x * 100)}%`;

const Path = ({ path }) => {
  const i = path.lastIndexOf('/');
  return (
    <span className="font-mono text-xs" title={path}>
      {i >= 0 && <span className="text-subtle">{path.slice(0, i + 1)}</span>}
      <span className="text-fg">{path.slice(i + 1)}</span>
    </span>
  );
};

export function HotspotTable({ hotspots, avatars, colorOf }) {
  if (!hotspots.length) return <p className="text-[13px] text-subtle">No hotspots: nothing is both complex and frequently changed.</p>;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-2xs uppercase tracking-wider text-subtle">
            <th scope="col" className="py-2 pl-5 pr-2 font-medium">#</th>
            <th scope="col" className="px-2 py-2 font-medium">File</th>
            <th scope="col" className="px-2 py-2 font-medium">Score</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">Churn</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">LOC</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">Complexity</th>
            <th scope="col" className="py-2 pl-2 pr-5 font-medium">Owner</th>
          </tr>
        </thead>
        <tbody>
          {hotspots.map((h, i) => (
            <tr key={h.path} className="border-b border-line last:border-0 hover:bg-raised">
              <td className="py-2.5 pl-5 pr-2 font-mono text-xs text-subtle">{i + 1}</td>
              <td className="max-w-[320px] truncate px-2 py-2.5"><Path path={h.path} /></td>
              <td className="px-2 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-raised">
                    <div className={`h-full rounded-full ${i < 5 ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${h.score}%` }} />
                  </div>
                  <span className="font-mono text-xs text-muted">{h.score}</span>
                </div>
              </td>
              <td className="px-2 py-2.5 text-right font-mono text-xs text-muted">{h.commits}</td>
              <td className="px-2 py-2.5 text-right font-mono text-xs text-muted">{h.loc}</td>
              <td className="px-2 py-2.5 text-right font-mono text-xs text-muted">{h.complexity}</td>
              <td className="py-2.5 pl-2 pr-5">
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <Avatar name={h.owner} src={avatars[h.owner]} color={colorOf(h.owner)} size={18} />
                  <span className="max-w-[110px] truncate text-xs text-muted">{h.owner}</span>
                  <span className="font-mono text-xs text-fg">{pct(h.ownerShare)}</span>
                  {h.ownerShare >= 0.8 && <span className="badge badge-warning">silo</span>}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Stacked author-share bars per top-level directory. */
export function KnowledgeMap({ knowledge, contributors, colorOf }) {
  return (
    <div>
      <ul className="mb-5 flex flex-wrap gap-x-4 gap-y-2" aria-label="Contributors">
        {contributors.slice(0, 6).map((c) => (
          <li key={c.name} className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: colorOf(c.name) }} aria-hidden="true" />
            <Avatar name={c.name} src={c.avatar} color={colorOf(c.name)} size={16} />
            <span className="text-muted">{c.name}</span>
            <span className="font-mono text-subtle">{pct(c.share)}</span>
          </li>
        ))}
      </ul>
      <ul className="space-y-3.5">
        {knowledge.map((d) => (
          <li key={d.dir}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-mono text-fg">{d.dir === '/' ? '/ (root)' : `${d.dir}/`}</span>
                {d.silo && <span className="badge badge-warning" title={`${d.owner} wrote ${pct(d.ownerShare)} of the changes here`}>silo</span>}
              </span>
              <span className="shrink-0 font-mono text-subtle">{d.files} files · {d.lines.toLocaleString()} lines</span>
            </div>
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img"
              aria-label={d.authors.slice(0, 4).map((a) => `${a.name} ${pct(a.share)}`).join(', ')}>
              {d.authors.map((a) => (
                <div key={a.name} className="h-full first:rounded-l-full last:rounded-r-full" title={`${a.name} ${pct(a.share)}`}
                  style={{ width: `${a.share * 100}%`, background: colorOf(a.name) }} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CouplingList({ coupling }) {
  if (!coupling.length) {
    return <p className="text-[13px] text-subtle">No hidden dependencies: no two files changed together in 5+ commits and half their history.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {coupling.map((c) => (
        <li key={`${c.a}|${c.b}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="truncate"><Path path={c.a} /></div>
            <div className="flex items-center gap-1.5 truncate">
              <ArrowLeftRight size={11} className="shrink-0 text-subtle" aria-hidden="true" />
              <Path path={c.b} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-[13px] text-fg">{c.degree}%</div>
            <div className="text-2xs text-subtle">{c.shared} commits together</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
