import { Skeleton, SkeletonCard } from "@/components/client/AppPatterns";

// A shaped placeholder rather than a spinner: the session screen has a known
// layout, so it can hold its own shape while the snapshot arrives.
export default function WorkoutLoadingState() {
  return (
    <div className="client-app-content" role="status" aria-busy="true" aria-label="טוענים את נתוני האימון…">
      <div className="flex items-center justify-between gap-4">
        <Skeleton variant="title" className="w-40" />
        <Skeleton className="w-16" />
      </div>
      <Skeleton className="mt-4 h-2" />
      <div className="mt-5 grid gap-3">
        <SkeletonCard />
        <div className="dashboard-metrics">
          {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} variant="tile" className="flex-1" />)}
        </div>
      </div>
      <span className="sr-only">טוענים את נתוני האימון…</span>
    </div>
  );
}
