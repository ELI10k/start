import { Skeleton, SkeletonCard, SkeletonList } from "@/components/client/AppPatterns";

export default function Loading(){
  return <main className="client-app-content" role="status" aria-label="טוענים את הפרופיל…">
    <Skeleton className="w-24"/>
    <Skeleton variant="title" className="mt-3"/>
    <div className="mt-6 grid gap-4">
      <SkeletonCard/>
      <SkeletonList rows={4}/>
      <SkeletonList rows={5}/>
    </div>
    <span className="sr-only">טוענים את הפרופיל…</span>
  </main>;
}
