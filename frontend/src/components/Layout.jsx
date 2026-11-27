import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo, Footer } from './Brand';
import MusicFloatingPlayer from './MusicFloatingPlayer';
import { initials } from '../utils';

const NAV = [
  { label: 'Home',      to: '/', end: true },
  { label: 'Insights',  to: '/insight' },
  { label: 'GitHub',    to: '/github' },
  { label: 'Activity',  to: '/activity' },
  { label: 'Weather',   to: '/weather' },
  { label: 'News',      to: '/news' },
  { label: 'Music',     to: '/music' },
  { label: 'Tasks',     to: '/tasks' },
  { label: 'Assistant', to: '/assistant' },
];

export default function Layout() {
  const { user, profile } = useAuth();
  const name = profile?.displayName || user?.displayName || 'You';
  const photo = profile?.photoURL || user?.photoURL;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur">
        {/* Below xl the nav wraps to its own horizontally scrolling row */}
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-x-6 px-4 sm:px-6">
          <Link to="/" aria-label="Insightify home" className="flex h-16 items-center">
            <Logo />
          </Link>

          <nav
            aria-label="Main"
            className="no-scrollbar order-last -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 xl:order-none xl:mx-0 xl:w-auto xl:flex-1 xl:px-0 xl:pb-0"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `shrink-0 rounded px-4 py-2.5 font-semibold transition-colors ${
                    isActive ? 'bg-plum text-white' : 'text-plum hover:bg-sand'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <Link
            to="/settings"
            aria-label="Settings"
            title="Settings"
            className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-warm text-sm font-bold hover:ring-4 hover:ring-sand xl:ml-0"
          >
            {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : initials(name)}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1680px] flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <Footer links={[...NAV, { label: 'Settings', to: '/settings' }]} />
      <MusicFloatingPlayer />
    </div>
  );
}
