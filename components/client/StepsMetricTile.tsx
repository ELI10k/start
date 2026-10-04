"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Footprints } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { describeError } from "@/lib/analytics/events";
import { calendarDay, stepsToPersist, summarizeSteps } from "@/lib/health/calculations";
import { resolveHealthProvider, syncWindow } from "@/lib/health/providers";
import { createHealthRepository, emptyHealthSnapshot, type HealthSnapshot } from "@/lib/health/repository";
import type { HealthPermissionState } from "@/lib/health/types";
import { trainingWeekStart } from "@/lib/workouts/progress";

// A compact dashboard view of the same health data used by the full steps
// experience. Apple Health and Health Connect merge the phone, watch and smart
// ring before this layer reads the daily total, so the tile never adds device
// sources together and double-counts a walk.
export default function StepsMetricTile() {
  const repository = useMemo(() => createHealthRepository(), []);
  const [snapshot, setSnapshot] = useState<HealthSnapshot>(emptyHealthSnapshot);
  const [permission, setPermission] = useState<HealthPermissionState>("unknown");
  const [syncing, setSyncing] = useState(false);
  const syncInFlight = useRef(false);
  const today = calendarDay();

  const load = useCallback(async () => {
    const next = await repository.load(syncWindow(calendarDay()).fromDay);
    setSnapshot(next);
    return next;
  }, [repository]);

  const sync = useCallback(async (askForPermission: boolean) => {
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    setSyncing(true);
    try {
      const provider = resolveHealthProvider();
      const available = await provider.isAvailable();
      if (!available) {
        setPermission("unavailable");
        await load();
        return;
      }

      let state = await provider.getPermission();
      if (askForPermission && state !== "granted") state = await provider.requestPermission();
      setPermission(state);
      const current = await load();
      if (state !== "granted") return;

      const range = syncWindow(today);
      const incoming = await provider.readDailySteps(range.fromDay, range.toDay);
      const changed = stepsToPersist(incoming, current.entries, today);
      if (changed.length) await repository.recordSteps(changed);
      if (changed.length) await load();
      track("health_synced", { source: provider.source, daysWritten: changed.length, daysRead: incoming.length });
    } catch (error) {
      track("error", describeError(error, "health-dashboard-sync"));
    } finally {
      syncInFlight.current = false;
      setSyncing(false);
    }
  }, [load, repository, today]);

  useEffect(() => {
    // NativeBridge loads its native modules asynchronously. The event lets the
    // tile retry as soon as HealthKit/Health Connect is attached instead of
    // permanently deciding that the first browser-like render was unavailable.
    const ready = () => void sync(false);
    window.addEventListener("start:health-ready", ready);
    const initialSync = window.setTimeout(ready, 0);
    return () => {
      window.clearTimeout(initialSync);
      window.removeEventListener("start:health-ready", ready);
    };
  }, [sync]);

  const summary = summarizeSteps(snapshot.entries, snapshot.preferences, today);
  const weekStart = trainingWeekStart(today);
  const weeklySteps = summary.trend
    .filter((point) => point.day >= weekStart && point.day <= today)
    .reduce((total, point) => total + point.steps, 0);
  const weeklyGoal = summary.goal * 7;
  const needsPermission = permission === "prompt" || permission === "unknown";
  const detail = syncing
    ? "מסנכרנים…"
    : needsPermission
      ? "לחצו לחיבור"
      : permission === "denied"
        ? "נדרשת הרשאה"
        : `השבוע ${weeklySteps.toLocaleString("he-IL")} מתוך ${weeklyGoal.toLocaleString("he-IL")}`;

  return (
    <button
      type="button"
      className="metric-tile metric-tile--green metric-tile--button metric-tile--health"
      onClick={() => void sync(true)}
      disabled={syncing || permission === "unavailable"}
      aria-label={`צעדים היום: ${summary.today.toLocaleString("he-IL")} מתוך יעד יומי ${summary.goal.toLocaleString("he-IL")}. ${detail}`}
    >
      <span className="metric-tile__head">
        <span>צעדים</span>
        <span className="metric-tile__icon"><Footprints aria-hidden="true" size={18} /></span>
      </span>
      <strong>{summary.today.toLocaleString("he-IL")} מתוך {summary.goal.toLocaleString("he-IL")}</strong>
      <small>{detail}</small>
    </button>
  );
}
