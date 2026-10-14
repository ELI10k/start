"use client";

import { Footprints } from "lucide-react";
import { stepsByDay, summarizeSteps } from "@/lib/health/calculations";
import HealthMetricTile from "@/components/client/HealthMetricTile";
import { useHealthSync } from "@/components/client/useHealthSync";

// Apple Health and Health Connect already merge steps from the phone, watches
// and compatible smart rings. The figure is their daily aggregate, read through
// the shared health controller - the writers named under it never change it.
export default function StepsMetricTile() {
  const { state } = useHealthSync();
  const goal = summarizeSteps(state.snapshot.entries, state.snapshot.preferences).goal.toLocaleString("he-IL");
  return (
    <HealthMetricTile
      metric="steps"
      label="צעדים"
      icon={<Footprints aria-hidden="true" size={18} />}
      value={(current, today) => {
        const entry = stepsByDay(current.snapshot.entries).get(today);
        return entry ? entry.steps.toLocaleString("he-IL") : null;
      }}
      goal={`מתוך יעד ${goal}`}
      describe={(value) => `צעדים היום: ${value ?? "אין נתון"}, מתוך יעד יומי ${goal}`}
    />
  );
}
