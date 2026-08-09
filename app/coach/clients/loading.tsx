import { Skeleton, SkeletonList } from "@/components/client/AppPatterns";

export default function Loading(){
  return <main className="client-app-content" role="status" aria-label="טוענים לקוחות…">
    <Skeleton className="w-28"/>
    <Skeleton variant="title" className="mt-3"/>
    <Skeleton className="mt-6 h-12"/>
    <div className="mt-4"><SkeletonList rows={5}/></div>
    <span className="sr-only">טוענים לקוחות…</span>
  </main>;
}
