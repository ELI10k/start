export default function NutritionLoading() {
  return (
    <main className="client-app-content" aria-busy="true" aria-label="טוען את היום">
      <div className="day-strip mb-3 h-16 animate-pulse rounded-2xl bg-[#F1F4F1]" />
      <div className="grid gap-4">
        {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-[24px] bg-[#F1F4F1]" />)}
      </div>
    </main>
  );
}
