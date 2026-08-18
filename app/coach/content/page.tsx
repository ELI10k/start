import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ChevronDown, Plus } from "lucide-react";
import { setContentItemStatus } from "@/app/actions/content";
import SubmitButton from "@/components/forms/SubmitButton";
import { getAuthContext } from "@/lib/data/product-repository";
import { listCoachContent, listContentCategories } from "@/lib/data/content-repository";

const statusLabel = { draft: "טיוטה", published: "פורסם", archived: "הוסר" };

export default async function CoachContentPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");
  const [items, categories] = await Promise.all([listCoachContent(), listContentCategories(true)]);
  const courses = categories.flatMap((category) => {
    const lessons = items.filter((item) => item.categoryId === category.id);
    return lessons.length ? [{ ...category, lessons, cover: lessons.find((item) => item.thumbnailUrl)?.thumbnailUrl ?? null }] : [];
  });

  return <main className="min-h-screen bg-[#090B09] px-4 py-8 text-white sm:px-6">
    <div className="mx-auto max-w-[1500px]">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-8">
        <div><p className="text-xs font-black tracking-[0.28em] text-[#22C55E]">START CONTENT</p><h1 className="mt-2 text-4xl font-black sm:text-5xl">ספריית הקורסים</h1><p className="mt-3 max-w-2xl text-[#A7ADA7]">כל קורס הוא עולם תוכן אחד. נכנסים לקורס ומנהלים את כל השיעורים שלו לפי הסדר.</p></div>
        <Link href="/coach/content/new" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#16A34A] px-5 font-black text-white"><Plus size={19}/>יצירת שיעור</Link>
      </header>

      {courses.length ? <section className="mt-9">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-black">הקורסים של START</h2><span className="text-sm text-[#A7ADA7]">{courses.length} קורסים</span></div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course, courseIndex) => <article key={course.id} className="group overflow-hidden rounded-[28px] border border-white/10 bg-[#151815] shadow-2xl shadow-black/30">
            <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-[#183D24] via-[#101C13] to-black">
              {course.cover ? <Image src={course.cover} alt={`עטיפת ${course.name}`} fill priority={courseIndex < 3} unoptimized className="object-cover transition duration-500 group-hover:scale-[1.03]"/> : <div className="absolute inset-0 grid place-items-center"><BookOpen size={48} className="text-[#22C55E]"/></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent"/>
              <div className="absolute inset-x-0 bottom-0 p-5"><span className="rounded-full bg-[#16A34A] px-3 py-1 text-xs font-black">קורס</span><h2 className="mt-3 text-2xl font-black">{course.name}</h2><p className="mt-1 text-sm text-white/70">{course.lessons.length} שיעורים</p></div>
            </div>
            <div className="p-5">
              {course.description ? <p className="min-h-12 text-sm leading-6 text-[#C7CBC7]">{course.description}</p> : null}
              <details className="mt-4 rounded-2xl border border-white/10 bg-black/20 open:bg-black/35">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-black text-[#4ADE80]"><span>ניהול הקורס</span><ChevronDown size={18}/></summary>
                <div className="space-y-2 border-t border-white/10 p-3">
                  {course.lessons.map((item, index) => <div key={item.id} className="rounded-xl bg-white/[0.05] p-3">
                    <div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#16A34A]/20 text-xs font-black text-[#4ADE80]">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="font-bold">{item.title}</p><p className="mt-1 text-xs text-[#A7ADA7]">{statusLabel[item.status]}</p></div><Link href={`/coach/content/${item.id}`} className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold">עריכה</Link></div>
                    <div className="mt-3 flex flex-wrap gap-2">{item.status !== "published" && <StatusForm id={item.id} status="published" label="פרסום"/>}{item.status !== "draft" && <StatusForm id={item.id} status="draft" label="לטיוטה"/>}{item.status !== "archived" && <StatusForm id={item.id} status="archived" label="הסרה" danger/>}</div></div></div>
                  </div>)}
                </div>
              </details>
            </div>
          </article>)}
        </div>
      </section> : <div className="mt-10 rounded-[28px] border border-dashed border-white/15 p-16 text-center text-[#A7ADA7]"><BookOpen className="mx-auto mb-4 text-[#22C55E]"/><p>עדיין אין קורסים. צור שיעור ראשון ושייך אותו לקורס.</p></div>}
    </div>
  </main>;
}

function StatusForm({ id, status, label, danger = false }: { id: string; status: "draft" | "published" | "archived"; label: string; danger?: boolean }) {
  return <form action={setContentItemStatus}><input type="hidden" name="contentItemId" value={id}/><input type="hidden" name="status" value={status}/><SubmitButton idle={label} pending="שומרים…" className={`min-h-9 rounded-lg border px-3 text-xs font-bold disabled:opacity-50 ${danger ? "border-red-500/30 text-red-400" : "border-green-500/30 text-[#4ADE80]"}`}/></form>;
}
