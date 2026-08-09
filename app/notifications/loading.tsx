import { Skeleton, SkeletonList } from "@/components/client/AppPatterns";

export default function Loading(){
  return <main className="client-app-content" role="status" aria-label="טוענים התראות…">
    <Skeleton className="w-20"/>
    <Skeleton variant="title" className="mt-3"/>
    <div className="mt-6"><SkeletonList rows={5}/></div>
    <span className="sr-only">טוענים התראות…</span>
  </main>;
}
