import { Link } from 'react-router-dom';

export const Logo = ({ light = false }) => (
  <span className="inline-flex items-center gap-2">
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={light ? '#ffffff' : '#211922'} />
      <path d="M7 7h10v3.5h-3.25v11H17V25H7v-3.5h3.25v-11H7z" fill={light ? '#211922' : '#ffffff'} />
      <circle cx="22" cy="22" r="3" fill="#e60023" />
    </svg>
    <span className={`text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-plum'}`}>Insightify</span>
  </span>
);

export const Footer = ({ links = [] }) => (
  <footer className="bg-char text-silver">
    <div className="mx-auto flex max-w-[1680px] flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
      <div>
        <Logo light />
        <p className="mt-2 text-xs">Your developer week, at a glance.</p>
      </div>
      {links.length > 0 && (
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-white">{l.label}</Link>
          ))}
        </nav>
      )}
      <p className="text-xs">© 2026 Kunal Kumar</p>
    </div>
  </footer>
);
