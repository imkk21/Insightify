export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-cream flex flex-col items-center justify-center z-50">
      <div className="mb-6">
        <span className="font-syne font-black text-3xl text-ink tracking-tight">
          Insightify<span className="text-amber">.</span>
        </span>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-amber animate-pulse-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
