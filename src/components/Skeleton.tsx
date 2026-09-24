/**
 * Laadvlakken in de vorm van wat er straks komt te staan.
 *
 * Waarom niet gewoon een spinner: zolang de gegevens onderweg waren toonden
 * de secties op de homepage hun lege toestand — "Nog geen artiesten
 * beschikbaar", "Geen posts gevonden" — en schoot de inhoud er daarna in,
 * waarbij alles eronder verschoof. Een skeleton met dezelfde afmetingen als de
 * echte kaart houdt de plek vrij, zodat er niets springt als de data binnenkomt.
 *
 * De composities hieronder volgen de echte kaarten maat voor maat; pas ze mee
 * aan als een kaart verandert.
 */

type Props = { className?: string };

export function Skeleton({ className = '' }: Props) {
  return <div aria-hidden className={`skeleton rounded-lg ${className}`} />;
}

/** Omhulsel dat hulptechnologie laat weten dat er nog geladen wordt. */
function Busy({ children, className = '', label = 'Laden…' }: { children: React.ReactNode; className?: string; label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  );
}

/** Artiestenkaart: vierkant beeld, naam, plaats, genrelabel. */
export function ArtistCardSkeleton() {
  return (
    <div className="bg-white/3 border border-white/5 rounded-2xl overflow-hidden">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
    </div>
  );
}

/** Nummerkaart (MusicCard): vierkante hoes in een omlijsting, titel, artiest. */
export function TrackCardSkeleton() {
  return (
    <div className="bg-white/3 border border-white/5 rounded-xl p-3">
      <Skeleton className="aspect-square w-full mb-3" />
      <Skeleton className="h-3.5 w-4/5 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function CardGridSkeleton({
  count = 6,
  variant = 'artist',
  className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3',
}: { count?: number; variant?: 'artist' | 'track'; className?: string }) {
  const Card = variant === 'track' ? TrackCardSkeleton : ArtistCardSkeleton;
  return (
    <Busy className={className} label={variant === 'track' ? 'Nummers laden…' : 'Artiesten laden…'}>
      {Array.from({ length: count }, (_, i) => <Card key={i} />)}
    </Busy>
  );
}

/** Lijstregel: rang/thumbnail, twee regels tekst, iets rechts (TrendingRow e.d.). */
export function RowSkeleton({ thumb = 40 }: { thumb?: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-3 w-4 shrink-0" />
      <div className="shrink-0 skeleton rounded-lg" aria-hidden style={{ width: thumb, height: thumb }} />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-3 w-8 shrink-0" />
    </div>
  );
}

export function RowListSkeleton({ count = 5, thumb, divided = true }: { count?: number; thumb?: number; divided?: boolean }) {
  return (
    <Busy label="Lijst laden…">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={divided && i < count - 1 ? 'border-b border-white/5' : ''}>
          <RowSkeleton thumb={thumb} />
        </div>
      ))}
    </Busy>
  );
}

/** Tekstkaart (netwerkoproep, forumtopic): label, titel, twee regels, naam. */
export function TextCardSkeleton() {
  return (
    <div className="bg-white/3 border border-white/5 rounded-2xl p-4 space-y-2.5">
      <Skeleton className="h-4 w-20 rounded-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/3 mt-1" />
    </div>
  );
}

export function TextCardGridSkeleton({
  count = 3,
  className = 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4',
}: { count?: number; className?: string }) {
  return (
    <Busy className={className} label="Berichten laden…">
      {Array.from({ length: count }, (_, i) => <TextCardSkeleton key={i} />)}
    </Busy>
  );
}

/** Tegel met een vaste beeldhoogte (ArtistsPage, stedenkaarten e.d.). */
export function TileSkeleton({ imageClassName = 'h-48' }: { imageClassName?: string }) {
  return (
    <div className="bg-white/3 border border-white/5 rounded-2xl overflow-hidden">
      <Skeleton className={`w-full rounded-none ${imageClassName}`} />
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Een reeks tegels binnen een bestaand raster — geeft alleen de kaarten terug,
 *  zodat ze in hetzelfde grid-element staan als de echte inhoud straks. */
export function TileSkeletons({ count = 8, imageClassName }: { count?: number; imageClassName?: string }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => <TileSkeleton key={i} imageClassName={imageClassName} />)}
    </>
  );
}
