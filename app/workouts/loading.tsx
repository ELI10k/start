import { Skeleton, SkeletonCard, SkeletonList } from "@/components/client/AppPatterns";

// The placeholder mirrors the real screen - header, hero, four tiles, two lists -
// so the layout holds still when the workout data lands.
export default function Loading(){
  return <main className="client-app-content" role="status" aria-label="טוענים את האימון…">
    <Skeleton className="w-28"/>
    <Skeleton variant="title" className="mt-3"/>
    <div className="mt-6 grid gap-4">
      <SkeletonCard/>
      <div className="dashboard-metrics">
        {Array.from({length:4},(_,index)=><Skeleton key={index} variant="tile" className="min-w-38 flex-1"/>)}
      </div>
      <SkeletonList rows={3}/>
    </div>
    <span className="sr-only">טוענים את האימון…</span>
  </main>;
}
