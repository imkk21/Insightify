// CSS-only audio bars: animate while playing, freeze when paused, static under reduced motion.
const CSS = `
.bv-bar { transform-origin: bottom; transform: scaleY(0.25); animation: bv-pulse 1s ease-in-out infinite alternate; animation-play-state: paused; }
.bv-on .bv-bar { animation-play-state: running; }
@keyframes bv-pulse { from { transform: scaleY(0.2); } to { transform: scaleY(1); } }
@media (prefers-reduced-motion: reduce) { .bv-bar { animation: none; transform: scaleY(0.45); } }
`;

const BARS = Array.from({ length: 28 }, (_, i) => ({
  delay: `${-((i * 137) % 1000) / 1000}s`,          // golden-ish scatter so bars don't move in lockstep
  duration: `${0.55 + ((i * 53) % 50) / 100}s`,
  height: 40 + ((i * 29) % 60),
}));

export default function Visualizer({ playing, className = 'h-8' }) {
  return (
    <div aria-hidden="true" className={`flex items-end gap-[3px] ${playing ? 'bv-on' : ''} ${className}`}>
      <style>{CSS}</style>
      {BARS.map((b, i) => (
        <span key={i} className={`bv-bar w-[3px] rounded-full ${playing ? 'bg-accent' : 'bg-line-strong'}`}
          style={{ height: `${b.height}%`, animationDelay: b.delay, animationDuration: b.duration }} />
      ))}
    </div>
  );
}
