import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prioritiseCoachAttention, type PersistedRiskSignal } from "./proactive-coach";

type Row = Readonly<Record<string, unknown>>;

export async function getCoachAttention(coachId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("habit_analysis_reports").select("client_id,risk_score,retention_risk,client_health_score,week_end,profiles!habit_analysis_reports_client_id_fkey(full_name)").eq("coach_id", coachId).order("week_end", { ascending: false }).limit(100);
  if (error) return [];
  const signals: PersistedRiskSignal[] = (data ?? []).map((value) => {
    const row = value as Row;
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const clientName = profile && typeof profile === "object" && "full_name" in profile ? String(profile.full_name ?? "לקוח") : "לקוח";
    return { clientId: String(row.client_id), clientName, weekEnd: String(row.week_end), risk: Number(row.risk_score ?? 0), retentionRisk: Number(row.retention_risk ?? 0), health: Number(row.client_health_score ?? 0) };
  });
  return prioritiseCoachAttention(signals);
}
