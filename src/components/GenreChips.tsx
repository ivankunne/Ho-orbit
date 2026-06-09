import { Check } from 'lucide-react';
import { useGenres } from '@context/GenreContext';
import { cn } from '@lib/utils';

// Grouped multi-select for genre *preferences* (onboarding, account). Shows the
// full catalog as toggleable pills under their big-group headers, and stores
// genre ids. Single, consistent styling for every multi-select genre surface.
export default function GenreChips({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const { optionGroups } = useGenres();

  return (
    <div className="space-y-4">
      {optionGroups.map(group => (
        <div key={group.label}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.options.map(g => {
              const active = selected.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onToggle(g.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-violet-500/50 bg-violet-600/20 text-violet-300'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {active && <Check size={12} />}
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
