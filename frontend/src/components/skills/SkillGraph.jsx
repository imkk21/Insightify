import { Code2, LayoutTemplate, Server, Database, Cloud, FlaskConical, ShieldCheck, Sparkles } from 'lucide-react';
import { Masonry } from '../UI';

export const CATEGORY_ICONS = {
  Languages: Code2, Frontend: LayoutTemplate, Backend: Server, Data: Database,
  'DevOps & Cloud': Cloud, 'Testing & Quality': FlaskConical, Security: ShieldCheck, AI: Sparkles,
};

/** Five segments, filled up to `level`. */
export const LevelMeter = ({ level, size = 'sm' }) => (
  <span role="img" aria-label={`Level ${level} of 5`} className="inline-flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} className={`${size === 'lg' ? 'h-2 w-5' : 'h-1.5 w-3'} rounded-full ${i <= level ? 'bg-accent' : 'bg-raised'}`}
        style={i <= level ? { boxShadow: '0 0 6px rgba(124,92,255,0.55)' } : undefined} />
    ))}
  </span>
);

/** One card per category; each skill row opens its evidence. `limit` trims long categories (public view). */
export default function SkillGraph({ categories, onSelect, selected, limit }) {
  return (
    <Masonry cols="columns-1 md:columns-2 xl:columns-3">
      {categories.map((c) => {
        const Icon = CATEGORY_ICONS[c.name] || Code2;
        const commits = c.skills.reduce((a, s) => a + s.evidenceCount, 0);
        const skills = limit ? c.skills.slice(0, limit) : c.skills;
        return (
          <section key={c.name} className="card animate-fade-in" aria-label={c.name}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-raised text-accent-hover">
                  <Icon size={14} aria-hidden="true" />
                </span>
                <h3 className="text-[13px] font-semibold text-fg">{c.name}</h3>
              </div>
              <span className="font-mono text-2xs text-subtle">{c.skills.length} skill{c.skills.length === 1 ? '' : 's'} · {commits} hits</span>
            </div>
            <ul className="-mx-2">
              {skills.map((s) => (
                <li key={s.name}>
                  <button onClick={() => onSelect({ ...s, category: c.name })} aria-haspopup="dialog"
                    className={`group flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-raised ${selected?.name === s.name ? 'bg-raised' : ''}`}>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-muted group-hover:text-fg">{s.name}</span>
                    <LevelMeter level={s.level} />
                    <span className="w-14 text-right font-mono text-2xs text-subtle" title={`${s.evidenceCount} commits across ${s.repos.length} repos`}>
                      {s.evidenceCount}c · {s.repos.length}r
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {limit && c.skills.length > limit && <div className="mt-2 font-mono text-2xs text-subtle">+{c.skills.length - limit} more</div>}
          </section>
        );
      })}
    </Masonry>
  );
}
