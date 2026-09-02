export default function PageLoader() {
  return (
    <div className="min-h-screen bg-[#1a1528] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full bg-violet-600/30 animate-ping" />
          <div className="relative w-12 h-12 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-violet-500 animate-pulse" />
          </div>
        </div>
        <p className="text-sm text-slate-500 animate-pulse">Laden…</p>
      </div>
    </div>
  );
}
