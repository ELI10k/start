type ProgressEntry = Readonly<{
  id: string;
  date: string;
  weight: number | string;
  navel_circumference: number | string | null;
  notes: string | null;
}>;

type Point = Readonly<{ date: string; value: number }>;

function valueOf(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function linePoints(points: readonly Point[]) {
  if (!points.length) return "";
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return points
    .map((point, index) => {
      const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
      const y = 90 - ((point.value - min) / range) * 70;
      return `${x},${y}`;
    })
    .join(" ");
}

function TrendChart({ title, unit, points }: { title: string; unit: string; points: readonly Point[] }) {
  if (!points.length) return null;
  const first = points[0].value;
  const latest = points.at(-1)?.value ?? first;
  const change = Number((latest - first).toFixed(1));
  return (
    <section className="rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-black">{title}</h2>
          <p className="mt-1 text-sm text-[#5B5F5B]">{latest} {unit} · שינוי {change > 0 ? "+" : ""}{change} {unit}</p>
        </div>
        <span className="text-xs text-[#3F433F]">{points.length} מדידות</span>
      </div>
      <svg className="mt-5 h-36 w-full overflow-visible" viewBox="0 0 100 100" role="img" aria-label={title} preserveAspectRatio="none">
        <line x1="0" x2="100" y1="90" y2="90" stroke="#3f3f46" strokeWidth="1" />
        <line x1="0" x2="100" y1="55" y2="55" stroke="#27272a" strokeWidth="1" />
        <polyline fill="none" points={linePoints(points)} stroke="#16A34A" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-[#3F433F]"><span>{points[0].date}</span><span>{points.at(-1)?.date}</span></div>
    </section>
  );
}

export default function PersistedProgressHistory({ entries }: { entries: readonly ProgressEntry[] }) {
  const ordered = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const weights = ordered.flatMap((entry) => {
    const value = valueOf(entry.weight);
    return value === null ? [] : [{ date: entry.date, value }];
  });
  const navelCircumferences = ordered.flatMap((entry) => {
    const value = valueOf(entry.navel_circumference);
    return value === null ? [] : [{ date: entry.date, value }];
  });

  if (!ordered.length) {
    return <p className="rounded-[24px] border border-dashed border-[#E5E7E5] p-10 text-center text-[#5B5F5B]">עדיין אין מדידות.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <TrendChart title="מגמת משקל" unit="ק״ג" points={weights} />
        <TrendChart title="מגמת היקף טבור" unit="ס״מ" points={navelCircumferences} />
      </div>
      <section className="overflow-x-auto rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF]">
        <table className="w-full min-w-[440px] text-right text-sm">
          <thead className="text-[#5B5F5B]"><tr><th className="p-4">תאריך</th><th>משקל</th><th>היקף טבור</th><th className="p-4">הערה</th></tr></thead>
          <tbody>{[...ordered].reverse().map((entry) => <tr key={entry.id} className="border-t border-[#E5E7E5]"><td className="p-4">{entry.date}</td><td>{entry.weight} ק״ג</td><td>{entry.navel_circumference ?? "—"}</td><td className="p-4 text-[#5B5F5B]">{entry.notes ?? "—"}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
