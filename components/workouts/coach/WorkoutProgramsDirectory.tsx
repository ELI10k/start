"use client";

import Link from "next/link";
import { Archive, BadgeCheck, Copy, Dumbbell, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";

export default function WorkoutProgramsDirectory() {
  const { snapshot, duplicate, archive, deleteProgram } = useWorkouts();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [programName, setProgramName] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [equipment, setEquipment] = useState("");
  const [frequency, setFrequency] = useState("");

  const values = (key: "difficulty") => [...new Set(snapshot.programs.map((program) => program[key]).filter((value): value is string => Boolean(value)))];
  const programOptions = [...new Set(snapshot.programs.map((program) => program.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "he"));
  const equipmentOptions = [...new Set(snapshot.programs.flatMap((program) => program.equipment))];
  const programs = useMemo(
    () => snapshot.programs.filter((program) =>
      (status === "all" || program.status === status) &&
      (!query.trim() || program.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) &&
      (!programName || program.name === programName) &&
      (!difficulty || program.difficulty === difficulty) &&
      (!equipment || program.equipment.includes(equipment)) &&
      (!frequency || program.trainingFrequency === Number(frequency))),
    [difficulty, equipment, frequency, programName, query, snapshot.programs, status],
  );

  return <>
    <div className="mb-4 flex justify-end">
      <Link href="/coach/workouts/new" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#16A34A] px-5 font-black text-[#FFFFFF]"><Plus size={18}/>תוכנית חדשה</Link>
    </div>
    <div className="grid gap-3 rounded-[22px] border border-[#E5E7E5] bg-[#FFFFFF] p-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="relative sm:col-span-2 lg:col-span-3"><Search className="absolute right-4 top-4 text-[#16A34A]" size={18}/><span className="sr-only">חיפוש תוכנית</span><input className="nutrition-input pr-11" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש תוכנית"/></label>
      <Filter label="סטטוס" value={status} onChange={setStatus} options={[{ value: "active", label: "פעילות" }, { value: "archived", label: "בארכיון" }, { value: "all", label: "הכול" }]}/>
      <Filter label="תוכנית" value={programName} onChange={setProgramName} options={programOptions.map((value) => ({ value, label: value }))}/>
      <Filter label="רמה" value={difficulty} onChange={setDifficulty} options={values("difficulty").map((value) => ({ value, label: value }))}/>
      <Filter label="ציוד" value={equipment} onChange={setEquipment} options={equipmentOptions.map((value) => ({ value, label: value }))}/>
      <Filter label="תדירות שבועית" value={frequency} onChange={setFrequency} options={[1, 2, 3, 4, 5, 6, 7].map((value) => ({ value: String(value), label: `${value} פעמים` }))}/>
    </div>
    {programs.length ? <div className="mt-5 grid gap-4 md:grid-cols-2">{programs.map((program) => {
      const exerciseCount = program.days.reduce((count, day) => count + day.exercises.length, 0);
      return <article key={program.id} className="rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5">
        <div className="flex flex-wrap gap-2"><span className="text-xs font-bold text-[#16A34A]">{program.status === "active" ? "פעילה" : "בארכיון"}</span>{program.official && <span className="inline-flex items-center gap-1 text-xs font-bold text-[#16A34A]"><BadgeCheck size={14}/>תוכנית רשמית</span>}</div>
        <h2 className="mt-2 text-xl font-black">{program.name}</h2>
        <p className="mt-2 text-sm text-[#5B5F5B]">{program.days.length === 1 ? "אימון אחד" : `${program.days.length} אימונים שונים`} · {exerciseCount} תרגילים · {program.trainingFrequency ? `${program.trainingFrequency} אימונים בשבוע` : "תדירות לא צוינה"}</p>
        <p className="mt-1 text-xs text-[#3F433F]">{program.difficulty ?? "רמה לא צוינה"} · {program.equipment.join(", ") || "ציוד לא צוין"}</p>
        <p className="mt-2 text-xs text-[#3F433F]">מקור: {program.sourceWorkbook}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/coach/workouts/${program.id}`} className="inline-flex min-h-11 items-center rounded-xl bg-[#16A34A] px-4 text-sm font-black text-[#FFFFFF]">תצוגה ושיוך</Link>
          <button type="button" onClick={() => duplicate(program.id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E5E7E5] px-3 text-sm"><Copy size={16}/>עותק מותאם</button>
          {!program.official && program.status === "active" && <button type="button" onClick={() => { if (window.confirm("להעביר את העותק לארכיון?")) archive(program.id); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DC2626]/30 px-3 text-sm text-[#DC2626]"><Archive size={16}/>ארכיון</button>}
          {!program.official && <button type="button" onClick={() => { if (window.confirm("למחוק לצמיתות את התוכנית? לא ניתן למחוק תוכנית שמשויכת ללקוח.")) deleteProgram(program.id); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DC2626]/30 px-3 text-sm text-[#DC2626]"><Trash2 size={16}/>מחיקה</button>}
        </div>
      </article>;
    })}</div> : snapshot.programs.length ? <div className="mt-5 rounded-[26px] border border-dashed border-[#E5E7E5] p-14 text-center"><Search className="mx-auto text-[#3F433F]"/><h2 className="mt-4 font-black">לא נמצאו תוכניות</h2><p className="mt-2 text-sm text-[#5B5F5B]">אפשר לשנות את החיפוש או הסינונים.</p></div> : <div className="mt-5 rounded-[26px] border border-dashed border-[#E5E7E5] bg-[#FFFFFF] p-14 text-center"><Dumbbell className="mx-auto text-[#3F433F]" size={40}/><h2 className="mt-4 font-black">אין תוכניות אימון מאושרות לייבוא</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#5B5F5B]">לא נמצאו קובצי האימון של אלי במאגר. המודול מוכן לקליטה, אך לא נוצרו תוכניות או תרגילים חלופיים.</p></div>}
  </>;
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <label className="text-xs text-[#5B5F5B]">{label}<select className="nutrition-input mt-1" value={value} onChange={(event) => onChange(event.target.value)}><option value="">הכול</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
