export default function WorkoutLoadingState() {
  return (
    <main
      className="grid min-h-[55vh] place-items-center px-4 text-center text-white"
      aria-busy="true"
    >
      <div>
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#D4AF37]/25 border-t-[#D4AF37]" />
        <p className="mt-4 text-sm text-zinc-400">טוענים את נתוני האימון…</p>
      </div>
    </main>
  );
}
