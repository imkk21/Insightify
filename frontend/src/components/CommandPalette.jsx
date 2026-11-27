import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, FileText, ShieldCheck, Newspaper, CloudSun, LogOut } from 'lucide-react';
import { ALL_NAV } from '../nav';
import { useAuth } from '../context/AuthContext';

/** ⌘K / Ctrl+K: jump to any page or run a common action. */
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const commands = useMemo(() => [
    ...ALL_NAV.map((n) => ({ id: n.to, label: n.label, hint: 'Go to', icon: n.icon, run: () => navigate(n.to) })),
    { id: 'standup', label: 'Write my standup', hint: 'Action', icon: FileText, run: () => navigate('/reports') },
    { id: 'scan', label: 'Scan dependencies for vulnerabilities', hint: 'Action', icon: ShieldCheck, run: () => navigate('/security') },
    { id: 'news', label: 'Tech news', hint: 'Go to', icon: Newspaper, run: () => navigate('/news') },
    { id: 'weather', label: 'Weather', hint: 'Go to', icon: CloudSun, run: () => navigate('/weather') },
    { id: 'logout', label: 'Sign out', hint: 'Account', icon: LogOut, run: async () => { await logout(); navigate('/login'); } },
  ], [navigate, logout]);

  const results = commands.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (open) { setQuery(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);
  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const run = (cmd) => { onClose(); cmd.run(); };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); run(results[active]); }
    else if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[15vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Command palette"
        className="w-full max-w-xl animate-fade-in overflow-hidden rounded-xl border border-line-strong bg-overlay shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={16} className="text-subtle" aria-hidden="true" />
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Search pages and actions…" aria-label="Search commands"
            className="h-12 flex-1 bg-transparent text-[14px] text-fg placeholder:text-subtle focus:outline-none" />
          <span className="kbd">esc</span>
        </div>
        <ul role="listbox" className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-subtle">No matches</li>}
          {results.map((c, i) => {
            const Icon = c.icon;
            return (
              <li key={c.id} role="option" aria-selected={i === active}
                onMouseEnter={() => setActive(i)} onClick={() => run(c)}
                className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] ${i === active ? 'bg-raised text-fg' : 'text-muted'}`}>
                <Icon size={16} className={i === active ? 'text-accent-hover' : 'text-subtle'} aria-hidden="true" />
                <span className="flex-1">{c.label}</span>
                <span className="text-2xs text-subtle">{c.hint}</span>
                {i === active && <CornerDownLeft size={14} className="text-subtle" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
