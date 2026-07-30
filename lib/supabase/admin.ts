import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "./env";

export function createSupabaseAdminClient() {
  const { url } = requireSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) throw new Error("supabase_admin_not_configured");
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
