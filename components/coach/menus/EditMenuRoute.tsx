"use client";
import Link from "next/link";
import { useMealPlans } from "@/components/coach/MealPlansProvider";
import MealPlanEditor from "./MealPlanEditor";
export default function EditMenuRoute({ id }: { id: string }) { const { getPlan } = useMealPlans(); const plan = getPlan(id); if (!plan) return <main className="px-4 py-20 text-center"><h1 className="text-3xl font-black">התפריט לא נמצא</h1><p className="mt-3 text-[#5B5F5B]">ייתכן שהתפריט נמחק או שהקישור אינו תקין.</p><Link href="/coach/menus" className="mt-6 inline-flex rounded-2xl bg-[#16A34A] px-5 py-3 font-black text-[#FFFFFF]">חזרה לתפריטים</Link></main>; return <MealPlanEditor key={plan.id} initialPlan={plan}/>; }
