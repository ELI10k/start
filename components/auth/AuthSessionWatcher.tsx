"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthSessionWatcher() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_OUT") {
        window.location.assign("/login");
      } else if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
