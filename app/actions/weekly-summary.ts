"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const uuid = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const lines = (value: FormDataEntryValue | null) => String(value ?? "")
  .split("\n")
  .map((line) => line.trim().replace(/^[-•]\s*/, ""))
  .filter(Boolean);

async function editableSummary(form: FormData) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "coach") throw new Error("not_authorized");
  const summaryId = String(form.get("summaryId") ?? "");
  if (!uuid.test(summaryId)) throw new Error("invalid_summary");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("weekly_summaries")
    .select("id,client_id,approved_at")
    .eq("id", summaryId)
    .maybeSingle();
  if (!data) throw new Error("not_authorized");
  if (data.approved_at) throw new Error("approved_summary_is_immutable");
  const wentWell = lines(form.get("wentWell"));
  const needsWork = lines(form.get("needsWork"));
  const actions = lines(form.get("actions"));
  if ([...wentWell, ...needsWork, ...actions].some((line) => line.length > 500)) throw new Error("invalid_summary_text");
  return { auth, summaryId, clientId: String(data.client_id), wentWell, needsWork, actions };
}

const refresh = (clientId: string) => {
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/coach/clients", "layout");
};

export async function saveWeeklySummaryDraft(form: FormData): Promise<void> {
  const input = await editableSummary(form);
  const { error } = await createSupabaseAdminClient().from("weekly_summaries").update({
    edited_went_well: input.wentWell,
    edited_needs_work: input.needsWork,
    edited_actions: input.actions,
  }).eq("id", input.summaryId).eq("client_id", input.clientId).is("approved_at", null);
  if (error) throw error;
  refresh(input.clientId);
}

export async function approveWeeklySummary(form: FormData): Promise<void> {
  const input = await editableSummary(form);
  const { error } = await createSupabaseAdminClient().from("weekly_summaries").update({
    edited_went_well: input.wentWell,
    edited_needs_work: input.needsWork,
    edited_actions: input.actions,
    approved_at: new Date().toISOString(),
    approved_by: input.auth.id,
  }).eq("id", input.summaryId).eq("client_id", input.clientId).is("approved_at", null);
  if (error) throw error;
  refresh(input.clientId);
}

// Releasing a summary is the coach's call. The RPC re-checks the coach owns this
// client, so the id in the form is never trusted on its own.
export async function sendWeeklySummary(form: FormData): Promise<void> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "coach") throw new Error("not_authorized");
  const summaryId = String(form.get("summaryId") ?? "");
  if (!uuid.test(summaryId)) throw new Error("invalid_summary");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("mark_weekly_summary_sent", { p_summary_id: summaryId });
  if (error) throw error;

  revalidatePath("/coach");
  revalidatePath("/coach/clients", "layout");
}
