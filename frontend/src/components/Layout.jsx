import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWeather } from '../hooks/useData';
import { Logo } from './Brand';
import { Loader } from './UI';
import CommandPalette from './CommandPalette';
import MusicFloatingPlayer from './MusicFloatingPlayer';
import { NAV_GROUPS, SETTINGS_ITEM, ALL_NAV } from '../nav';
import { initials } from '../utils';

const NavItem = ({ item, onNavigate }) => {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.end} onClick={onNavigate}
      className={({ isActive }) =>
        `group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors ${
          isActive ? 'bg-raised font-medium text-fg shadow' : 'text-muted hover:bg-raised/60 hover:text-fg'
        }`}>
      {({ isActive }) => (
        <>
          <Icon size={16} className={isActive ? 'text-accent-hover' : 'text-subtle group-hover:text-muted'} aria-hidden="true" />
          {item.label}
        </>
      )}
    </NavLink>
  );
};

function Sidebar({ onNavigate }) {
  const { user, profile } = useAuth();
  const name = profile?.displayName || user?.displayName || 'You';
  const photo = profile?.photoURL || user?.photoURL;
  return (
    <div className="flex h-full flex-col">
      <Link to="/" onClick={onNavigate} className="flex h-14 items-center px-4"><Logo /></Link>
      <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((g) => (
          <div key={g.label}>
            <div className="label mb-1.5 px-2.5">{g.label}</div>
            <div className="space-y-0.5">{g.items.map((item) => <NavItem key={item.to} item={item} onNavigate={onNavigate} />)}</div>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <NavItem item={SETTINGS_ITEM} onNavigate={onNavigate} />
        <div className="mt-2 flex items-center gap-2.5 px-2.5 py-1.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-raised text-2xs font-semibold text-muted ring-1 ring-line-strong">
            {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : initials(name)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] text-fg">{name}</div>
            <div className="truncate text-2xs text-subtle">{user?.email}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const WeatherChip = () => {
  const { data } = useWeather();
  const c = data?.current;
  if (!c) return null;
  return (
    <Link to="/weather" className="btn-ghost btn-sm hidden sm:inline-flex" title={`${c.description} in ${data.city}`}>
      {c.icon && <img src={`https://openweathermap.org/img/wn/${c.icon}.png`} alt="" className="-my-2 h-7 w-7" />}
      <span className="font-mono text-fg">{c.temp}°</span>
      <span className="hidden md:inline">{data.city}</span>
    </Link>
  );
};

export default function Layout() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const current = ALL_NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <div className="app-backdrop min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-bg/80 backdrop-blur lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 animate-fade-in border-r border-line bg-bg">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg/70 px-4 backdrop-blur-xl sm:px-6">
          <button className="btn-icon btn-ghost lg:hidden" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            {drawerOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="text-[13px] font-medium text-muted">{current?.label ?? ''}</div>
          <button onClick={() => setPaletteOpen(true)}
            className="ml-auto flex h-8 w-full max-w-64 items-center gap-2 rounded-md border border-line bg-raised/60 px-2.5 text-[13px] text-subtle transition-colors hover:border-line-strong hover:text-muted">
            <Search size={14} aria-hidden="true" />
            <span className="flex-1 text-left">Search…</span>
            <span className="kbd">⌘K</span>
          </button>
          <WeatherChip />
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
          <Suspense fallback={<Loader />}><div className="animate-fade-in" key={pathname}><Outlet /></div></Suspense>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <MusicFloatingPlayer />
    </div>
  );
}
