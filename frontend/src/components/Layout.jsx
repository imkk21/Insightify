import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import { Sun, Moon, LayoutDashboard, GitBranch, CloudRain, Newspaper, Bot, Activity, Settings, LogOut, Music as MusicIcon, ListTodo, Zap, Headphones, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MusicFloatingPlayer from './MusicFloatingPlayer';

const navItems = [
  { label: 'Dashboard',   to: '/', end: true, icon: <LayoutDashboard size={18} /> },
  { label: 'GitHub Stats',to: '/github', icon: <GitBranch size={18} /> },
  { label: 'Weather',     to: '/weather', icon: <CloudRain size={18} /> },
  { label: 'Tech News',   to: '/news', icon: <Newspaper size={18} /> },
  { label: 'Music',        to: '/focus', icon: <MusicIcon size={18} /> },
  { label: 'Tasks',        to: '/tasks', icon: <ListTodo size={18} /> },
  { label: 'AI Assistant', to: '/assistant', icon: <Zap size={18} /> },
  { label: 'AI Insights', to: '/insight', icon: <Bot size={18} /> },
  { label: 'Activity',    to: '/activity', icon: <Activity size={18} /> },
  { label: 'Settings',    to: '/settings', icon: <Settings size={18} /> },
];

export default function Layout() {
  const { user, profile, logout } = useAuth();
  const { selectedPlaylist, setSelectedPlaylist } = useMusic();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const initials = (profile?.displayName || user?.displayName || 'U')
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-500 overflow-x-hidden">
      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-card/80 backdrop-blur-3xl z-[100] flex items-center justify-between px-6">
        <div className="font-syne font-black text-lg text-foreground tracking-tight flex items-center gap-2">
          <div className="w-6 h-6 bg-amber rounded flex items-center justify-center text-[#1a1714] text-xs">I</div>
          Insightify
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-foreground/5 text-foreground hover:bg-foreground/10 transition-all shadow-inner border border-border"
        >
          {isMobileMenuOpen ? <X size={20} /> : <div className="space-y-1"><div className="w-5 h-0.5 bg-foreground" /><div className="w-5 h-0.5 bg-foreground" /><div className="w-5 h-0.5 bg-foreground" /></div>}
        </button>
      </header>

      {/* Sidebar - Desktop & Mobile Drawer */}
      <aside className={`fixed left-0 top-0 bottom-0 w-[280px] border-r border-border bg-card backdrop-blur-3xl flex flex-col z-[110] transition-transform duration-500 lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        
        {/* Logo */}
        <div className="px-8 py-10 border-b border-border">
          <div className="font-syne font-black text-2xl text-foreground tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 bg-amber rounded-lg flex items-center justify-center text-[#1a1714] text-lg shadow-lg shadow-amber/20">I</div>
            Insightify<span className="text-amber">.</span>
          </div>
          <div className="text-[10px] font-mono text-ink3 tracking-[3px] uppercase mt-2 opacity-60">Intelligence Core v3</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-5 py-6 overflow-y-auto scrollbar-hide space-y-1">
          <div className="text-[10px] font-mono text-ink3/40 tracking-[3px] uppercase px-4 pb-4">Primary Systems</div>
          {navItems.slice(0, 7).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {item.icon} <span className="tracking-tight">{item.label}</span>
            </NavLink>
          ))}
          <div className="text-[10px] font-mono text-ink3/40 tracking-[3px] uppercase px-4 pb-4 pt-8">Neural Analytics</div>
          {navItems.slice(7).map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {item.icon} <span className="tracking-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer: User + Theme */}
        <div className="px-5 py-6 border-t border-border space-y-4 bg-background/50 backdrop-blur-md">
          <div className="flex items-center gap-3 bg-card p-3 rounded-3xl border border-border shadow-sm backdrop-blur-xl">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber via-rose to-teal2 flex items-center justify-center font-syne font-black text-sm text-white flex-shrink-0 overflow-hidden shadow-2xl ring-2 ring-white/10">
              {profile?.photoURL ? <img src={profile.photoURL} alt="" /> : initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground truncate tracking-tight">{profile?.displayName || 'User Core'}</div>
              <div className="text-[10px] text-ink3/60 truncate font-mono uppercase tracking-wider">Lvl 4 Dev.</div>
            </div>
            <button onClick={toggleTheme} className="p-2.5 rounded-2xl bg-background border border-border text-foreground hover:border-amber transition-all active:scale-95">
              {theme === 'dark' ? <Sun size={15} className="text-amber" /> : <Moon size={15} className="text-indigo" />}
            </button>
          </div>
          
          <button 
            onClick={async () => { await logout(); navigate('/login'); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-mono font-bold uppercase tracking-[3px] text-ink3/40 hover:text-rose hover:bg-rose/5 transition-all"
          >
            <LogOut size={14} /> Termination Protocol
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[105]"
          />
        )}
      </AnimatePresence>

      <main className="flex-1 lg:ml-[280px] relative z-10 min-h-screen p-5 md:p-8 lg:p-14 overflow-y-auto overflow-x-hidden transition-all duration-500 bg-background/50 pt-24 lg:pt-14">
        <div className="max-w-[1600px] mx-auto relative">
          <Outlet />
        </div>
      </main>
      <MusicFloatingPlayer />
    </div>
  );
}
