import { useState, useEffect, useRef } from 'react';
import { useMusic } from '../context/MusicContext';
import { motion } from 'framer-motion';
import { X, GripHorizontal, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

const DEFAULT_POS = { x: 20, y: 80 };

const loadSaved = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};

const IconButton = ({ label, onClick, children }) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-olive transition-colors hover:bg-sand hover:text-plum"
  >
    {children}
  </button>
);

export default function MusicFloatingPlayer() {
  const { selectedPlaylist, setSelectedPlaylist } = useMusic();
  const [isMinimized, setIsMinimized] = useState(false);
  const [height, setHeight] = useState(() => loadSaved('music-size', {}).h ?? 152);
  const [safePos, setSafePos] = useState(() => loadSaved('music-pos', DEFAULT_POS));
  const [resetKey, setResetKey] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('music-size', JSON.stringify({ h: height }));
  }, [height]);

  // Snap back on screen if the saved position is outside the current viewport
  useEffect(() => {
    const checkVisibility = () => {
      if (safePos.x > window.innerWidth - 320 || safePos.y > window.innerHeight - 100 || safePos.x < 0 || safePos.y < 0) {
        setSafePos(DEFAULT_POS);
      }
    };
    checkVisibility();
    window.addEventListener('resize', checkVisibility);
    return () => window.removeEventListener('resize', checkVisibility);
  }, [safePos.x, safePos.y]);

  const resetPosition = () => {
    localStorage.removeItem('music-pos');
    setSafePos(DEFAULT_POS);
    setResetKey((k) => k + 1); // remount so the dragged offset is discarded
  };

  if (!selectedPlaylist) return null;

  return (
    <motion.div
      key={resetKey}
      drag
      dragConstraints={{ left: 0, right: window.innerWidth - 300, top: 0, bottom: window.innerHeight - 100 }}
      dragElastic={0.1}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.95, x: safePos.x, y: safePos.y }}
      animate={{ opacity: 1, scale: 1, x: safePos.x, y: safePos.y }}
      onDragEnd={(e, info) => {
        localStorage.setItem('music-pos', JSON.stringify({ x: info.point.x - 160, y: info.point.y - 40 }));
      }}
      className="fixed left-0 top-0 z-50 overflow-hidden rounded-lg bg-white shadow-overlay"
      style={{ width: isMinimized ? '220px' : 'min(90vw, 320px)' }}
    >
      <div className="flex h-11 cursor-grab items-center justify-between gap-2 bg-fog px-3 active:cursor-grabbing">
        <div className="flex min-w-0 items-center gap-2">
          <GripHorizontal size={16} className="shrink-0 text-silver" aria-hidden="true" />
          <span className="truncate text-xs font-bold">
            {isMinimized ? selectedPlaylist.name : 'Now playing'}
          </span>
        </div>
        <div className="flex shrink-0 items-center">
          <IconButton label="Reset position" onClick={resetPosition}><RotateCcw size={14} /></IconButton>
          <IconButton label={isMinimized ? 'Expand' : 'Minimise'} onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </IconButton>
          <IconButton label="Close player" onClick={() => setSelectedPlaylist(null)}><X size={14} /></IconButton>
        </div>
      </div>

      {!isMinimized && (
        <div
          ref={containerRef}
          className="overflow-hidden"
          style={{ resize: 'both', minWidth: '280px', minHeight: '152px', maxWidth: '600px', maxHeight: '800px', width: '100%', height: `${height}px` }}
          onMouseUp={() => containerRef.current && setHeight(containerRef.current.offsetHeight)}
        >
          <iframe
            title={`Spotify player: ${selectedPlaylist.name}`}
            src={`https://open.spotify.com/embed/playlist/${selectedPlaylist.id}?utm_source=generator&theme=0`}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        </div>
      )}
    </motion.div>
  );
}
