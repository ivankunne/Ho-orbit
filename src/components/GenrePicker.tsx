import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { useGenres } from '@context/GenreContext';
import { genreId } from '@data/genres';
import { cn } from '@lib/utils';

// Single-select genre picker with a nested, expandable dropdown: big groups →
// main genres → subgenres revealed in place. The stored value is the genre
// label (matching how `genre` is persisted across the app). A search box lets
// editors jump straight to any genre or subgenre.
export default function GenrePicker({
  value,
  onChange,
  placeholder = 'Selecteer genre',
  className,
  id,
}: {
  value: string;
  onChange: (genre: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const { groups, getGenreColor } = useGenres();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const q = query.trim().toLowerCase();

  // Flat list of every genre + subgenre for search mode.
  const allLabels = useMemo(
    () => groups.flatMap(g => g.genres.flatMap(n => [n.name, ...(n.sub ?? [])])),
    [groups],
  );
  const matches = useMemo(
    () => (q ? allLabels.filter(l => l.toLowerCase().includes(q)) : []),
    [q, allLabels],
  );

  const pick = (label: string) => {
    onChange(label);
    setOpen(false);
    setQuery('');
  };

  const selectedColor = value ? getGenreColor(value) : null;

  const Row = ({ label, indented }: { label: string; indented?: boolean }) => (
    <button
      type="button"
      onClick={() => pick(label)}
      className={cn(
        'flex w-full items-center justify-between rounded-lg py-2 pr-2 text-sm transition-colors hover:bg-white/8',
        indented ? 'pl-9 text-slate-400' : 'pl-3 text-white',
        value === label && 'text-violet-300',
      )}
    >
      <span>{label}</span>
      {value === label && <Check size={14} className="text-violet-400" />}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white transition-all focus:border-violet-500/60 focus:outline-none',
            className,
          )}
        >
          <span className={cn('flex items-center gap-2 truncate', !value && 'text-slate-500')}>
            {selectedColor && <span className={cn('h-2 w-2 shrink-0 rounded-full', selectedColor.dot)} />}
            {value || placeholder}
          </span>
          <ChevronDown size={16} className="shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-0"
      >
        {/* Search */}
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
          <Search size={14} className="shrink-0 text-slate-500" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Zoek genre…"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {value && (
            <button
              type="button"
              onClick={() => pick('')}
              title="Wissen"
              className="shrink-0 text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto p-1">
          {q ? (
            matches.length ? (
              matches.map(label => <Row key={label} label={label} />)
            ) : (
              <p className="px-3 py-6 text-center text-sm text-slate-500">Geen genres gevonden</p>
            )
          ) : (
            groups.map(group => (
              <div key={group.label} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {group.label}
                </p>
                {group.genres.map(node => {
                  const key = genreId(node.name);
                  const hasSub = !!node.sub?.length;
                  const isOpen = expanded[key];
                  return (
                    <div key={node.name}>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => pick(node.name)}
                          className={cn(
                            'flex flex-1 items-center justify-between rounded-lg py-2 pl-3 pr-2 text-sm text-white transition-colors hover:bg-white/8',
                            value === node.name && 'text-violet-300',
                          )}
                        >
                          <span>{node.name}</span>
                          {value === node.name && <Check size={14} className="text-violet-400" />}
                        </button>
                        {hasSub && (
                          <button
                            type="button"
                            onClick={() => setExpanded(e => ({ ...e, [key]: !e[key] }))}
                            title={isOpen ? 'Inklappen' : 'Subgenres tonen'}
                            className="mr-1 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/8 hover:text-white"
                          >
                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                      </div>
                      {hasSub && isOpen && node.sub!.map(sub => <Row key={sub} label={sub} indented />)}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
