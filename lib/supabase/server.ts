import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseConfig } from "./env";
export async function createSupabaseServerClient() { const { url, anonKey } = requireSupabaseConfig(); const store = await cookies(); return createServerClient(url, anonKey, { cookies: { getAll: () => store.getAll(), setAll: (items) => { try { items.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Server Components cannot set response cookies; proxy refreshes them. */ } } } }); }
