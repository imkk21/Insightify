import React, { useState, useEffect, useRef } from 'react';
import { useMusic } from '../context/MusicContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GripHorizontal, Maximize2, Minimize2, ExternalLink } from 'lucide-react';

export default function MusicFloatingPlayer() {
  const { selectedPlaylist, setSelectedPlaylist } = useMusic();
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Persistent Position & Size
  const lastPos = JSON.parse(localStorage.getItem('music-pos') || '{"x": 20, "y": 600}');
  const lastSize = JSON.parse(localStorage.getItem('music-size') || '{"w": 320, "h": 152}');
  
  const [size, setSize] = useState(lastSize);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isMinimized) localStorage.setItem('music-size', JSON.stringify(size));
  }, [size, isMinimized]);

  if (!selectedPlaylist) return null;

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragElastic={0.1}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.9, x: lastPos.x, y: lastPos.y }}
        animate={{ opacity: 1, scale: 1 }}
        onDragEnd={(e, info) => {
          localStorage.setItem('music-pos', JSON.stringify({ x: info.point.x - 160, y: info.point.y - 40 }));
        }}
        className="fixed z-[9999] group shadow-[0_32px_64px_rgba(0,0,0,0.3)] backdrop-blur-3xl border border-border/50 rounded-3xl overflow-hidden bg-card/60"
        style={{ 
          width: isMinimized ? '180px' : 'min(90vw, 320px)', 
          height: isMinimized ? '44px' : 'auto', 
          left: 0,
          top: 0,
          scale: typeof window !== 'undefined' && window.innerWidth < 640 ? 0.85 : 1
        }}
      >
        {/* Neural Drag Handle */}
        <div className="h-10 bg-foreground/5 dark:bg-white/5 border-b border-border/30 flex items-center justify-between px-4 cursor-grab active:cursor-grabbing group-hover:bg-foreground/10 transition-colors">
          <div className="flex items-center gap-2 overflow-hidden">
            <GripHorizontal size={14} className="text-ink3 opacity-40" />
            <div className="text-[10px] font-mono font-black text-teal2 uppercase tracking-widest truncate">Neural Sync active</div>
          </div>
          
          <div className="flex items-center gap-1.5 pl-2">
            <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 rounded-lg hover:bg-white/10 text-ink3 transition-all">
              {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            </button>
            <button onClick={() => setSelectedPlaylist(null)} className="p-1.5 rounded-lg hover:bg-rose/20 text-ink3 hover:text-rose transition-all">
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Resizable Content Area */}
        {!isMinimized && (
          <div className="relative">
             <div 
               ref={containerRef}
               className="overflow-hidden transition-all duration-300"
               style={{ 
                 resize: 'both', 
                 minWidth: '280px', 
                 minHeight: '152px', 
                 maxWidth: '600px', 
                 maxHeight: '800px',
                 width: '100%',
                 height: `${size.h}px`
               }}
               onMouseUp={(e) => {
                 if (containerRef.current) {
                   setSize({ 
                     w: containerRef.current.offsetWidth, 
                     h: containerRef.current.offsetHeight 
                   });
                 }
               }}
             >
               <iframe 
                src={`https://open.spotify.com/embed/playlist/${selectedPlaylist.id}?utm_source=generator&theme=0`} 
                width="100%" height="100%" frameBorder="0" allowFullScreen="" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                className="opacity-95 hover:opacity-100 transition-opacity"
               />
               
               {/* Resize Grip Indicator */}
               <div className="absolute bottom-0 right-0 p-1 pointer-events-none opacity-20 group-hover:opacity-40">
                  <div className="w-3 h-3 border-r-2 border-b-2 border-ink3 rounded-sm" />
               </div>
             </div>
          </div>
        )}

        {/* Minimized Content */}
        {isMinimized && (
          <div className="flex items-center px-4 py-2 gap-3 overflow-hidden">
             <div className="w-6 h-6 rounded-lg bg-teal2/20 flex items-center justify-center animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-teal2" />
             </div>
             <div className="text-[11px] font-bold text-foreground truncate">{selectedPlaylist.name}</div>
          </div>
        )}

      </motion.div>
    </AnimatePresence>
  );
}
