"use client";

import { MoonStar } from "lucide-react";
import { displayedEntry, formatClockHours, SLEEP_GOAL_MINUTES } from "@/lib/health/status";
import HealthMetricTile from "@/components/client/HealthMetricTile";

// "9:53 ש׳", with the goal on its own line as "יעד: 8:00 ש׳" - not
// "9:53 שעות מתוך 8 שעות", which said "hours" twice and set a clock time
// against a plain number.
export default function SleepMetricTile() {
  const goal = formatClockHours(SLEEP_GOAL_MINUTES);
  return (
    <HealthMetricTile
      metric="sleep"
      label="שעות שינה"
      icon={<MoonStar aria-hidden="true" size={18} />}
      value={(state, today) => {
        const entry = displayedEntry(state, "sleep", today);
        return entry && "minutes" in entry && entry.minutes > 0 ? formatClockHours(entry.minutes) : null;
      }}
      unit="שעות"
      goal={`מתוך ${Math.floor(SLEEP_GOAL_MINUTES / 60)} שעות`}
      detail={() => "הנתון האחרון שנקלט"}
      describe={(value) => `שינה אחרונה: ${value ? `${value} שעות` : "אין נתון"}, יעד ${goal} שעות`}
    />
  );
}
