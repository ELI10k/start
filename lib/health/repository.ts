"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { clampGoal } from "./calculations";
import type { DailySteps, HealthPreferences, HealthSource } from "./types";

type Row = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" ? value : "");

export type HealthSnapshot = Readonly<{ entries: readonly DailySteps[]; preferences: HealthPreferences }>;
export const emptyHealthSnapshot: HealthSnapshot = { entries: [], preferences: { dailyStepGoal: 10000 } };

export function createHealthRepository() {
  const supabase = createSupabaseBrowserClient();
  return {
    load: async (fromDay: string): Promise<HealthSnapshot> => {
      const [steps, preferences] = await Promise.all([
        supabase.from("health_steps").select("day,steps,source,recorded_at").gte("day", fromDay).order("day"),
        supabase.from("health_preferences").select("daily_step_goal,last_sync_at,last_sync_source").maybeSingle(),
      ]);
      if (steps.error) throw steps.error;
      // A client with no preferences row yet is normal, not an error.
      if (preferences.error && preferences.error.code !== "PGRST116") throw preferences.error;
      const row = (preferences.data ?? undefined) as Row | undefined;
      return {
        entries: ((steps.data ?? []) as Row[]).map((entry) => ({
          day: text(entry.day),
          steps: Number(entry.steps) || 0,
          source: text(entry.source) as HealthSource,
          recordedAt: text(entry.recorded_at),
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
    setGoal: async (goal: number) => {
      const { error } = await supabase.rpc("set_daily_step_goal", { p_goal: clampGoal(goal) });
      if (error) throw error;
    },
  };
}
