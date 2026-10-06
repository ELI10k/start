"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MoonStar } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { describeError } from "@/lib/analytics/events";
import { DEFAULT_SLEEP_GOAL_MINUTES, calendarDay, formatSleep, sleepByDay, sleepToPersist } from "@/lib/health/calculations";
import { resolveHealthProvider, syncWindow } from "@/lib/health/providers";
import { createHealthRepository, emptyHealthSnapshot, type HealthSnapshot } from "@/lib/health/repository";
import type { HealthPermissionState } from "@/lib/health/types";

export default function SleepMetricTile() {
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
      if (!(await provider.isAvailable())) {
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
      const incoming = await provider.readDailySleep(range.fromDay, range.toDay);
      const changed = sleepToPersist(incoming, current.sleep, today);
      if (changed.length) await repository.recordSleep(changed);
      if (changed.length) await load();
      track("health_synced", { source: provider.source, metric: "sleep", daysWritten: changed.length, daysRead: incoming.length });
    } catch (error) {
      track("error", describeError(error, "health-sleep-dashboard-sync"));
    } finally {
      syncInFlight.current = false;
      setSyncing(false);
    }
  }, [load, repository, today]);

  useEffect(() => {
    const ready = () => void sync(false);
    const reload = () => void load().catch((error) => track("error", describeError(error, "health-sleep-dashboard-reload")));
    window.addEventListener("start:health-ready", ready);
    window.addEventListener("start:health-sleep-synced", reload);
    const initialSync = window.setTimeout(ready, 0);
    return () => {
      window.clearTimeout(initialSync);
      window.removeEventListener("start:health-ready", ready);
      window.removeEventListener("start:health-sleep-synced", reload);
    };
  }, [load, sync]);

  const sleep = sleepByDay(snapshot.sleep);
  const latest = sleep.get(today) ?? sleep.get([...sleep.keys()].sort().at(-1) ?? "");
  const needsPermission = permission === "prompt" || permission === "unknown";
  const detail = syncing
    ? "מסנכרנים…"
    : needsPermission
      ? "לחצו לחיבור"
      : permission === "denied"
        ? "נדרשת הרשאה"
        : latest?.day === today
          ? "השינה האחרונה"
          : latest
            ? "הנתון האחרון שנקלט"
            : "אין עדיין נתוני שינה";
  const value = formatSleep(latest?.minutes ?? 0);
  const goal = formatSleep(DEFAULT_SLEEP_GOAL_MINUTES);
  const progress = latest ? `${value} מתוך ${goal}` : `יעד ${goal}`;

  return (
    <button
      type="button"
      className="metric-tile metric-tile--neutral metric-tile--button metric-tile--health"
      onClick={() => void sync(true)}
      disabled={syncing || permission === "unavailable"}
      aria-label={`שעות שינה: ${progress}. ${detail}`}
    >
      <span className="metric-tile__head">
        <span>שעות שינה</span>
        <span className="metric-tile__icon"><MoonStar aria-hidden="true" size={18} /></span>
      </span>
      <strong>{progress}</strong>
      <small>{detail}</small>
    </button>
  );
}
