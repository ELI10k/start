export default function WorkoutLoadingState() {
  return (
    <div
      className="grid min-h-[55vh] place-items-center px-4 text-center text-[#0B0B0B]"
      aria-busy="true"
    >
      <div>
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#16A34A]/25 border-t-[#16A34A]" />
        <p className="mt-4 text-sm text-[#5B5F5B]">טוענים את נתוני האימון…</p>
      </div>
    </div>
  );
}
