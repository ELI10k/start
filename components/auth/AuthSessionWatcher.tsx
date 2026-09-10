"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearSnapshotCache } from "@/lib/workouts/snapshot-cache";

export default function AuthSessionWatcher() {
  const router = useRouter();

  useEffect(() => {
    // Configuration problems are surfaced by the login form itself. A global
    // session observer must never replace that useful screen with an error
    // boundary before the user can see it.
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_OUT") {
        // The cached snapshot is one client's training data. Signing out has to
        // take it off the device, or the next person to use the phone could read
        // it straight out of the offline fallback.
        clearSnapshotCache();
        router.replace("/login");
      } else if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
