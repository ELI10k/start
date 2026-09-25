"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// The provider pulls in the workout repository, offline snapshot handling and
// the complete set of workout mutations. Keeping that graph behind a dynamic
// boundary means nutrition, profile, login and the public pages do not download
// workout code they can never use. On workout routes Next still preloads and
// server-renders this boundary, so there is no extra client-only blank state.
const WorkoutProvider = dynamic(() =>
  import("@/components/workouts/WorkoutProvider").then((module) => module.WorkoutProvider),
);

export function ConditionalWorkoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Creating the workout repository reads the browser Supabase configuration.
  // Mount it only on screens that actually consume workout state. Previously it
  // wrapped login, nutrition, profile and every public/error screen as well, so
  // one missing public key turned the entire site into a server-rendered 500
  // before the login form could even explain the configuration problem.
  const needsWorkouts =
    pathname === "/" ||
    pathname === "/coach" ||
    pathname.startsWith("/coach/") ||
    pathname === "/workouts" ||
    pathname.startsWith("/workouts/");
  if (!needsWorkouts) return children;

  return <WorkoutProvider>{children}</WorkoutProvider>;
}
