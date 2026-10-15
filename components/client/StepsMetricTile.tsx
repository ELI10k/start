"use client";

import { Footprints } from "lucide-react";
import { calendarWeekDays, stepsByDay, summarizeSteps } from "@/lib/health/calculations";
import HealthMetricTile from "@/components/client/HealthMetricTile";
import { useHealthSync } from "@/components/client/useHealthSync";

// Apple Health and Health Connect already merge steps from the phone, watches
// and compatible smart rings. The figure is their daily aggregate, read through
// the shared health controller - the writers named under it never change it.
export default function StepsMetricTile() {
  const { state } = useHealthSync();
  const goalValue = summarizeSteps(state.snapshot.entries, state.snapshot.preferences).goal;
  const goal = goalValue.toLocaleString("he-IL");
  return (
    <HealthMetricTile
      metric="steps"
      label="צעדים"
      icon={<Footprints aria-hidden="true" size={18} />}
      value={(current, today) => {
        const entry = stepsByDay(current.snapshot.entries).get(today);
        return entry ? entry.steps.toLocaleString("he-IL") : null;
      }}
      goal={`מתוך ${goal}`}
      detail={(current, today) => {
        const byDay = stepsByDay(current.snapshot.entries);
        const weekly = calendarWeekDays(today).reduce((total, day) => total + (byDay.get(day)?.steps ?? 0), 0);
        return `השבוע ${weekly.toLocaleString("he-IL")} מתוך ${(goalValue * 7).toLocaleString("he-IL")}`;
      }}
      describe={(value) => `צעדים היום: ${value ?? "אין נתון"}, מתוך יעד יומי ${goal}`}
    />
  );
}
