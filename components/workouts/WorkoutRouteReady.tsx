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
      <div className="px-4 py-8 text-[#0B0B0B]">
        <p
          role="alert"
          className="mx-auto max-w-3xl rounded-[24px] border border-[#DC2626]/30 bg-[#FEF2F2] p-8 text-center text-sm text-[#DC2626]"
        >
          {persistenceError}
        </p>
      </div>
    );
  return children;
}
