export default function CoachCheckInsLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div role="status" className="animate-pulse space-y-5">
        <div className="h-10 w-52 rounded bg-white/10" />
        <div className="h-40 rounded-[24px] bg-white/5" />
        <div className="h-96 rounded-[26px] bg-white/5" />
        <span className="sr-only">טוענים צ׳ק־אינים…</span>
      </div>
    </main>
  );
}
