"use client";

import { useEffect } from "react";

type WakeLockSentinel = Readonly<{ release: () => Promise<void>; released?: boolean }>;
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> } };

/** Keep the display awake only while an active workout is on screen. */
export function useWorkoutWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const acquire = async () => {
      if (disposed || document.visibilityState !== "visible" || sentinel) return;
      try {
        sentinel = await (navigator as WakeLockNavigator).wakeLock?.request("screen") ?? null;
      } catch {
        // Unsupported browsers and OS-level refusal leave the normal timeout in place.
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        sentinel = null;
        void acquire();
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => undefined);
      sentinel = null;
    };
  }, [active]);
}
