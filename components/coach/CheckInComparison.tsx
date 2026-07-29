import { comparisonDelta } from "@/lib/check-ins/coach";

type ComparisonItem = {
  id: string;
  submitted_at: string;
  adherence: number;
  hunger: number;
  energy: number;
  sleep: number;
  mood: number | null;
  weight: number | null;
  navel_circumference: number | null;
  workouts_completed: number | null;
  meal_plan_days: number | null;
  client: { full_name: string } | null;
};

const dimensions = [
  ["משקל", "weight", " ק״ג"],
  ["היקף טבור", "navel_circumference", " ס״מ"],
  ["התמדה", "adherence", "/10"],
  ["רעב", "hunger", "/10"],
  ["אנרגיה", "energy", "/10"],
  ["שינה", "sleep", "/10"],
  ["מצב רוח", "mood", "/10"],
  ["אימונים", "workouts_completed", ""],
  ["ימי תפריט", "meal_plan_days", ""],
] as const;

export default function CheckInComparison({
  left,
  right,
}: {
  left?: ComparisonItem;
  right?: ComparisonItem;
}) {
  if (!left || !right)
    return (
      <p className="rounded-2xl border border-dashed border-[#3A321B] p-6 text-center text-sm text-zinc-500">
        בחרו שני צ׳ק־אינים בפילטר ההשוואה כדי לראות שינוי בין תקופות.
      </p>
    );
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#3A321B]">
      <table className="w-full min-w-[34rem] text-sm">
        <thead className="bg-[#17150F]">
          <tr>
            <th className="p-3 text-right">מדד</th>
            <th className="p-3 text-right">
              {left.client?.full_name} · {new Date(left.submitted_at).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}
            </th>
            <th className="p-3 text-right">
              {right.client?.full_name} · {new Date(right.submitted_at).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}
            </th>
            <th className="p-3 text-right">שינוי</th>
          </tr>
        </thead>
        <tbody>
          {dimensions.map(([label, key, unit]) => {
            const a = left[key];
            const b = right[key];
            const delta = comparisonDelta(a, b);
            return (
              <tr key={key} className="border-t border-white/5">
                <th className="p-3 text-right text-zinc-500">{label}</th>
                <td className="p-3">{a ?? "—"}{a !== null ? unit : ""}</td>
                <td className="p-3">{b ?? "—"}{b !== null ? unit : ""}</td>
                <td className="p-3 font-bold">
                  {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
