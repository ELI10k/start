"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MessageState = Readonly<{ ok: boolean; message?: string }>;

const TOPICS = new Set(["general", "support", "profile_update"]);

// The database decides who the counterparty is - a client names nobody, a coach
// names only the client - so nothing here has to be trusted with a "from".
const FAILURES: Readonly<Record<string, string>> = {
  empty_message: "אי אפשר לשלוח הודעה ריקה.",
  message_too_long: "ההודעה ארוכה מדי. עד 4000 תווים.",
  no_active_coach: "עדיין לא שויך אליך מאמן, ולכן אין למי לשלוח.",
  not_authorized: "אין הרשאה לשלוח בשיחה הזו.",
  client_required: "יש לבחור לקוח.",
};

function describe(error: { message?: string; code?: string } | null) {
  if (!error) return "ההודעה לא נשלחה. יש לנסות שוב.";
  // The channel is added by a migration that is applied by hand. Until it runs,
  // say so plainly instead of showing a Postgres error to a client.
  if (error.code === "42P01" || error.code === "PGRST202" || error.code === "PGRST205")
    return "ערוץ ההודעות עדיין לא הופעל בחשבון. יש לפנות למאמן.";
  const key = Object.keys(FAILURES).find((name) => error.message?.includes(name));
  return key ? FAILURES[key] : "ההודעה לא נשלחה. יש לנסות שוב.";
}

function paths(clientId: string) {
  revalidatePath("/messages");
  revalidatePath("/notifications");
  revalidatePath("/coach");
  if (clientId) revalidatePath(`/coach/clients/${clientId}`);
}

export async function sendMessage(_state: MessageState, form: FormData): Promise<MessageState> {
  const auth = await getAuthContext();
  if (!auth) return { ok: false, message: "יש להתחבר מחדש." };

  const body = String(form.get("body") ?? "").trim();
  if (!body) return { ok: false, message: FAILURES.empty_message };
  if (body.length > 4000) return { ok: false, message: FAILURES.message_too_long };

  const topic = String(form.get("topic") ?? "general");
  if (!TOPICS.has(topic)) return { ok: false, message: "נושא לא מוכר." };

  // A coach must name the client; a client never does, and a client-supplied
  // value here is ignored rather than trusted.
  const clientId = auth.role === "coach" ? String(form.get("clientId") ?? "") : auth.id;
  if (auth.role === "coach" && !/^[0-9a-f-]{36}$/i.test(clientId))
    return { ok: false, message: FAILURES.client_required };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("send_coach_client_message", {
    p_body: body,
    p_topic: topic,
    p_client_id: auth.role === "coach" ? clientId : null,
  });
  if (error) return { ok: false, message: describe(error) };

  paths(clientId);
  return { ok: true, message: "ההודעה נשלחה." };
}

export async function markThreadRead(form: FormData): Promise<void> {
  const auth = await getAuthContext();
  if (!auth) return;
  const clientId = auth.role === "coach" ? String(form.get("clientId") ?? "") : auth.id;
  if (auth.role === "coach" && !/^[0-9a-f-]{36}$/i.test(clientId)) return;
  const supabase = await createSupabaseServerClient();
  // Opening a thread you cannot read is not an error worth showing anyone.
  await supabase.rpc("mark_message_thread_read", {
    p_client_id: auth.role === "coach" ? clientId : null,
  });
  paths(clientId);
}
