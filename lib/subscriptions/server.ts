import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseSubscriptionAccess, subscriptionAccessForPlan, type SubscriptionAccess } from "@/lib/subscriptions/access";

const migrationMissing = (error: { code?: string }) => error.code === "PGRST202" || error.code === "42P01" || error.code === "42883";

/** Reads through the authorization-aware RPC; callers never select billing rows directly. */
export async function getSubscriptionAccess(userId?: string): Promise<SubscriptionAccess> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("subscription_access", userId ? { p_user_id: userId } : {});
  if (error) {
    if (!migrationMissing(error)) throw error;
    // Preview may run the application before the additive migration is applied.
    // Preserve the service level that existed before subscriptions: an active
    // coach relationship means Coach, otherwise the client remains Digital.
    const targetId = userId ?? (await supabase.auth.getUser()).data.user?.id;
    if (!targetId) return parseSubscriptionAccess(null);
    const { data: relationship, error: relationshipError } = await supabase
      .from("coach_client_relationships")
      .select("coach_id")
      .eq("client_id", targetId)
      .eq("status", "active")
      .limit(1);
    if (relationshipError) throw relationshipError;
    return subscriptionAccessForPlan(relationship?.length ? "coach" : "digital");
  }
  return parseSubscriptionAccess(data);
}

/** Batch view for coach screens. The RPC still verifies every coach/client relationship. */
export async function getClientSubscriptionAccesses(userIds: readonly string[]): Promise<ReadonlyMap<string, SubscriptionAccess>> {
  const entries = await Promise.all(userIds.map(async (userId) => [userId, await getSubscriptionAccess(userId)] as const));
  return new Map(entries);
}
