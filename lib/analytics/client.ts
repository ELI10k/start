"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isOfflineError } from "@/lib/offline/connection";
import { redactProperties, type AnalyticsEvent, type AnalyticsProperties } from "./events";

// Measurement must never be the reason something breaks. Every path here fails
// silently, nothing is awaited by a screen, and a full buffer drops the oldest
// event rather than growing without bound.

export type AnalyticsSink = Readonly<{
  name: string;
  send: (event: AnalyticsEvent, properties: AnalyticsProperties) => Promise<void>;
}>;

export const noopSink: AnalyticsSink = { name: "noop", send: async () => {} };

export const consoleSink: AnalyticsSink = {
  name: "console",
  send: async (event, properties) => { console.debug("analytics", event, properties); },
};

const platform = (): "web" | "ios" | "android" => {
  if (typeof window === "undefined") return "web";
  const native = (window as { StartNative?: { platform?: string } }).StartNative?.platform;
  return native === "ios" || native === "android" ? native : "web";
};

export function createSupabaseSink(): AnalyticsSink {
  return {
    name: "supabase",
    send: async (event, properties) => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      // Anonymous events have nowhere to attach and no value; the insert policy
      // would reject them anyway.
      if (!user) return;
      await supabase.from("analytics_events").insert({
        user_id: user.id,
        event,
        properties,
        platform: platform(),
        app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
      });
    },
  };
}

const MAX_BUFFER = 50;

function createTracker() {
  let sink: AnalyticsSink = noopSink;
  const buffer: { event: AnalyticsEvent; properties: AnalyticsProperties }[] = [];
  let draining = false;

  const drain = async () => {
    if (draining) return;
    draining = true;
    try {
      while (buffer.length) {
        const next = buffer[0];
        try {
          await sink.send(next.event, next.properties);
          buffer.shift();
        } catch (error) {
          // Offline keeps the event for the next attempt; anything else drops it,
          // because retrying a rejected insert forever would never clear.
          if (isOfflineError(error)) return;
          buffer.shift();
        }
      }
    } finally {
      draining = false;
    }
  };

  return {
    configure(next: AnalyticsSink) {
      sink = next;
      void drain();
    },
    track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
      if (buffer.length >= MAX_BUFFER) buffer.shift();
      buffer.push({ event, properties: redactProperties(properties) });
      void drain();
    },
    /** Test seam. */
    pending: () => buffer.length,
  };
}

export const analytics = createTracker();
export const track = (event: AnalyticsEvent, properties?: Record<string, unknown>) => analytics.track(event, properties);
