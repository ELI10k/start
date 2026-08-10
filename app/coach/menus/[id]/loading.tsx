import { Skeleton, SkeletonCard } from "@/components/client/AppPatterns";

// This route is slow - it loads the saved menu tree and the whole food catalogue
// before it can render - so it must not show a blank screen while it waits.
export default function Loading(){
  return <main className="client-app-content" role="status" aria-label="טוענים את התפריט…">
    <div className="flex items-center justify-between gap-4">
      <Skeleton variant="title" className="w-48"/>
      <Skeleton className="h-12 w-28"/>
    </div>
    <div className="mt-6 grid gap-4">
      <SkeletonCard/>
      {Array.from({length:3},(_,index)=><SkeletonCard key={index}/>)}
    </div>
    <span className="sr-only">טוענים את התפריט…</span>
  </main>;
}
