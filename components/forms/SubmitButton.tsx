"use client";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { track } from "@/lib/analytics/client";
import type { AnalyticsEvent } from "@/lib/analytics/events";

export default function SubmitButton({
  idle,
  pending = "שומרים…",
  className = "premium-primary-button",
  icon,
  event,
  eventProperties,
  formAction,
}: {
  idle: string;
  pending?: string;
  className?: string;
  icon?: ReactNode;
  /** Records the intent. Server actions run where the tracker does not, so the
      button that starts them is the honest place to count from. */
  event?: AnalyticsEvent;
  eventProperties?: Record<string, unknown>;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const status = useFormStatus();
  return (
    <button
      disabled={status.pending}
      className={className}
      onClick={event ? () => track(event, eventProperties) : undefined}
      formAction={formAction}
    >
      {status.pending ? null : icon}
      {status.pending ? pending : idle}
    </button>
  );
}
