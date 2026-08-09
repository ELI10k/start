export default function CoachCheckInsLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div role="status" className="animate-pulse space-y-5">
        <div className="h-10 w-52 rounded bg-[#F1F3F1]" />
        <div className="h-40 rounded-[24px] bg-[#F7F8F7]" />
        <div className="h-96 rounded-[26px] bg-[#F7F8F7]" />
        <span className="sr-only">טוענים צ׳ק־אינים…</span>
      </div>
    </main>
  );
}
