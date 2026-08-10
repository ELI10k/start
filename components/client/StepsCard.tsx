"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Footprints, RefreshCw } from "lucide-react";
import { formatIsraelDateTime } from "@/lib/date-time";
import { calendarDay, SOURCE_LABELS, stepsToPersist, summarizeSteps } from "@/lib/health/calculations";
import { describeAvailability, resolveHealthProvider, syncWindow } from "@/lib/health/providers";
import { createHealthRepository, emptyHealthSnapshot, type HealthSnapshot } from "@/lib/health/repository";
import { track } from "@/lib/analytics/client";
import { describeError } from "@/lib/analytics/events";
import type { HealthPermissionState } from "@/lib/health/types";

// Steps are read from the phone's health store and stored per day, so the card
// has something to show whether or not the store is reachable right now. Each
// state says what is true: no health store on this device, permission not asked,
// permission refused, or a real figure.
export default function StepsCard() {
  const provider = useMemo(() => resolveHealthProvider(), []);
  const repository = useMemo(() => createHealthRepository(), []);
  const [snapshot, setSnapshot] = useState<HealthSnapshot>(emptyHealthSnapshot);
  const [permission, setPermission] = useState<HealthPermissionState>("unknown");
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const today = calendarDay();
  const window7 = syncWindow(today);

  const load = useCallback(async () => {
    try {
      setSnapshot(await repository.load(syncWindow(calendarDay()).fromDay));
      setError("");
    } catch {
      setError("לא הצלחנו לטעון את נתוני הצעדים.");
    }
  }, [repository]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const available = await provider.isAvailable();
      const state = available ? await provider.getPermission() : "unavailable";
      if (active) setPermission(state);
      await load();
    })();
    return () => { active = false; };
  }, [load, provider]);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setError("");
    try {
      const granted = permission === "granted" ? permission : await provider.requestPermission();
      setPermission(granted);
      if (granted !== "granted") return;
      const incoming = await provider.readDailySteps(window7.fromDay, window7.toDay);
      // Only days whose figure actually changed are written, so a repeated sync
      // is a no-op rather than a pile of identical rows.
      const changed = stepsToPersist(incoming, snapshot.entries, today);
      if (changed.length) await repository.recordSteps(changed);
      await load();
      // How many days moved and from which store - never the step counts.
      track("health_synced", { source: provider.source, daysWritten: changed.length, daysRead: incoming.length });
    } catch (error) {
      track("error", describeError(error, "health-sync"));
      setError("הסנכרון נכשל. אפשר לנסות שוב.");
    } finally {
      setSyncing(false);
    }
  }, [load, permission, provider, repository, snapshot.entries, syncing, today, window7.fromDay, window7.toDay]);

  const summary = summarizeSteps(snapshot.entries, snapshot.preferences, today);
  const availability = describeAvailability(provider.source, permission);
  const max = Math.max(summary.goal, ...summary.trend.map((point) => point.steps), 1);

  return (
    <section className="premium-card" aria-labelledby="steps-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#16A34A]">צעדים</p>
          <h2 id="steps-card" className="mt-1 text-2xl font-black">{summary.today.toLocaleString("he-IL")}</h2>
          <p className="mt-1 text-sm text-[#5B5F5B]">מתוך יעד {summary.goal.toLocaleString("he-IL")} · {summary.percentOfGoal}%</p>
        </div>
        {permission !== "unavailable" && (
          <button type="button" onClick={sync} disabled={syncing} className="chip shrink-0">
            <RefreshCw aria-hidden="true" size={15} />
            {syncing ? "מסנכרנים…" : permission === "granted" ? "סנכרון" : "אישור וסנכרון"}
          </button>
        )}
      </div>

      <div className="premium-progress mt-3">
        <div className="premium-progress__track" role="progressbar" aria-label="אחוז מהיעד היומי" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, summary.percentOfGoal)}>
          <span style={{ width: `${Math.min(100, summary.percentOfGoal)}%` }} />
        </div>
      </div>

      {/* Seven bars, oldest to newest. A day with no report is a flat bar, not a
          zero - the label says which. */}
      <ol className="mt-4 flex items-end justify-between gap-1" aria-label="מגמת שבעה ימים">
        {summary.trend.map((point) => (
          <li key={point.day} className="flex flex-1 flex-col items-center gap-1">
            <span
              aria-hidden="true"
              className={`w-full rounded-t ${point.metGoal ? "bg-[#16A34A]" : "bg-[#E5E7E5]"}`}
              style={{ height: `${Math.max(4, Math.round((point.steps / max) * 56))}px` }}
            />
            <span className="text-[10px] text-[#5B5F5B]">{new Date(`${point.day}T00:00:00`).toLocaleDateString("he-IL", { weekday: "narrow", timeZone: "Asia/Jerusalem" })}</span>
            <span className="sr-only">{point.day}: {point.steps.toLocaleString("he-IL")} צעדים</span>
          </li>
        ))}
      </ol>

      <dl className="dashboard-metrics mt-4">
        <div className="metric-tile"><dt className="metric-tile__head"><span>ממוצע שבועי</span></dt><dd><strong>{summary.weeklyAverage.toLocaleString("he-IL")}</strong></dd></div>
        <div className="metric-tile"><dt className="metric-tile__head"><span>ימים ביעד</span></dt><dd><strong>{summary.daysMetGoal}/7</strong></dd></div>
        <div className="metric-tile"><dt className="metric-tile__head"><span>סנכרון אחרון</span></dt><dd><strong>{summary.lastSyncAt ? formatIsraelDateTime(summary.lastSyncAt) : "—"}</strong></dd></div>
      </dl>

      {summary.lastSyncSource && <p className="mt-2 text-xs text-[#5B5F5B]">מקור: {SOURCE_LABELS[summary.lastSyncSource]}</p>}

      {/* Nothing here guesses. If the platform cannot serve steps, or the client
          refused, the card says which rather than showing an empty chart. */}
      {availability.reason && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-dashed border-[#E5E7E5] p-3 text-xs text-[#5B5F5B]">
          <Footprints aria-hidden="true" size={15} className="mt-0.5 shrink-0" />
          {availability.reason}
        </p>
      )}
      {!summary.hasData && permission === "granted" && (
        <p className="mt-3 rounded-2xl border border-dashed border-[#E5E7E5] p-3 text-xs text-[#5B5F5B]">עדיין לא התקבלו נתוני צעדים לשבוע האחרון.</p>
      )}
      {error && <p role="alert" className="mt-3 rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-3 text-sm text-[#DC2626]">{error}</p>}
    </section>
  );
}
