"use client";

import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import WorkoutLoadingState from "@/components/workouts/WorkoutLoadingState";

export default function WorkoutRouteReady({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, persistenceError } = useWorkouts();
  if (loading) return <WorkoutLoadingState />;
  if (persistenceError)
    return (
      <div className="px-4 py-8 text-white">
        <p
          role="alert"
          className="mx-auto max-w-3xl rounded-[24px] border border-red-400/20 bg-red-400/[.05] p-8 text-center text-sm text-red-200"
        >
          {persistenceError}
        </p>
      </div>
    );
  return children;
}
