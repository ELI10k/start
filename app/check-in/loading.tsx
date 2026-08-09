import { Skeleton, SkeletonCard } from "@/components/client/AppPatterns";

export default function Loading(){
  return <main className="client-app-content" role="status" aria-label="טוענים את הצ׳ק־אין…">
    <Skeleton className="w-24"/>
    <Skeleton variant="title" className="mt-3"/>
    <div className="mt-6 grid gap-3">
      {Array.from({length:4},(_,index)=><SkeletonCard key={index}/>)}
    </div>
    <span className="sr-only">טוענים את הצ׳ק־אין…</span>
  </main>;
}
