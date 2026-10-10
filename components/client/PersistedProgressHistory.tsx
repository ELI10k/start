import { Ruler, Scale } from "lucide-react";
import { StateBlock } from "@/components/client/AppPatterns";
import WeightGoalMeter from "@/components/client/WeightGoalMeter";
import { averageWeightChangeRates } from "@/lib/progress/rates";
import { weightGoalProgress, type WeightGoalProgress } from "@/lib/progress/weight-goal";
import { weightTrendTone } from "@/lib/progress/weight-trend";

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

function chartPoints(points: readonly Point[]) {
  if (!points.length) return [];
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return points.map((point, index) => {
      const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
      const y = 90 - ((point.value - min) / range) * 70;
      return { x, y, value: point.value };
    });
}

function rateLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value} ק״ג`;
}

function MetricOverview({ metric, points, targetWeight, nutritionGoal, goalProgress, weeklyKg, monthlyKg }: { metric: "weight" | "measurements"; points: readonly Point[]; targetWeight?: number | string | null; nutritionGoal?: string | null; goalProgress?: WeightGoalProgress | null; weeklyKg?: number | null; monthlyKg?: number | null }) {
  if (!points.length) return <StateBlock icon={metric === "weight" ? <Scale aria-hidden="true" size={22} /> : <Ruler aria-hidden="true" size={22} />} title="עדיין אין מדידות" description="המדידה הראשונה שתירשם תופיע כאן, יחד עם גרף המגמה." />;
  const title = metric === "weight" ? "משקל נוכחי" : "היקף טבור נוכחי";
  const unit = metric === "weight" ? "ק״ג" : "ס״מ";
  const latest = points.at(-1)?.value ?? points[0].value;
  const first = points[0].value;
  const previous = points.at(-2)?.value;
  const recentChange = previous === undefined ? null : Number((latest - previous).toFixed(1));
  const recentTone = recentChange !== null ? weightTrendTone(recentChange, nutritionGoal) : "neutral";
  const totalChange = Number((latest - first).toFixed(1));
  const totalTone = metric === "weight" ? weightTrendTone(totalChange, nutritionGoal) : "neutral";
  const target = Number(targetWeight);
  const hasTarget = metric === "weight" && Number.isFinite(target);
  const comparison = recentChange === null ? "זו המדידה הראשונה" : `${recentChange > 0 ? "עלייה" : recentChange < 0 ? "ירידה" : "ללא שינוי"}${recentChange === 0 ? " מהמדידה הקודמת" : ` של ${Math.abs(recentChange)} ${unit} מהמדידה הקודמת`}`;
  const insight = metric === "measurements"
    ? totalChange < 0 ? "נרשמת ירידה עקבית בהיקף" : totalChange > 0 ? "נרשמה עלייה בהיקף לאורך התקופה" : "ההיקף נשאר יציב לאורך התקופה"
    : nutritionGoal?.includes("cut") && totalChange <= 0 ? "המגמה תואמת את יעד החיטוב" : nutritionGoal?.includes("bulk") && totalChange >= 0 ? "המגמה תואמת את יעד המסה" : hasTarget ? `נותרו ${Math.abs(latest - target).toFixed(1)} ק״ג ליעד` : "המשך מדידות עקביות יציג מגמה מדויקת יותר";
  const coordinates = chartPoints(points);
  return (
    <div className="metric-overview">
      <section className="health-summary-card metric-overview__card">
        <span className="health-summary-card__icon">{metric === "weight" ? <Scale aria-hidden="true" size={24} /> : <Ruler aria-hidden="true" size={24} />}</span>
        <p>{title}</p>
        <strong>{latest} {unit}</strong>
        <small className={`metric-overview__comparison metric-overview__comparison--${recentTone}`}>{comparison}</small>
      {points.length > 1 ? <>
        <svg className="metric-overview__chart" viewBox="0 0 100 100" role="img" aria-label={`מגמת ${title}`} preserveAspectRatio="none">
          <line x1="0" x2="100" y1="90" y2="90" stroke="#E5E7E5" strokeWidth="1" />
          <line x1="0" x2="100" y1="55" y2="55" stroke="#E5E7E5" strokeWidth="1" />
          {coordinates.slice(1).map((point, index) => {
            const previousPoint = coordinates[index];
            const tone = weightTrendTone(point.value - previousPoint.value, nutritionGoal);
            return <line key={`${point.x}-${point.y}`} className={`metric-overview__segment metric-overview__segment--${tone}`} x1={previousPoint.x} y1={previousPoint.y} x2={point.x} y2={point.y} />;
          })}
        </svg>
        <div className="metric-overview__dates"><span>{points[0].date}</span><span>{points.at(-1)?.date}</span></div>
      </> : <p className="metric-overview__empty">נדרשת מדידה נוספת כדי להציג מגמה.</p>}
      </section>
      {metric === "weight" && goalProgress ? (
        <section className="premium-card metric-overview__goal" aria-label="התקדמות ליעד המשקל">
          <WeightGoalMeter progress={goalProgress} weeklyKg={weeklyKg} />
        </section>
      ) : null}
      <div className="health-stat-grid">
        <div>{metric === "weight" ? <Scale aria-hidden="true" /> : <Ruler aria-hidden="true" />}<strong>{first} {unit}</strong><span>{metric === "weight" ? "משקל התחלה" : "היקף התחלה"}</span></div>
        <div>{metric === "weight" ? <Scale aria-hidden="true" /> : <Ruler aria-hidden="true" />}<strong className={`health-stat-grid__value--${totalTone}`}>{totalChange > 0 ? "+" : ""}{totalChange} {unit}</strong><span>שינוי כולל</span></div>
        {metric === "weight" ? <>
          <div><Scale aria-hidden="true" /><strong className={`health-stat-grid__value--${weeklyKg === null || weeklyKg === undefined ? "neutral" : weightTrendTone(weeklyKg, nutritionGoal)}`}>{rateLabel(weeklyKg)}</strong><span>{weeklyKg === null || weeklyKg === undefined ? "ממוצע שבועי · נדרשים 7 ימים" : "ממוצע שבועי"}</span></div>
          <div><Scale aria-hidden="true" /><strong className={`health-stat-grid__value--${monthlyKg === null || monthlyKg === undefined ? "neutral" : weightTrendTone(monthlyKg, nutritionGoal)}`}>{rateLabel(monthlyKg)}</strong><span>{monthlyKg === null || monthlyKg === undefined ? "ממוצע חודשי · נדרשים 30 ימים" : "ממוצע חודשי"}</span></div>
        </> : null}
      </div>
      <p className="health-insight">{insight}</p>
    </div>
  );
}

export default function PersistedProgressHistory({ entries, targetWeight, nutritionGoal, metric = "weight" }: { entries: readonly ProgressEntry[]; targetWeight?: number | string | null; nutritionGoal?: string | null; metric?: "weight" | "measurements" }) {
  const ordered = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const weights = ordered.flatMap((entry) => {
    const value = valueOf(entry.weight);
    return value === null ? [] : [{ date: entry.date, value }];
  });
  const navelCircumferences = ordered.flatMap((entry) => {
    const value = valueOf(entry.navel_circumference);
    return value === null ? [] : [{ date: entry.date, value }];
  });
  const goalProgress = weightGoalProgress(entries, targetWeight);
  const weightRates = averageWeightChangeRates(weights);

  if (!ordered.length) {
    return (
      <StateBlock
        icon={<Scale aria-hidden="true" size={22} />}
        title="עדיין אין מדידות"
        description="השקילה הראשונה שתירשם תופיע כאן, יחד עם גרף המגמה."
      />
    );
  }

  const displayedEntries = ordered
    .map((entry, index) => ({ entry, previousWeight: index > 0 ? valueOf(ordered[index - 1].weight) : null }))
    .reverse();

  return (
    <div className="grid gap-4">
      <MetricOverview metric={metric} points={metric === "weight" ? weights : navelCircumferences} targetWeight={targetWeight} nutritionGoal={nutritionGoal} goalProgress={goalProgress} weeklyKg={weightRates?.weeklyKg} monthlyKg={weightRates?.monthlyKg} />

      {/* A four-column table forced a phone to scroll sideways. One row per
          measurement says the same thing and fits. */}
      <section aria-labelledby="measurement-log">
        <div className="section-heading section-heading--compact">
          <h2 id="measurement-log">יומן מדידות</h2>
          <span>{ordered.length} רשומות</span>
        </div>
        <div className="app-list">
          {displayedEntries.map(({ entry, previousWeight }) => {
            const currentWeight = valueOf(entry.weight);
            const change = currentWeight !== null && previousWeight !== null
              ? Number((currentWeight - previousWeight).toFixed(1))
              : null;
            const tone = change === null ? "neutral" : weightTrendTone(change, nutritionGoal);

            return (
              <div className="measurement-log__row" key={entry.id}>
                <span className="app-list__icon"><Scale aria-hidden="true" size={17} /></span>
                <span className="app-list__main">
                  <strong>{entry.weight} ק״ג</strong>
                  <span>{entry.date}{entry.notes ? ` · ${entry.notes}` : ""}</span>
                </span>
                <span
                  className={`measurement-change measurement-change--${tone}`}
                  aria-label={change === null ? "שקילה ראשונה" : `שינוי של ${change > 0 ? "פלוס " : change < 0 ? "מינוס " : ""}${Math.abs(change)} קילוגרם מהשקילה הקודמת`}
                >
                  {change === null ? "התחלה" : `${change > 0 ? "+" : ""}${change} ק״ג`}
                </span>
                <span className="app-list__meta">
                  <strong>{entry.navel_circumference ?? "—"}</strong>
                  היקף טבור
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
