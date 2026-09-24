import { eventPhase, type EventPhase } from '@lib/eventStatus';

/** "Afgelopen" of "Vandaag" bij een evenement; niets als het nog moet komen. */
export default function EventPhaseBadge({ date, phase, now, className = '' }: {
  date?: string | null; phase?: EventPhase; now?: number; className?: string;
}) {
  const p = phase ?? eventPhase(date, now);
  if (p === 'upcoming') return null;
  return p === 'ended' ? (
    <span className={`inline-flex items-center rounded-md border border-white/15 bg-black/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300 ${className}`}>
      Afgelopen
    </span>
  ) : (
    <span className={`inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300 ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Vandaag
    </span>
  );
}
