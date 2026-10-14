"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { clampGoal } from "./calculations";
import { normalizeSourceDetails } from "./sources";
import { emptyHealthSnapshot, type HealthMetric, type HealthSnapshot } from "./sync-controller";
import type { DailySleep, DailySteps, HealthSource } from "./types";

export { emptyHealthSnapshot, type HealthSnapshot };

type Row = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" ? value : "");

// `source_details` arrived after the tables did (20261014120000). Until that
// migration is applied, asking for the column fails the whole select - and
// the figures must not depend on the writer's name. So a missing column is
// remembered once and the read falls back to the original columns.
const MISSING_COLUMN = new Set(["42703", "PGRST204"]);
let detailsColumn: boolean | undefined;
const missingColumn = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (MISSING_COLUMN.has(error.code ?? "") || /source_details/.test(error.message ?? "")));

export function createHealthRepository() {
  const supabase = createSupabaseBrowserClient();

  const select = async (table: "health_steps" | "health_sleep", value: "steps" | "minutes", fromDay: string) => {
    if (detailsColumn !== false) {
      const result = await supabase.from(table).select(`day,${value},source,recorded_at,source_details`).gte("day", fromDay).order("day");
      if (!missingColumn(result.error)) {
        if (!result.error) detailsColumn = true;
        return result;
      }
      detailsColumn = false;
    }
    return supabase.from(table).select(`day,${value},source,recorded_at`).gte("day", fromDay).order("day");
  };

  return {
    load: async (fromDay: string): Promise<HealthSnapshot> => {
      const [steps, sleep, preferences] = await Promise.all([
        select("health_steps", "steps", fromDay),
        select("health_sleep", "minutes", fromDay),
        supabase.from("health_preferences").select("daily_step_goal,last_sync_at,last_sync_source").maybeSingle(),
      ]);
      if (steps.error) throw steps.error;
      if (sleep.error) throw sleep.error;
      // A client with no preferences row yet is normal, not an error.
      if (preferences.error && preferences.error.code !== "PGRST116") throw preferences.error;
      const row = (preferences.data ?? undefined) as Row | undefined;
      return {
        entries: ((steps.data ?? []) as unknown as Row[]).map((entry) => ({
          day: text(entry.day),
          steps: Number(entry.steps) || 0,
          source: text(entry.source) as HealthSource,
          recordedAt: text(entry.recorded_at),
          details: normalizeSourceDetails(entry.source_details),
        })),
        sleep: ((sleep.data ?? []) as unknown as Row[]).map((entry) => ({
          day: text(entry.day),
          minutes: Number(entry.minutes) || 0,
          source: text(entry.source) as HealthSource,
          recordedAt: text(entry.recorded_at),
          details: normalizeSourceDetails(entry.source_details),
        })),
        preferences: {
          dailyStepGoal: clampGoal(row ? Number(row.daily_step_goal) : undefined),
          lastSyncAt: row?.last_sync_at ? text(row.last_sync_at) : undefined,
          lastSyncSource: row?.last_sync_source ? (text(row.last_sync_source) as HealthSource) : undefined,
        },
      };
    },
    // One call per changed day. The RPC upserts, so a repeated sync of the same
    // day overwrites rather than accumulating.
    recordSteps: async (entries: readonly DailySteps[]) => {
      for (const entry of entries) {
        const { error } = await supabase.rpc("record_health_steps", {
          p_day: entry.day,
          p_steps: entry.steps,
          p_source: entry.source,
          p_recorded_at: entry.recordedAt,
        });
        if (error) throw error;
      }
    },
    recordSleep: async (entries: readonly DailySleep[]) => {
      for (const entry of entries) {
        const { error } = await supabase.rpc("record_health_sleep", {
          p_day: entry.day,
          p_minutes: entry.minutes,
          p_source: entry.source,
          p_recorded_at: entry.recordedAt,
        });
        if (error) throw error;
      }
    },
    // Runs after the figure is saved, against the row the RPC just wrote. RLS
    // already limits an update to the client's own rows.
    recordDetails: async (metric: HealthMetric, entries: readonly (DailySteps | DailySleep)[]) => {
      if (detailsColumn === false) return;
      const table = metric === "steps" ? "health_steps" : "health_sleep";
      for (const entry of entries) {
        if (!entry.details) continue;
        const { error } = await supabase.from(table).update({ source_details: entry.details }).eq("day", entry.day).eq("source", entry.source);
        if (missingColumn(error)) { detailsColumn = false; return; }
        if (error) throw error;
      }
    },
    setGoal: async (goal: number) => {
      const { error } = await supabase.rpc("set_daily_step_goal", { p_goal: clampGoal(goal) });
      if (error) throw error;
    },
  };
}
