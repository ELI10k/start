import "server-only";

import { createHmac } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Limit = Readonly<{
  action: string;
  subject: string;
  windowSeconds: number;
  limit: number;
}>;

function opaqueSubject(subject: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("rate_limit_not_configured");
  return createHmac("sha256", key).update(subject).digest("hex");
}

/**
 * A shared, atomic limiter. It deliberately fails closed: an unavailable
 * database must never turn a paid endpoint into an unlimited one.
 */
export async function consumeRateLimit(input: Limit): Promise<boolean> {
  if (
    !input.action ||
    !input.subject ||
    input.windowSeconds < 1 ||
    input.windowSeconds > 86_400 ||
    input.limit < 1 ||
    input.limit > 10_000
  ) return false;

  try {
    const { data, error } = await createSupabaseAdminClient().rpc(
      "consume_app_rate_limit",
      {
        p_action: input.action,
        p_subject: opaqueSubject(input.subject),
        p_window_seconds: input.windowSeconds,
        p_limit: input.limit,
      },
    );
    return !error && data === true;
  } catch {
    return false;
  }
}
