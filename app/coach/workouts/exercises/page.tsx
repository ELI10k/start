import ExerciseDirectory from "@/components/workouts/coach/ExerciseDirectory";
import { requireCoach } from "@/lib/auth/guards";
export default async function Page(){await requireCoach();return <main className="px-4 py-8 text-[#0B0B0B] sm:px-6"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-black">מאגר התרגילים המרכזי</h1><p className="mt-2 text-[#5B5F5B]">חיפוש וסינון מתוך קובצי המקור המאושרים בלבד.</p><div className="mt-6"><ExerciseDirectory/></div></div></main>}
