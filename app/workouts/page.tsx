import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import TodayWorkout from "@/components/workouts/client/TodayWorkout";

export default function WorkoutsPage(){
  return <ClientShell>
    <PageHeader eyebrow="האימונים שלי" title="האימון של היום" description="התוכנית המאושרת ששויכה אליך." action={{href:"/workouts/history",label:"היסטוריה"}}/>
    <TodayWorkout/>
  </ClientShell>;
}
