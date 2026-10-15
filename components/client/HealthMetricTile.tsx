"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { calendarDay } from "@/lib/health/calculations";
import { healthCardModel } from "@/lib/health/status";
import type { HealthMetric } from "@/lib/health/sync-controller";
import { useHealthSync, useMinuteClock } from "@/components/client/useHealthSync";

// The shared body of the steps and sleep cards on the home screen.
//
// The card used to say everything in one line - "3,743 מתוך 10,000" - and say
// its state by fading itself out with `disabled`, which read as "broken" while
// it was only waiting for the native bridge. Now the figure is the headline,
// the goal sits under it, and the state is a sentence with a coloured dot.
// The card is never disabled: every state has something a tap can do.
export default function HealthMetricTile({
  metric,
  label,
  icon,
  value,
  unit,
  goal,
  detail,
  describe,
}: {
  metric: HealthMetric;
  label: string;
  icon: ReactNode;
  /** The figure, or null when there is none to show - never a stand-in zero. */
  value: (state: ReturnType<typeof useHealthSync>["state"], today: string) => string | null;
  unit?: string;
  goal: string;
  detail: (state: ReturnType<typeof useHealthSync>["state"], today: string) => string;
  describe: (value: string | null) => string;
}) {
  const router = useRouter();
  const { state, controller } = useHealthSync();
  const now = useMinuteClock();
  const today = calendarDay();
  const card = healthCardModel(state, metric, today, now);
  const figure = card.hasValue ? value(state, today) : null;

  const onClick = async () => {
    if (!controller) return;
    if (card.action === "connect") return void controller.sync({ ask: true });
    if (card.action === "retry") return void controller.sync({ ask: true });
    if (card.action === "settings" && (await controller.openSettings())) return;
    router.push(`/progress?metric=${metric}`);
  };

  return (
    <button
      type="button"
      className="metric-tile metric-tile--health metric-tile--button"
      data-status={card.status}
      data-metric={metric}
      onClick={() => void onClick()}
      aria-busy={card.status === "syncing" || card.status === "initializing" || undefined}
      aria-label={[describe(figure), card.statusText, card.sourceText, card.syncedText].filter(Boolean).join(". ")}
    >
      <span className="metric-tile__head">
        <span>{label}</span>
        <span className="metric-tile__icon">{icon}</span>
      </span>
      <span className="health-tile__figure">
        <span className="metric-tile__value">
          <bdi>{figure ?? "—"}</bdi>
          {figure && unit ? <span className="metric-tile__unit">{unit}</span> : null}
        </span>
        <small className="metric-tile__goal">{goal}</small>
      </span>
      {card.hasValue ? (
        <span className="health-tile__summary">{detail(state, today)}</span>
      ) : card.status === "sync-error" ? (
        <span className="health-tile__summary">אין עדיין נתונים</span>
      ) : (
        <span className="health-tile__status" data-tone={card.tone}>
          <i aria-hidden="true" />
          {card.statusText}
        </span>
      )}
    </button>
  );
}
