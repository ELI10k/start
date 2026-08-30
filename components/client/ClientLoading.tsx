// The root loading fallback.
//
// Not a <main>. It is the boundary above every segment, so while a page streams
// in it stands beside that page's own <main> - and a coach opening
// /coach/workouts had two main landmarks in the document at once, which is both
// invalid and ambiguous to a screen reader. A skeleton is a status, not the
// document's main content.
export default function ClientLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="טוענים…" className="min-h-screen bg-[#FFFFFF] px-4 pb-28 pt-8 text-[#0B0B0B]">
      <div className="mx-auto max-w-5xl">
        <div className="h-4 w-24 animate-pulse rounded bg-[#BBF7D0]" />
        <div className="mt-4 h-10 w-64 max-w-full animate-pulse rounded-xl bg-[#F1F3F1]" />
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-[22px] bg-[#FFFFFF]" />)}
        </div>
        <div className="mt-5 h-64 animate-pulse rounded-[26px] bg-[#FFFFFF]" />
      </div>
    </div>
  );
}
