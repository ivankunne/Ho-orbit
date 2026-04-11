export default function EmptyState({ title = 'Niets gevonden', subtitle = 'Probeer andere filters of zoektermen.', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center col-span-full">
      {/* SVG illustration */}
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mb-5 opacity-40">
        <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="1.5" className="text-slate-600" />
        {/* Music note */}
        <path
          d="M32 52V32l20-4v20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-400"
        />
        <circle cx="28" cy="52" r="4" stroke="currentColor" strokeWidth="2" className="text-slate-400" />
        <circle cx="48" cy="48" r="4" stroke="currentColor" strokeWidth="2" className="text-slate-400" />
        {/* X lines */}
        <line x1="55" y1="25" x2="65" y2="35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-500" />
        <line x1="65" y1="25" x2="55" y2="35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-500" />
      </svg>

      <h3 className="text-base font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">{subtitle}</p>

      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
