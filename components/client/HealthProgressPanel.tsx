"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Footprints, MoonStar, RefreshCw, Target } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { describeError } from "@/lib/analytics/events";
import { DEFAULT_SLEEP_GOAL_MINUTES, averageCompletedSteps, calendarDay, formatSleep, lastDays, sleepByDay, sleepToPersist, stepsByDay, stepsToPersist, summarizeSteps } from "@/lib/health/calculations";
import { resolveHealthProvider, syncWindow } from "@/lib/health/providers";
import { createHealthRepository, emptyHealthSnapshot, type HealthSnapshot } from "@/lib/health/repository";
import type { HealthPermissionState } from "@/lib/health/types";

const DAY_LABEL = new Intl.DateTimeFormat("he-IL", { weekday: "narrow", timeZone: "UTC" });
const dayLabel = (day: string) => DAY_LABEL.format(new Date(`${day}T12:00:00Z`));
const dateLabel = (day: string) => new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

function Bars({ values, goal, formatter, monthly = false }: { values: readonly { day: string; value: number }[]; goal: number; formatter: (value: number) => string; monthly?: boolean }) {
  const max = Math.max(goal, ...values.map((point) => point.value), 1);
  return (
    <div className="health-chart" data-monthly={monthly || undefined} role="img" aria-label={values.map((point) => `${monthly ? dateLabel(point.day) : dayLabel(point.day)} ${formatter(point.value)}`).join(", ")}>
      <div className="health-chart__plot" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(${monthly ? "2.75rem" : "0"}, 1fr))` }}>
        <span className="health-chart__goal" style={{ insetBlockEnd: `${Math.min(92, (goal / max) * 100)}%` }}><small>יעד</small></span>
        {values.map((point) => (
          <span className="health-chart__column" key={point.day}>
            <b>{point.value ? formatter(point.value) : "0"}</b>
            <i style={{ height: `${Math.max(point.value ? 7 : 1, (point.value / max) * 100)}%` }} />
            <small>{monthly ? dateLabel(point.day) : dayLabel(point.day)}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function HealthProgressPanel({ metric }: { metric: "steps" | "sleep" }) {
  const repository = useMemo(() => createHealthRepository(), []);
  const [snapshot, setSnapshot] = useState<HealthSnapshot>(emptyHealthSnapshot);
  const [permission, setPermission] = useState<HealthPermissionState>("unknown");
  const [syncing, setSyncing] = useState(false);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const inFlight = useRef(false);
  const today = calendarDay();

  const load = useCallback(async () => {
    const next = await repository.load(syncWindow(calendarDay()).fromDay);
    setSnapshot(next);
    return next;
  }, [repository]);

  const sync = useCallback(async (ask: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSyncing(true);
    try {
      const provider = resolveHealthProvider();
      if (!(await provider.isAvailable())) {
        setPermission("unavailable");
        await load();
        return;
      }
      let state = await provider.getPermission();
      if (ask && state !== "granted") state = await provider.requestPermission();
      setPermission(state);
      const current = await load();
      if (state !== "granted") return;
      const range = syncWindow(today);
      const [incomingSteps, incomingSleep] = await Promise.all([
        provider.readDailySteps(range.fromDay, range.toDay),
        provider.readDailySleep(range.fromDay, range.toDay),
      ]);
      const changedSteps = stepsToPersist(incomingSteps, current.entries, today);
      const changedSleep = sleepToPersist(incomingSleep, current.sleep, today);
      await Promise.all([repository.recordSteps(changedSteps), repository.recordSleep(changedSleep)]);
      if (changedSteps.length || changedSleep.length) await load();
      track("health_synced", { source: provider.source, metric, daysWritten: changedSteps.length + changedSleep.length });
    } catch (error) {
      track("error", describeError(error, "health-progress-sync"));
    } finally {
      inFlight.current = false;
      setSyncing(false);
    }
  }, [load, metric, repository, today]);

  useEffect(() => {
    const ready = () => void sync(false);
    window.addEventListener("start:health-ready", ready);
    const initial = window.setTimeout(ready, 0);
    return () => { window.clearTimeout(initial); window.removeEventListener("start:health-ready", ready); };
  }, [sync]);

  const connect = permission === "unknown" || permission === "prompt" || permission === "denied";
  const unavailable = permission === "unavailable";
  const dayCount = period === "month" ? 30 : 7;
  const days = lastDays(today, dayCount);
  const periodPicker = <div className="health-period-picker" role="group" aria-label="טווח הצגה"><button type="button" aria-pressed={period === "week"} onClick={() => setPeriod("week")}>שבוע</button><button type="button" aria-pressed={period === "month"} onClick={() => setPeriod("month")}>חודש</button></div>;

  if (metric === "steps") {
    const summary = summarizeSteps(snapshot.entries, snapshot.preferences, today);
    const stepByDay = stepsByDay(snapshot.entries);
    const values = days.map((day) => ({ day, value: stepByDay.get(day)?.steps ?? 0 }));
    const average = averageCompletedSteps(snapshot.entries, days, today);
    const total = values.reduce((sum, point) => sum + point.value, 0);
    const daysMetGoal = values.filter((point) => point.value >= summary.goal).length;
    const remaining = Math.max(0, summary.goal - (average ?? 0));
    return (
      <div className="health-progress-view">
        {periodPicker}
        <section className="health-summary-card">
          <span className="health-summary-card__icon"><Footprints aria-hidden="true" size={24} /></span>
          <p>ממוצע יומי {period === "month" ? "בחודש" : "בשבוע"}</p>
          <strong>{average !== null ? average.toLocaleString("he-IL") : "אין נתונים"}</strong>
          <small>{average !== null ? `מתוך יעד של ${summary.goal.toLocaleString("he-IL")}` : "חברו את נתוני הבריאות כדי להתחיל"}</small>
          <Bars values={values} goal={summary.goal} formatter={(value) => value.toLocaleString("he-IL")} monthly={period === "month"} />
        </section>
        <div className="health-stat-grid">
          <div><Target aria-hidden="true" /><strong>{daysMetGoal} מתוך {dayCount}</strong><span>ימים ביעד</span></div>
          <div><Footprints aria-hidden="true" /><strong>{total.toLocaleString("he-IL")}</strong><span>צעדים {period === "month" ? "בחודש" : "בשבוע"}</span></div>
        </div>
        {average !== null ? <p className="health-insight">{remaining ? `עוד ${remaining.toLocaleString("he-IL")} צעדים ביום להשגת היעד` : `עמדת ביעד הצעדים ${period === "month" ? "החודשי" : "השבועי"} — כל הכבוד`}</p> : null}
        <SyncButton connect={connect} unavailable={unavailable} syncing={syncing} onClick={() => void sync(true)} />
      </div>
    );
  }

  const byDay = sleepByDay(snapshot.sleep);
  const values = days.map((day) => ({ day, value: byDay.get(day)?.minutes ?? 0 }));
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
        <small>{average ? `מתוך יעד של ${formatSleep(DEFAULT_SLEEP_GOAL_MINUTES)}` : "חברו את נתוני הבריאות כדי להתחיל"}</small>
        <Bars values={values} goal={DEFAULT_SLEEP_GOAL_MINUTES} formatter={formatSleep} monthly={period === "month"} />
      </section>
      <div className="health-stat-grid">
        <div><Target aria-hidden="true" /><strong>{nightsMetGoal} מתוך {dayCount}</strong><span>לילות ביעד</span></div>
        <div><MoonStar aria-hidden="true" /><strong>{latest ? formatSleep(latest) : "—"}</strong><span>השינה האחרונה</span></div>
      </div>
      {average ? <p className="health-insight">{missing ? `חסרות ${missing} דקות שינה בממוצע להשגת היעד` : `ממוצע השינה שלך עומד ביעד ${period === "month" ? "החודשי" : "השבועי"}`}</p> : null}
      <SyncButton connect={connect} unavailable={unavailable} syncing={syncing} onClick={() => void sync(true)} />
    </div>
  );
}

function SyncButton({ connect, unavailable, syncing, onClick }: { connect: boolean; unavailable: boolean; syncing: boolean; onClick: () => void }) {
  if (unavailable) return <p className="health-sync-note">הסנכרון זמין באפליקציה במכשיר דרך Apple Health או Health Connect.</p>;
  return <button type="button" className="premium-secondary-button health-sync-button" disabled={syncing} onClick={onClick}><RefreshCw aria-hidden="true" size={16} />{syncing ? "מסנכרנים…" : connect ? "חיבור נתוני בריאות" : "סנכרון נתונים"}</button>;
}
