"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Releasing a summary is the coach's call. The RPC re-checks the coach owns this
// client, so the id in the form is never trusted on its own.
export async function sendWeeklySummary(form: FormData): Promise<void> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "coach") throw new Error("not_authorized");
  const summaryId = String(form.get("summaryId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(summaryId)) throw new Error("invalid_summary");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("mark_weekly_summary_sent", { p_summary_id: summaryId });
  if (error) throw error;

  revalidatePath("/coach");
  revalidatePath("/coach/clients", "layout");
}
