// The root loading fallback.
//
// Not a <main>. It is the boundary above every segment, so while a page streams
// in it stands beside that page's own <main> - and a coach opening
// /coach/workouts had two main landmarks in the document at once, which is both
// invalid and ambiguous to a screen reader. A skeleton is a status, not the
// document's main content.
export default function ClientLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="טוענים…" className="min-h-dvh bg-[#FFFFFF] pb-28 text-[#0B0B0B]">
      <div className="flex h-16 items-center justify-between border-b border-[#E5E7E5] px-5">
        <div className="h-11 w-11 animate-pulse rounded-full bg-[#ECFDF3]" />
        <div className="h-4 w-36 animate-pulse rounded bg-[#BBF7D0]" />
      </div>
      <div className="mx-auto max-w-5xl px-4 pt-5">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-[22px] border border-[#E5E7E5] bg-[#F7F8F7]" />)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-[22px] border border-[#E5E7E5] bg-[#F7F8F7]" />)}
        </div>
        <div className="mt-5 h-20 animate-pulse rounded-[22px] border border-[#E5E7E5] bg-[#F7F8F7]" />
      </div>
    </div>
  );
}
