"use client";
import { Dumbbell } from "lucide-react";
import Link from "next/link";
import { israelDateKey } from "@/lib/date-time";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import { activeAssignmentFor, getTodayWorkoutDay } from "@/lib/workouts/progress";

// The card this replaced said the same three things in five times the height:
// which programme is running, which day is next, and whether a session is still
// open. The home screen has to fit one phone viewport, so it says them from
// inside the tile the client was going to press anyway - and presses through to
// the open session when there is one, exactly as the card's button did.
export default function DashboardWorkoutWidget() {
  const { snapshot, currentClientId, loading, persistenceError } = useWorkouts();
  const assignment = activeAssignmentFor(snapshot.assignments, currentClientId, israelDateKey());
  const program = snapshot.programs.find((item) => item.id === assignment?.programId);
  const today = program ? getTodayWorkoutDay(program, snapshot.completedWorkouts, currentClientId, israelDateKey(), snapshot.scheduleChanges.filter((c) => c.clientId === currentClientId && c.status === "skipped").map((c) => c.originalDate)) : undefined;
  const active = snapshot.activeSessions.find((item) => item.clientId === currentClientId);
  return (
    <Link
      href={active ? `/workouts/${active.programId}/${active.dayId}` : "/workouts"}
      className="quick-action-card"
    >
      <span className="quick-action-card__icon"><Dumbbell aria-hidden="true" size={22} /></span>
      <span className="quick-action-card__label">תוכנית אימון</span>
      {loading ? (
        <span role="status" className="quick-action-card__meta">טוען…</span>
      ) : persistenceError ? (
        <span role="alert" className="quick-action-card__meta quick-action-card__meta--error">שגיאה בטעינה</span>
      ) : (
        <span className="quick-action-card__meta">
          {active ? "המשך אימון פעיל" : today?.name ?? program?.name ?? "אין תוכנית פעילה"}
        </span>
      )}
    </Link>
  );
}
