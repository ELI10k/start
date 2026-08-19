import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { CoachThread, DirectMessage } from "@/lib/messages/types";

export type { CoachThread, DirectMessage } from "@/lib/messages/types";
export { TOPIC_LABELS } from "@/lib/messages/types";

// The migration that creates coach_client_messages is applied by hand, like the
// two before it. Until it runs the relation does not exist, and a missing
// relation must not take a screen down - the thread simply reads as empty, which
// is exactly how the product behaved before this feature. Anything else is a
// real fault and is rethrown.
const MISSING_RELATION = new Set(["42P01", "PGRST202", "PGRST205"]);

const isMissing = (code: string | undefined) => MISSING_RELATION.has(code ?? "");

/** One client's thread, oldest first - a conversation is read downwards. */
export async function listThread(clientId: string): Promise<readonly DirectMessage[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("coach_client_messages")
    .select("id,body,topic,created_at,read_at,sender_id")
    .eq("client_id", clientId)
    .order("created_at");
  if (error) {
    if (isMissing(error.code)) return [];
    throw error;
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    body: row.body as string,
    topic: row.topic as DirectMessage["topic"],
    createdAt: row.created_at as string,
    readAt: (row.read_at as string | null) ?? null,
    fromMe: row.sender_id === user.id,
  }));
}

/** The badge figure. Counts only what the other side wrote. */
export async function getUnreadMessageCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data, error } = await supabase.rpc("unread_message_count");
  if (error) {
    if (isMissing(error.code)) return 0;
    throw error;
  }
  return Number(data ?? 0);
}

/**
 * Every thread this coach holds, newest activity first.
 *
 * Read in one query rather than one per client: a coach with thirty clients on
 * the inbox screen would otherwise make thirty round trips to render a list.
 */
export async function listCoachThreads(): Promise<readonly CoachThread[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("coach_client_messages")
    .select("client_id,body,created_at,read_at,sender_id")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    if (isMissing(error.code)) return [];
    throw error;
  }
  const threads = new Map<string, { lastBody: string; lastAt: string; unread: number }>();
  for (const row of data ?? []) {
    const clientId = row.client_id as string;
    const existing = threads.get(clientId);
    const unread = !row.read_at && row.sender_id !== user.id ? 1 : 0;
    // Rows arrive newest first, so the first one seen for a client is the last
    // message in that thread.
    if (!existing) threads.set(clientId, { lastBody: row.body as string, lastAt: row.created_at as string, unread });
    else existing.unread += unread;
  }
  return [...threads.entries()].map(([clientId, value]) => ({ clientId, ...value }));
}
