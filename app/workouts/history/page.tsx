import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import WorkoutRouteReady from "@/components/workouts/WorkoutRouteReady";
import WorkoutHistory from "@/components/workouts/client/WorkoutHistory";
export default function WorkoutHistoryPage(){return <ClientShell><PageHeader eyebrow="האימונים שלי" title="היסטוריית אימונים" description="השלמות ונתוני ביצוע שנשמרו ב-Supabase." action={{href:"/workouts",label:"האימון הבא"}}/><WorkoutRouteReady><WorkoutHistory/></WorkoutRouteReady></ClientShell>}
