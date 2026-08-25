"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

/**
 * The coach's answer to one proposal.
 *
 * Approving may carry a different number than the one proposed - the engine
 * suggests, the coach decides, and a coach who wants 120 grams where the median
 * said 105 should not have to open the editor to say so. The RPC re-checks the
 * coach owns this client, so nothing in this form is trusted on its own.
 */
export async function reviewNutritionProposal(form: FormData): Promise<void> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "coach") throw new Error("not_authorized");

  const id = String(form.get("id") ?? "");
  if (!uuid.test(id)) throw new Error("invalid_proposal");

  const decision = String(form.get("decision") ?? "");
  if (!["approve", "reject", "acknowledge"].includes(decision)) throw new Error("invalid_decision");

  // Blank means "the number as proposed", which is what most approvals are.
  const raw = String(form.get("value") ?? "").trim();
  const value = raw ? Number(raw) : null;
  if (raw && (!Number.isFinite(value) || (value as number) <= 0)) throw new Error("invalid_value");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("review_nutrition_proposal", {
    p_id: id,
    p_decision: decision,
    p_value: value,
    p_note: String(form.get("note") ?? "").trim().slice(0, 500),
  });
  if (error) throw error;

  revalidatePath("/coach/nutrition/proposals");
  revalidatePath("/coach");
  // An approved portion or target changes the menu the client is being served.
  revalidatePath("/coach/menus", "layout");
  revalidatePath("/nutrition");
}
