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

  // One row per thread, folded where the rows are. 202608210005.
  const { data: threadRows, error: threadError } = await supabase.rpc("coach_message_threads");
  if (!threadError)
    return (threadRows ?? []).map((row: {
      client_id: string; last_body: string; last_at: string; unread: number; awaiting_reply: boolean;
    }) => ({
      clientId: row.client_id,
      lastBody: row.last_body,
      lastAt: row.last_at,
      unread: Number(row.unread ?? 0),
      awaitingReply: Boolean(row.awaiting_reply),
    }));
  // Until that migration is applied, fold the recent messages here as before.
  // The ceiling is why the function exists: past 500 messages the oldest threads
  // stop appearing at all, so this is a fallback and not the intended path.
  if (!isMissing(threadError.code)) throw threadError;

  const { data, error } = await supabase
    .from("coach_client_messages")
    .select("client_id,body,created_at,read_at,sender_id")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    if (isMissing(error.code)) return [];
    throw error;
  }
  const threads = new Map<string, { lastBody: string; lastAt: string; unread: number; awaitingReply: boolean }>();
  for (const row of data ?? []) {
    const clientId = row.client_id as string;
    const existing = threads.get(clientId);
    const unread = !row.read_at && row.sender_id !== user.id ? 1 : 0;
    // Rows arrive newest first, so the first one seen for a client is the last
    // message in that thread - and who wrote it is whose turn it is.
    if (!existing)
      threads.set(clientId, {
        lastBody: row.body as string,
        lastAt: row.created_at as string,
        unread,
        awaitingReply: row.sender_id !== user.id,
      });
    else existing.unread += unread;
  }
  return [...threads.entries()]
    .map(([clientId, value]) => ({ clientId, ...value }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/**
 * Marks everything the other side wrote in this thread as read.
 *
 * Deliberately not a server action and deliberately without revalidatePath.
 * Opening a thread *is* reading it, so both message screens mark it while they
 * render - and revalidatePath during a render is not merely discouraged, Next
 * throws on it ("used revalidatePath during render which is unsupported"). The
 * action wrapper that did call it therefore took the screen down on the one
 * visit that matters: the first one after the other side wrote.
 *
 * There is nothing to revalidate here anyway. The page doing the marking is
 * already rendering the fresh thread, and the badge it feeds is read on the next
 * navigation.
 *
 * `clientId` is the coach's side of the call; a client passes null and the
 * database resolves their coach.
 */
export async function markThreadRead(clientId: string | null): Promise<void> {
  const supabase = await createSupabaseServerClient();
  // Opening a thread you cannot read, or before the channel migration has run,
  // is not an error worth showing anyone - and it must never take the thread
  // down, because the thread is the thing the visitor came for.
  await supabase.rpc("mark_message_thread_read", { p_client_id: clientId });
}
