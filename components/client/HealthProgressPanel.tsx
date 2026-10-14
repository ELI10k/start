"use client";

import { useState } from "react";
import { Footprints, MoonStar, RefreshCw, Settings, Target } from "lucide-react";
import { DEFAULT_SLEEP_GOAL_MINUTES, averageReportedSteps, calendarDay, calendarWeekDays, dailyStepsNeededForWeeklyGoal, formatSleep, lastDays, sleepByDay, stepsByDay, summarizeSteps } from "@/lib/health/calculations";
import { healthCardModel } from "@/lib/health/status";
import type { HealthMetric } from "@/lib/health/sync-controller";
import { useHealthSync, useMinuteClock } from "@/components/client/useHealthSync";

const DAY_LABEL = new Intl.DateTimeFormat("he-IL", { weekday: "narrow", timeZone: "UTC" });
const dayLabel = (day: string) => DAY_LABEL.format(new Date(`${day}T12:00:00Z`));
const dateLabel = (day: string) => new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

function Bars({ values, goal, formatter, monthly = false }: { values: readonly { day: string; value: number; reported?: boolean }[]; goal: number; formatter: (value: number) => string; monthly?: boolean }) {
  const max = Math.max(goal, ...values.map((point) => point.value), 1);
  return (
    <div className="health-chart" data-monthly={monthly || undefined} role="img" aria-label={values.map((point) => `${monthly ? dateLabel(point.day) : dayLabel(point.day)} ${point.reported === false ? "אין נתון" : formatter(point.value)}`).join(", ")}>
      <div className="health-chart__plot" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
        <span className="health-chart__goal" style={{ insetBlockEnd: `${Math.min(92, (goal / max) * 100)}%` }}><small>יעד</small></span>
        {values.map((point) => (
          <span className="health-chart__column" key={point.day}>
            <b>{point.reported === false ? "—" : point.value ? formatter(point.value) : "0"}</b>
            <i data-empty={point.reported === false || undefined} style={{ height: `${point.reported === false ? 1 : Math.max(point.value ? 7 : 1, (point.value / max) * 100)}%` }} />
            <small>{monthly ? dateLabel(point.day) : dayLabel(point.day)}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function HealthProgressPanel({ metric }: { metric: "steps" | "sleep" }) {
  // The same controller the home cards use: one read, one snapshot, and the
  // same answer to "is it connected" on both screens.
  const { state } = useHealthSync();
  const snapshot = state.snapshot;
  const [period, setPeriod] = useState<"week" | "month">("week");
  const today = calendarDay();

  const dayCount = period === "month" ? 30 : 7;
  const days = period === "week" ? calendarWeekDays(today) : lastDays(today, dayCount);
  const periodPicker = (
    <div className="health-period-picker" role="group" aria-label="טווח הצגה">
      <button type="button" aria-pressed={period === "week"} onClick={() => setPeriod("week")}>שבועי</button>
      <button type="button" aria-pressed={period === "month"} onClick={() => setPeriod("month")}>חודשי</button>
    </div>
  );

  if (metric === "steps") {
    const summary = summarizeSteps(snapshot.entries, snapshot.preferences, today);
    const stepByDay = stepsByDay(snapshot.entries);
    const values = days.map((day) => ({ day, value: stepByDay.get(day)?.steps ?? 0, reported: stepByDay.has(day) }));
    const average = averageReportedSteps(snapshot.entries, days);
    const total = values.reduce((sum, point) => sum + point.value, 0);
    const periodGoal = summary.goal * dayCount;
    const daysMetGoal = values.filter((point) => point.value >= summary.goal).length;
    const remaining = Math.max(0, summary.goal - (average ?? 0));
    const remainingWeekDays = Math.max(1, days.length - Math.max(0, days.indexOf(today)));
    const dailyNeededForWeek = dailyStepsNeededForWeeklyGoal(total, periodGoal, remainingWeekDays);
    return (
      <div className="health-progress-view">
        {periodPicker}
        <section className="health-summary-card">
          <span className="health-summary-card__icon"><Footprints aria-hidden="true" size={24} /></span>
          <p>ממוצע יומי {period === "month" ? "בחודש" : "בשבוע"}</p>
          <strong>{average !== null ? average.toLocaleString("he-IL") : "אין נתונים"}</strong>
          <small className="health-summary-card__goal">{average !== null ? `מתוך ${summary.goal.toLocaleString("he-IL")}` : "אין עדיין דגימות בטווח הזה"}</small>
          {/* No bars at all until a day has reported: a row of zeroes reads as
              a week of not walking, not as a week of no data. */}
          {values.some((point) => point.reported) ? <Bars values={values} goal={summary.goal} formatter={(value) => value.toLocaleString("he-IL")} monthly={period === "month"} /> : null}
        </section>
        <div className="health-stat-grid">
          <div><Target aria-hidden="true" /><strong>{daysMetGoal} מתוך {dayCount}</strong><span>ימים ביעד</span></div>
          <div className="health-stat-grid__with-goal"><Footprints aria-hidden="true" /><strong>{total.toLocaleString("he-IL")}</strong><span>צעדים {period === "month" ? "בחודש" : "בשבוע"}</span><small className="health-stat-grid__goal">מתוך {periodGoal.toLocaleString("he-IL")}</small></div>
        </div>
        {average !== null ? <p className="health-insight">{period === "week"
          ? dailyNeededForWeek
            ? `עוד ${dailyNeededForWeek.toLocaleString("he-IL")} צעדים בממוצע בכל יום עד שבת כדי להגיע ליעד השבועי`
            : "הגעת ליעד הצעדים השבועי — כל הכבוד"
          : remaining
            ? `עוד ${remaining.toLocaleString("he-IL")} צעדים ביום להשגת היעד`
            : "עמדת ביעד הצעדים החודשי — כל הכבוד"}</p> : null}
        <HealthConnection metric="steps" />
      </div>
    );
  }

  const byDay = sleepByDay(snapshot.sleep);
  const values = days.map((day) => ({ day, value: byDay.get(day)?.minutes ?? 0, reported: byDay.has(day) }));
  const reported = values.filter((point) => byDay.has(point.day));
  const average = reported.length ? Math.round(reported.reduce((sum, point) => sum + point.value, 0) / reported.length) : 0;
  const nightsMetGoal = reported.filter((point) => point.value >= DEFAULT_SLEEP_GOAL_MINUTES).length;
  const latest = [...reported].at(-1)?.value ?? 0;
  const missing = Math.max(0, DEFAULT_SLEEP_GOAL_MINUTES - average);
  return (
    <div className="health-progress-view">
      {periodPicker}
      <section className="health-summary-card">
        <span className="health-summary-card__icon"><MoonStar aria-hidden="true" size={24} /></span>
        <p>ממוצע שינה {period === "month" ? "בחודש" : "בשבוע"}</p>
        <strong>{average ? formatSleep(average) : "אין נתונים"}</strong>
        <small className="health-summary-card__goal">{average ? `מתוך ${formatSleep(DEFAULT_SLEEP_GOAL_MINUTES)}` : "אין עדיין דגימות בטווח הזה"}</small>
        {reported.length ? <Bars values={values} goal={DEFAULT_SLEEP_GOAL_MINUTES} formatter={formatSleep} monthly={period === "month"} /> : null}
      </section>
      <div className="health-stat-grid">
        <div><Target aria-hidden="true" /><strong>{nightsMetGoal} מתוך {dayCount}</strong><span>לילות ביעד</span></div>
        <div><MoonStar aria-hidden="true" /><strong>{latest ? formatSleep(latest) : "—"}</strong><span>השינה האחרונה</span></div>
      </div>
      {average ? <p className="health-insight">{missing ? `חסרות ${missing} דקות שינה בממוצע להשגת היעד` : `ממוצע השינה שלך עומד ביעד ${period === "month" ? "החודשי" : "השבועי"}`}</p> : null}
      <HealthConnection metric="sleep" />
    </div>
  );
}

const EXPLANATION: Partial<Record<ReturnType<typeof healthCardModel>["status"], string>> = {
  initializing: "האפליקציה מתחברת לנתוני הבריאות במכשיר. זה לוקח רגע אחרי הפתיחה.",
  prompt: "כדי להציג את הנתונים צריך לאשר ל־LIFE FIT לקרוא אותם.",
  denied: "הגישה לנתוני הבריאות לא אושרה. אפשר לאשר אותה באפליקציית Health ← פרופיל ← אפליקציות ← LIFE FIT.",
  "sync-error": "לא הצלחנו לעדכן את הנתונים. הנתונים שמוצגים הם האחרונים שנשמרו.",
  empty: "החיבור פעיל אך עדיין לא נקלטו נתונים. אם אתם בטוחים שיש נתונים, בדקו באפליקציית Health ← פרופיל ← אפליקציות ← LIFE FIT שהקריאה מאושרת.",
  stale: "מוצגים הנתונים האחרונים שנשמרו. הם מתעדכנים כשפותחים את LIFE FIT באייפון.",
  unavailable: "הסנכרון זמין באפליקציית LIFE FIT באייפון דרך Apple Health, או באנדרואיד דרך Health Connect.",
};

// Status, source, last sync and the one action that makes sense now - the
// same model the home card uses, spelled out.
function HealthConnection({ metric }: { metric: HealthMetric }) {
  const { state, controller } = useHealthSync();
  const now = useMinuteClock();
  const card = healthCardModel(state, metric, calendarDay(), now);
  const [settingsFailed, setSettingsFailed] = useState(false);
  const explanation = EXPLANATION[card.status];
  const busy = card.status === "syncing" || card.status === "initializing";
  const button = card.status === "unavailable" || (card.status === "stale" && state.bridge === "absent")
    ? null
    : card.action === "settings"
      ? { label: "פתיחת הגדרות Health", icon: <Settings aria-hidden="true" size={16} />, run: async () => setSettingsFailed(!(await controller?.openSettings())) }
      : { label: busy ? "מסנכרנים…" : card.action === "connect" ? `חיבור ל־${state.platform === "android" ? "Health Connect" : "Apple Health"}` : card.action === "retry" ? "נסו שוב" : "סנכרון עכשיו", icon: <RefreshCw aria-hidden="true" size={16} />, run: async () => { await controller?.sync({ ask: true }); } };
  return (
    <section className="health-connection" data-tone={card.tone} aria-live="polite">
      <p className="health-tile__status" data-tone={card.tone}><i aria-hidden="true" />{card.statusText}</p>
      {card.sourceText ? <p className="health-connection__meta">{card.sourceText}{card.sourceNames.length > 1 ? ` (${card.sourceNames.join(", ")})` : ""}</p> : null}
      {card.syncedText ? <p className="health-connection__meta">{card.syncedText}</p> : null}
      {explanation ? <p className="health-connection__note">{explanation}</p> : null}
      {settingsFailed ? <p className="health-connection__note">לא הצלחנו לפתוח את ההגדרות מכאן. פתחו את אפליקציית Health ← פרופיל ← אפליקציות ← LIFE FIT.</p> : null}
      {button ? <button type="button" className="premium-secondary-button health-sync-button" disabled={busy} onClick={() => void button.run()}>{button.icon}{button.label}</button> : null}
    </section>
  );
}
