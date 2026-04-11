export function MovementBadge({ prevPosition, rank }) {
  if (prevPosition === null || prevPosition === undefined) {
    return <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded leading-none">NEW</span>;
  }
  const diff = prevPosition - rank;
  if (diff === 0) return <span className="text-slate-600 text-xs leading-none">—</span>;
  if (diff > 0) return <span className="text-[10px] font-bold text-green-400 leading-none">↑{diff}</span>;
  return <span className="text-[10px] font-bold text-red-400 leading-none">↓{Math.abs(diff)}</span>;
}
