import { useGenres } from '@context/GenreContext';
import { cn } from '@lib/utils';

// The single, consistent way to display a genre anywhere in the app: a coloured
// pill whose colour comes from the genre catalog. Use this instead of ad-hoc
// spans so every genre reads the same across pages.
export default function GenreBadge({
  genre,
  size = 'sm',
  withDot = false,
  className,
}: {
  genre?: string | null;
  size?: 'sm' | 'md';
  withDot?: boolean;
  className?: string;
}) {
  const { getGenreColor } = useGenres();
  if (!genre) return null;

  const c = getGenreColor(genre);
  const sizing = size === 'md' ? 'text-sm px-2.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        c.bg, c.text, c.border, sizing, className,
      )}
    >
      {withDot && <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />}
      {genre}
    </span>
  );
}
