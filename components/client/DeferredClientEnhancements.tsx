"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const AnalyticsProvider = dynamic(() => import("@/components/client/AnalyticsProvider"), {
  ssr: false,
});
const PushRegistration = dynamic(() => import("@/components/client/PushRegistration"), {
  ssr: false,
});

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Non-visual services should not compete with the first interactive frame.
 * They still start shortly after hydration (or within two seconds on a busy
 * device), but their Supabase and push code stays off the critical path.
 */
export default function DeferredClientEnhancements() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(() => setReady(true), { timeout: 2_000 });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }
    const handle = window.setTimeout(() => setReady(true), 1);
    return () => window.clearTimeout(handle);
  }, []);

  if (!ready) return null;
  return (
    <>
      <PushRegistration />
      <AnalyticsProvider />
    </>
  );
}
