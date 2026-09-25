"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearSnapshotCache } from "@/lib/workouts/snapshot-cache";
import { getSupabaseConfig } from "@/lib/supabase/env";

export default function AuthSessionWatcher() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Public and error screens must still render when deployment configuration
    // is incomplete. The server-side guards already refuse private data; this
    // watcher is an enhancement for an existing authenticated session, not a
    // reason to crash the whole React tree.
    if (!getSupabaseConfig()) return;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

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
  }, [pathname, router]);

  return null;
}
