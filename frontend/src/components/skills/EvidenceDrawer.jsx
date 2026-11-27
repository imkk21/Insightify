import { useEffect, useRef } from 'react';
import { X, GitCommit, ExternalLink } from 'lucide-react';
import { LevelMeter } from './SkillGraph';
import { timeAgo } from '../../utils';

/** Right-hand slide-over listing the commits that prove one skill. */
export default function EvidenceDrawer({ skill, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!skill) return undefined;
    const prev = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [skill, onClose]);

  if (!skill) return null;
  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/60 backdrop-blur-sm" onMouseDown={onClose}>
      <aside role="dialog" aria-modal="true" aria-labelledby="evidence-title" onMouseDown={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg animate-fade-in flex-col border-l border-line-strong bg-surface shadow-lg">
        <header className="glow border-b border-line px-6 pb-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="label">{skill.category || 'Skill'} · evidence</div>
              <h2 id="evidence-title" className="mt-1.5 text-xl font-semibold tracking-tight text-fg">{skill.name}</h2>
            </div>
            <button ref={closeRef} onClick={onClose} className="btn-ghost btn-icon" aria-label="Close evidence"><X size={16} /></button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-subtle">
            <LevelMeter level={skill.level} size="lg" />
            <span><span className="font-mono text-fg">{skill.evidenceCount}</span> commit{skill.evidenceCount === 1 ? '' : 's'}</span>
            <span><span className="font-mono text-fg">{skill.repos.length}</span> repo{skill.repos.length === 1 ? '' : 's'}</span>
            {skill.lastUsed && <span>last used <span className="font-mono text-fg">{timeAgo(skill.lastUsed)}</span></span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skill.repos.map((r) => <span key={r} className="badge font-mono">{r}</span>)}
          </div>
        </header>

        <ol className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {skill.evidence.map((e) => (
            <li key={`${e.sha}-${e.file}`} className="overflow-hidden rounded-lg border border-line bg-bg">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-raised px-3 py-2">
                <span className="min-w-0 truncate font-mono text-2xs text-muted" title={`${e.repo}/${e.file}`}>
                  <span className="text-fg">{e.repo}</span>/{e.file}
                </span>
                <a href={e.url} target="_blank" rel="noreferrer" className="link inline-flex shrink-0 items-center gap-1 font-mono text-2xs">
                  <GitCommit size={12} aria-hidden="true" />{e.sha}<ExternalLink size={11} aria-hidden="true" />
                  <span className="sr-only">(open commit on GitHub)</span>
                </a>
              </div>
              <pre className="no-scrollbar flex overflow-x-auto px-0 py-2.5 font-mono text-xs leading-5">
                <span className="select-none border-r border-line px-3 text-right text-subtle">{e.line || ' '}</span>
                <code className="px-3 text-success"><span className="select-none text-subtle">+ </span>{e.snippet}</code>
              </pre>
              <div className="border-t border-line px-3 py-1.5 font-mono text-2xs text-subtle">{timeAgo(e.date)}</div>
            </li>
          ))}
        </ol>
        <footer className="border-t border-line px-6 py-3 text-2xs text-subtle">
          Detected deterministically from added lines in public commits. No AI guesses.
        </footer>
      </aside>
    </div>
  );
}
