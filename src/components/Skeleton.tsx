import { Skeleton } from '@components/ui/skeleton';

export function ArtistCardSkeleton() {
  return (
    <div className="bg-white/3 border border-white/5 rounded-2xl overflow-hidden">
      <Skeleton className="w-full h-48" />
      <div className="px-4 pb-4 pt-2 space-y-2">
        <Skeleton className="w-12 h-12 rounded-full -mt-6 mb-3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function TrackRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3">
      <Skeleton className="w-5 h-4 rounded" />
      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-3 w-16 hidden sm:block" />
      <Skeleton className="h-3 w-10" />
    </div>
  );
}

export function TutorialCardSkeleton() {
  return (
    <div className="bg-white/3 border border-white/5 rounded-xl overflow-hidden">
      <Skeleton className="w-full aspect-video" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="h-4 w-12 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="flex gap-4 p-4 bg-white/3 border border-white/5 rounded-xl">
      <Skeleton className="w-20 h-28 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-2 w-full rounded-full mt-3" />
      </div>
    </div>
  );
}

export default function SkeletonStyles() {
  return null;
}
