import Link from "next/link";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import TodayWorkout from "@/components/workouts/client/TodayWorkout";
import WorkoutDailyActions from "@/components/workouts/client/WorkoutDailyActions";
export default function WorkoutsPage(){return <ClientShell><PageHeader eyebrow="האימונים שלי" title="האימון של היום" description="התוכנית המאושרת ששויכה אליך." action={{href:"/workouts/history",label:"היסטוריה"}}/><TodayWorkout/><div className="mt-5"><WorkoutDailyActions/></div><Link href="/workouts/progress" className="mt-5 inline-flex min-h-12 items-center rounded-xl border border-[#E5E7E5] px-5 font-bold text-[#16A34A]">התקדמות בתרגילים</Link></ClientShell>}
