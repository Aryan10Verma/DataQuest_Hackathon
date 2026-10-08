// Loading placeholders. Kept apart from ui.tsx so the app's first script can show them without
// pulling in the animation and tooltip libraries.
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.05] ${className}`} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-40" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}
