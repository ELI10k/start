"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearSnapshotCache } from "@/lib/workouts/snapshot-cache";

export default function AuthSessionWatcher() {
  const router = useRouter();

  useEffect(() => {
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      // Public pages can be deployed without the authenticated app's Supabase
      // environment. The session watcher is optional there and must not crash
      // hydration after the page has already rendered successfully.
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
        window.location.assign("/login");
      } else if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
