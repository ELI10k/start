"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseConfig } from "./env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  const { url, anonKey } = requireSupabaseConfig();
  browserClient ??= createBrowserClient(url, anonKey);
  return browserClient;
}
