import { Skeleton, SkeletonList } from "@/components/client/AppPatterns";

// Shopping is one of the five primary tabs. Its data is personalized and
// dynamic, so keep the destination visible immediately while the current menu
// is streamed rather than leaving the previous screen frozen under the tap.
export default function ShoppingLoading() {
  return (
    <main className="client-app-content" role="status" aria-label="טוענים את רשימת הקניות…">
      <Skeleton className="w-28" />
      <Skeleton variant="title" className="mt-3" />
      <div className="mt-6">
        <SkeletonList rows={7} />
      </div>
      <span className="sr-only">טוענים את רשימת הקניות…</span>
    </main>
  );
}
