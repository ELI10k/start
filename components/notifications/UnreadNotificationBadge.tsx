"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLiveRows } from "@/lib/supabase/use-live-rows";

/**
 * How many unread notifications there are, asked for by the browser.
 *
 * It used to be counted in `ClientShell`, which made every client screen await
 * one extra Supabase round trip before it could render anything - the shell is
 * on top of home, nutrition, workouts, progress, content and profile alike. The
 * count is now fetched beside the page instead of in front of it.
 *
 * The cost of moving it is that `revalidatePath` no longer reaches it: marking
 * a notification read re-renders the server tree, and a client component that
 * fetched once on mount would keep showing the old figure until a hard reload.
 * So it is re-asked on every navigation - which is exactly when the server
 * version used to change - and when the tab is looked at again after being
 * left, which is when a notification is most likely to have arrived.
 */
export default function UnreadNotificationBadge({ className = "bottom-app-nav__badge" }: { className?: string }) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  // A notification written while the client is looking at the screen. Refreshing
  // the server tree also re-runs this component's effect, which is what actually
  // moves the number.
  useLiveRows("notifications", { event: "*" });

  useEffect(() => {
    const controller = new AbortController();
    const read = () => {
      void fetch("/api/notifications/unread", { cache: "no-store", signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { count: 0 }))
        .then((payload: { count?: number }) => setCount(Math.max(0, Number(payload.count) || 0)))
        .catch(() => undefined);
    };
    read();
    const onVisible = () => { if (document.visibilityState === "visible") read(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { controller.abort(); document.removeEventListener("visibilitychange", onVisible); };
  }, [pathname]);

  if (!count) return null;
  return (
    <span className={className} aria-label={`${count} עדכונים שלא נקראו`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
