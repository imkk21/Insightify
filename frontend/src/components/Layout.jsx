import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeather } from '../hooks/useData';
import { Logo, Footer } from './Brand';
import MusicFloatingPlayer from './MusicFloatingPlayer';
import { initials } from '../utils';

const NAV = [
  { label: 'Today',     to: '/', end: true },
  { label: 'Activity',  to: '/activity' },
  { label: 'Reports',   to: '/reports' },
  { label: 'Security',  to: '/security' },
  { label: 'Focus',     to: '/focus' },
  { label: 'Assistant', to: '/assistant' },
];

const WeatherChip = () => {
  const { data } = useWeather();
  const c = data?.current;
  if (!c) return null;
  return (
    <Link to="/weather" className="btn-ghost hidden px-3 sm:inline-flex" title={`${c.description} in ${data.city}`}>
      {c.icon && <img src={`https://openweathermap.org/img/wn/${c.icon}.png`} alt="" className="-my-2 h-8 w-8" />}
      <span>{c.temp}°</span>
      <span className="hidden font-normal text-olive md:inline">{data.city}</span>
    </Link>
  );
};

export default function Layout() {
  const { user, profile } = useAuth();
  const name = profile?.displayName || user?.displayName || 'You';
  const photo = profile?.photoURL || user?.photoURL;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-6 px-4 sm:px-6">
          <Link to="/" aria-label="Insightify home" className="shrink-0">
            <Logo />
          </Link>

          <nav aria-label="Main" className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto">
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

          <WeatherChip />
          <Link
            to="/settings"
            aria-label="Settings"
            title="Settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-warm text-sm font-bold hover:ring-4 hover:ring-sand"
          >
            {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : initials(name)}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1680px] flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <Footer links={[...NAV, { label: 'News', to: '/news' }, { label: 'Weather', to: '/weather' }, { label: 'Settings', to: '/settings' }]} />
      <MusicFloatingPlayer />
    </div>
  );
}
