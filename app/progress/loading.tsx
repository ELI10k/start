import { Skeleton, SkeletonCard, SkeletonList } from "@/components/client/AppPatterns";

export default function Loading(){
  return <main className="client-app-content" role="status" aria-label="טוענים את ההתקדמות…">
    <Skeleton className="w-24"/>
    <Skeleton variant="title" className="mt-3"/>
    <div className="mt-6 grid gap-4">
      <div className="dashboard-metrics">
        {Array.from({length:4},(_,index)=><Skeleton key={index} variant="tile" className="min-w-38 flex-1"/>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2"><SkeletonCard/><SkeletonCard/></div>
      <SkeletonList rows={3}/>
    </div>
    <span className="sr-only">טוענים את ההתקדמות…</span>
  </main>;
}
