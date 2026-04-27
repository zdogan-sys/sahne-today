import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-[rgba(228,224,216,0.06)]',
        className
      )}
    />
  )
}

export function EventCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-14 h-14 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-1/4" />
    </div>
  )
}

export function VenueCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  )
}

export function ArtistCardSkeleton() {
  return (
    <div className="card p-4 flex gap-4">
      <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <div className="flex gap-1 pt-1">
          <Skeleton className="h-5 w-10" />
          <Skeleton className="h-5 w-14" />
        </div>
      </div>
    </div>
  )
}
