"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "./client";

/**
 * Re-render the server tree when a row this screen is built from changes.
 *
 * Every screen in START is server-rendered per request: the thread, the bell,
 * the day's meals. Holding a second copy of any of it in the browser is how two
 * places end up disagreeing about the same number, so nothing here builds one.
 * A change arrives, `router.refresh()` asks the server for the screen again, and
 * the answer is produced by the same code path a reload would have used.
 *
 * The subscription re-checks row-level security against the signed-in user, so
 * the events reaching a browser are for rows it could already have read.
 *
 * Realtime is not a requirement. Where the publication has not been extended,
 * or the socket cannot be opened, the channel simply never fires and the screen
 * behaves exactly as it did - correct on arrival, and stale after that.
 */

// A channel is identified by its name, and asking for a name that already
// exists returns the existing channel - which, once subscribed, refuses new
// callbacks and throws. React runs an effect twice in development and remounts
// components in ordinary use, and `removeChannel` does not finish before the
// next effect starts, so a fixed name is a crash on the second mount. It was:
// the client's home screen rendered "לא הצלחנו לטעון את המסך".
let channelSequence = 0;

export function useLiveRows(
  table: string,
  options: Readonly<{ filter?: string; event?: "INSERT" | "UPDATE" | "*"; enabled?: boolean }> = {},
) {
  const router = useRouter();
  const { filter, event = "INSERT", enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    // Live updates are a convenience. Nothing in this file may be the reason a
    // screen fails to render, so the whole subscription is guarded - including
    // the parts of it that are somebody else's library.
    try {
      const supabase = createSupabaseBrowserClient();
      channelSequence += 1;
      const channel = supabase
        .channel(`live:${table}:${filter ?? "all"}:${channelSequence}`)
        .on(
          // The realtime types want the event name as a literal; it is a
          // parameter here so one hook serves every screen that needs a live row.
          "postgres_changes" as never,
          { event, schema: "public", table, ...(filter ? { filter } : {}) } as never,
          () => router.refresh(),
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel).catch(() => undefined);
      };
    } catch (cause) {
      console.error("live rows unavailable", { table, message: cause instanceof Error ? cause.message : "unknown" });
      return;
    }
  }, [table, filter, event, enabled, router]);
}
