import { Skeleton, SkeletonCard } from "@/components/client/AppPatterns";

export default function Loading(){
  return <main className="client-app-content" role="status" aria-label="טוענים תכנים…">
    <Skeleton className="w-28"/>
    <Skeleton variant="title" className="mt-3"/>
    <div className="chip-row mt-6">
      {Array.from({length:4},(_,index)=><Skeleton key={index} className="h-11 w-24 shrink-0"/>)}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({length:6},(_,index)=><SkeletonCard key={index}/>)}
    </div>
    <span className="sr-only">טוענים תכנים…</span>
  </main>;
}
