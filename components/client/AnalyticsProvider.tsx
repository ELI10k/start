"use client";
import { useEffect } from "react";
import { analytics, createSupabaseSink, track } from "@/lib/analytics/client";
import { describeError } from "@/lib/analytics/events";

// Points the tracker at Supabase and catches what escapes React: an unhandled
// rejection or a window error is the only signal a crash leaves behind on the
// web, and both carry a message that can quote user input - so only the shape
// of the failure is recorded.
export default function AnalyticsProvider() {
  useEffect(() => {
    analytics.configure(createSupabaseSink());

    const onError = (event: ErrorEvent) => track("crash", describeError(event.error, "window"));
    const onRejection = (event: PromiseRejectionEvent) => track("crash", describeError(event.reason, "unhandled-rejection"));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
