import { Link } from 'react-router-dom';

export const LogoMark = ({ className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 32 32" className={`shrink-0 ${className}`} aria-hidden="true">
    <defs>
      <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8f74ff" />
        <stop offset="1" stopColor="#5b3df5" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#logo-g)" />
    <path d="M7 7h10v3.5h-3.25v11H17V25H7v-3.5h3.25v-11H7z" fill="#fff" />
    <circle cx="22" cy="22" r="3" fill="#fff" fillOpacity="0.75" />
  </svg>
);

export const Logo = () => (
  <span className="inline-flex items-center gap-2.5">
    <LogoMark />
    <span className="text-[15px] font-semibold tracking-tight text-fg">Insightify</span>
  </span>
);

/** Minimal footer for public pages (the app itself uses the sidebar). */
export const Footer = () => (
  <footer className="border-t border-line">
    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
      <Link to="/" className="inline-flex items-center gap-2 text-muted hover:text-fg"><LogoMark className="h-5 w-5" /> Insightify</Link>
      <span>Engineering intelligence for developers · © 2026 Kunal Kumar</span>
    </div>
  </footer>
);
