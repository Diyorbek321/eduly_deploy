import { cn } from '@/src/lib/utils';

/** Shimmer-style placeholder block. Pair classes with sized div as needed. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl bg-surface-container/60',
        className,
      )}
    />
  );
}

/** Dashboard hero card layout placeholder. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-40 w-full rounded-3xl" />
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

/** Schedule list placeholder — 5 timeline rows. */
export function ScheduleSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-40 rounded-xl" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

/** Shop grid placeholder — 6 reward cards. */
export function ShopSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-32 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
    </div>
  );
}
