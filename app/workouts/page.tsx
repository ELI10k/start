import Link from "next/link";
import { LineChart } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import TodayWorkout from "@/components/workouts/client/TodayWorkout";
import WorkoutDailyActions from "@/components/workouts/client/WorkoutDailyActions";

export default function WorkoutsPage(){
  return <ClientShell>
    <PageHeader eyebrow="האימונים שלי" title="האימון של היום" description="התוכנית המאושרת ששויכה אליך." action={{href:"/workouts/history",label:"היסטוריה"}}/>
    <TodayWorkout/>
    <div className="mt-4 grid gap-3">
      <WorkoutDailyActions/>
      <div className="app-list">
        <Link href="/workouts/progress">
          <span className="app-list__icon"><LineChart aria-hidden="true" size={17}/></span>
          <span className="app-list__main"><strong>התקדמות בתרגילים</strong><span>נפח, משקלים ושיאים אישיים</span></span>
        </Link>
      </div>
    </div>
  </ClientShell>;
}
