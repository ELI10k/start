import { Ruler, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { StateBlock } from "@/components/client/AppPatterns";
import { MetricTile } from "@/components/client/PremiumUI";

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

function changeOf(points: readonly Point[]) {
  if (!points.length) return 0;
  const first = points[0].value;
  const latest = points.at(-1)?.value ?? first;
  return Number((latest - first).toFixed(1));
}

function TrendChart({ title, unit, points }: { title: string; unit: string; points: readonly Point[] }) {
  if (!points.length) return null;
  const latest = points.at(-1)?.value ?? points[0].value;
  const change = changeOf(points);
  return (
    <section className="premium-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-black">{title}</h2>
          <p className="mt-1 text-sm text-[#5B5F5B]">{latest} {unit} · שינוי {change > 0 ? "+" : ""}{change} {unit}</p>
        </div>
        <span className="pill">{points.length} מדידות</span>
      </div>
      {/* One measurement is a dot, not a trend. An empty chart frame reads as a
          broken chart, so say what is missing instead of drawing nothing. */}
      {points.length > 1 ? <>
        <svg className="mt-5 h-36 w-full overflow-visible" viewBox="0 0 100 100" role="img" aria-label={title} preserveAspectRatio="none">
          <line x1="0" x2="100" y1="90" y2="90" stroke="#E5E7E5" strokeWidth="1" />
          <line x1="0" x2="100" y1="55" y2="55" stroke="#E5E7E5" strokeWidth="1" />
          <polyline fill="none" points={linePoints(points)} stroke="#16A34A" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-2 flex justify-between text-xs text-[#5B5F5B]"><span>{points[0].date}</span><span>{points.at(-1)?.date}</span></div>
      </> : <p className="mt-4 rounded-2xl border border-dashed border-[#E5E7E5] p-5 text-center text-sm text-[#5B5F5B]">נדרשת מדידה נוספת כדי להציג מגמה.</p>}
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
    return (
      <StateBlock
        icon={<Scale aria-hidden="true" size={22} />}
        title="עדיין אין מדידות"
        description="השקילה הראשונה שתירשם תופיע כאן, יחד עם גרף המגמה."
      />
    );
  }

  const weightChange = changeOf(weights);
  const navelChange = changeOf(navelCircumferences);
  const latestWeight = weights.at(-1)?.value;
  const latestNavel = navelCircumferences.at(-1)?.value;

  return (
    <div className="grid gap-4">
      {/* The two numbers a client actually opens this screen for, before any chart. */}
      <section className="dashboard-metrics" aria-label="מדדי התקדמות">
        <MetricTile label="משקל אחרון" value={latestWeight !== undefined ? `${latestWeight} ק״ג` : "—"} icon={<Scale aria-hidden="true" size={18} />} />
        <MetricTile
          label="שינוי במשקל"
          value={`${weightChange > 0 ? "+" : ""}${weightChange} ק״ג`}
          accent={weightChange > 0 ? "down" : "green"}
          icon={weightChange > 0 ? <TrendingUp aria-hidden="true" size={18} /> : <TrendingDown aria-hidden="true" size={18} />}
        />
        <MetricTile label="היקף טבור" value={latestNavel !== undefined ? `${latestNavel} ס״מ` : "—"} icon={<Ruler aria-hidden="true" size={18} />} />
        <MetricTile
          label="שינוי בהיקף"
          value={`${navelChange > 0 ? "+" : ""}${navelChange} ס״מ`}
          accent={navelChange > 0 ? "down" : "green"}
          icon={navelChange > 0 ? <TrendingUp aria-hidden="true" size={18} /> : <TrendingDown aria-hidden="true" size={18} />}
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <TrendChart title="מגמת משקל" unit="ק״ג" points={weights} />
        <TrendChart title="מגמת היקף טבור" unit="ס״מ" points={navelCircumferences} />
      </div>

      {/* A four-column table forced a phone to scroll sideways. One row per
          measurement says the same thing and fits. */}
      <section aria-labelledby="measurement-log">
        <div className="section-heading section-heading--compact">
          <h2 id="measurement-log">יומן מדידות</h2>
          <span>{ordered.length} רשומות</span>
        </div>
        <div className="app-list">
          {[...ordered].reverse().map((entry) => (
            <div key={entry.id}>
              <span className="app-list__icon"><Scale aria-hidden="true" size={17} /></span>
              <span className="app-list__main">
                <strong>{entry.weight} ק״ג</strong>
                <span>{entry.date}{entry.notes ? ` · ${entry.notes}` : ""}</span>
              </span>
              <span className="app-list__meta">
                <strong>{entry.navel_circumference ?? "—"}</strong>
                היקף טבור
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
