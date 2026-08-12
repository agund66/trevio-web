export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded ${className}`} />;
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-6 w-1/2" />
      <ListItemSkeleton />
      <ListItemSkeleton />
      <ListItemSkeleton />
    </div>
  );
}
