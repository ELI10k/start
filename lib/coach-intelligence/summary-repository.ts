import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StoredWeeklySummary = Readonly<{
  id: string;
  clientId: string;
  weekStart: string;
  status: "draft" | "sent" | "insufficient_data";
  provider: string;
  wentWell: readonly string[];
  needsWork: readonly string[];
  actions: readonly string[];
  generatedWentWell: readonly string[];
  generatedNeedsWork: readonly string[];
  generatedActions: readonly string[];
  generatedAt: string;
  sentAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}>;

type Row = Record<string, unknown>;
const list = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

const map = (row: Row): StoredWeeklySummary => ({
  id: String(row.id),
  clientId: String(row.client_id),
  weekStart: String(row.week_start),
  status: (row.status as StoredWeeklySummary["status"]) ?? "draft",
  provider: String(row.provider ?? "rules"),
  wentWell: list(row.edited_went_well ?? row.went_well),
  needsWork: list(row.edited_needs_work ?? row.needs_work),
  actions: list(row.edited_actions ?? row.actions),
  generatedWentWell: list(row.went_well),
  generatedNeedsWork: list(row.needs_work),
  generatedActions: list(row.actions),
  generatedAt: String(row.generated_at ?? ""),
  sentAt: row.sent_at ? String(row.sent_at) : undefined,
  approvedAt: row.approved_at ? String(row.approved_at) : undefined,
  approvedBy: row.approved_by ? String(row.approved_by) : undefined,
});

// RLS decides what comes back: a coach sees their own clients' summaries at
// every stage, a client sees only the ones that were sent to them.
export async function getWeeklySummaries(clientId?: string, limit = 12): Promise<readonly StoredWeeklySummary[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("weekly_summaries").select("*").order("week_start", { ascending: false }).limit(limit);
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((row) => map(row as Row));
}
