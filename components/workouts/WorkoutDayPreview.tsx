"use client";
import { useMemo, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { Copy, ExternalLink, Save } from "lucide-react";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import ExerciseGuidanceButton from "@/components/workouts/ExerciseGuidanceButton";
import type { WorkoutExercise, WorkoutProgram } from "@/lib/workouts/types";

// The coach's view of one training day, and the place a prescription is actually
// adjusted. It used to be read-only: sets, reps and rest were three grey tiles,
// so changing "3×12" to "4×10" meant going back to the builder - and for the
// approved programmes there was no route at all.
export default function WorkoutDayPreview({ programId, dayId }: { programId: string; dayId: string }) {
  const { getProgram, getExercise, saveProgram, duplicate } = useWorkouts();
  const router = useRouter();
  const program = getProgram(programId);
  const day = program?.days.find((item) => item.id === dayId);

  // The edited prescription, keyed by slot. Nothing is written until the coach
  // saves, so a half-typed rep range never reaches a client mid-week.
  const [draft, setDraft] = useState<Record<string, Partial<WorkoutExercise>>>({});
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const ordered = useMemo(() => [...(day?.exercises ?? [])].sort((a, b) => a.order - b.order), [day]);
  if (!program || !day) notFound();

  // The approved programmes are shared by every client, and the database refuses
  // to rewrite one - save_workout_program_tree rejects anything flagged official.
  // So the coach edits their own copy, and the screen says so rather than letting
  // them type into fields that cannot be saved.
  //
  // Not gated on the client-side role. This screen lives under /coach, which the
  // proxy already restricts to coaches, and save_workout_program_tree rejects a
  // non-coach regardless - so the role check added nothing except a race, since
  // it arrives with the snapshot and the fields rendered read-only until it did.
  const readOnly = program.official;
  const canEdit = !readOnly;
  const value = (entry: WorkoutExercise, field: "sets" | "reps" | "rest") => draft[entry.id]?.[field] ?? entry[field] ?? "";
  const edit = (entry: WorkoutExercise, field: "sets" | "reps" | "rest", next: string) => {
    setStatus("");
    setDraft((current) => ({ ...current, [entry.id]: { ...current[entry.id], [field]: next } }));
  };
  const dirty = Object.keys(draft).length > 0;

  const save = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    setStatus("");
    // Only this day's slots change. Everything else in the programme is written
    // back exactly as it was read.
    const next: WorkoutProgram = {
      ...program,
      days: program.days.map((item) => item.id !== dayId ? item : {
        ...item,
        exercises: item.exercises.map((entry) => {
          const patch = draft[entry.id];
          if (!patch) return entry;
          const sets = (patch.sets ?? entry.sets ?? "").trim();
          return {
            ...entry,
            sets: sets || undefined,
            reps: (patch.reps ?? entry.reps ?? "").trim() || undefined,
            rest: (patch.rest ?? entry.rest ?? "").trim() || undefined,
            // The per-set rows follow the set count, so a change from three sets
            // to four has somewhere to record the fourth.
            setPrescriptions: prescriptionsFor(entry, sets, (patch.reps ?? entry.reps ?? "").trim()),
          };
        }),
      }),
    };
    const ok = await saveProgram(next);
    setSaving(false);
    if (ok) {
      setDraft({});
      // Completed workouts keep the prescription they were performed under -
      // they are separate rows - so this only changes what comes next.
      setStatus("השינויים נשמרו. הם יחולו על האימונים הבאים; אימונים שכבר בוצעו נשארים כפי שהיו.");
      router.refresh();
    } else {
      setStatus("השמירה נכשלה. יש לנסות שוב.");
    }
  };

  const makeCopy = async () => {
    setSaving(true);
    const id = await duplicate(programId);
    setSaving(false);
    if (id) router.push(`/coach/workouts/${id}`);
    else setStatus("לא ניתן היה ליצור עותק.");
  };

  return <div className="px-4 py-8 text-[#0B0B0B] sm:px-6"><div className="mx-auto max-w-4xl">
    <p className="text-xs font-bold text-[#16A34A]">{program.name} · יום {day.order + 1}</p>
    <h1 className="mt-2 text-3xl font-black">{day.name}</h1>

    {readOnly && (
      <div className="mt-4 rounded-2xl border border-dashed border-[#E5E7E5] bg-[#F7F8F7] p-4">
        <p className="text-sm text-[#5B5F5B]">זו תוכנית מאושרת המשותפת לכל הלקוחות, ולכן היא לקריאה בלבד. אפשר ליצור עותק ולערוך בו סטים, חזרות ומנוחה.</p>
        <button type="button" onClick={makeCopy} disabled={saving} className="premium-secondary-button mt-3">
          <Copy aria-hidden="true" size={17} />{saving ? "יוצרים עותק…" : "יצירת עותק לעריכה"}
        </button>
      </div>
    )}

    <div className="mt-6 space-y-4">
      {ordered.map((entry) => {
        const exercise = getExercise(entry.exerciseId);
        return <article key={entry.id} className="rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs text-[#5B5F5B]">תרגיל {entry.order + 1}</span>
              <h2 className="mt-1 text-xl font-black">{exercise?.name ?? "תרגיל חסר במאגר"}</h2>
              {/* The muscle group, as a tag rather than a line of small print at
                  the foot of the card. It comes from the exercise bank; a bank
                  entry without one says so instead of being given a guess. */}
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="pill pill--green">{exercise?.primaryMuscleGroup ?? "קבוצת שריר לא סווגה"}</span>
                {exercise?.equipment && <span className="pill">{exercise.equipment}</span>}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {exercise?.video
                ? <a href={exercise.video.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#16A34A]/30 px-3 text-sm font-bold text-[#16A34A]">וידאו<ExternalLink size={15} /></a>
                : <span className="pill">אין סרטון</span>}
              <ExerciseGuidanceButton exercise={exercise} />
            </div>
          </div>

          {/* Editable in place. Three short fields beat a sheet here: a coach
              adjusting a programme usually changes several exercises in a row. */}
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Prescription label="סטים" name={`סטים ל${exercise?.name ?? "תרגיל"}`} value={String(value(entry, "sets"))} editable={canEdit} onChange={(next) => edit(entry, "sets", next)} />
            <Prescription label="חזרות" name={`חזרות ל${exercise?.name ?? "תרגיל"}`} value={String(value(entry, "reps"))} editable={canEdit} onChange={(next) => edit(entry, "reps", next)} />
            <Prescription label="מנוחה" name={`מנוחה ל${exercise?.name ?? "תרגיל"}`} value={String(value(entry, "rest"))} editable={canEdit} onChange={(next) => edit(entry, "rest", next)} />
          </dl>

          {entry.notes && <p className="mt-4 text-sm text-[#5B5F5B]">{entry.notes}</p>}
          {exercise?.executionNotes && <p className="mt-2 text-sm text-[#5B5F5B]">{exercise.executionNotes}</p>}
        </article>;
      })}
    </div>

    {canEdit && (
      <div className="sticky bottom-4 mt-5">
        <button type="button" onClick={save} disabled={!dirty || saving} className="premium-primary-button w-full">
          <Save aria-hidden="true" size={18} />{saving ? "שומרים…" : dirty ? "שמירת השינויים" : "אין שינויים לשמירה"}
        </button>
      </div>
    )}
    {status && <p role="status" className="mt-3 rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-3 text-sm">{status}</p>}
  </div></div>;
}

// A set count that grows needs rows to grow with it; one that is not a number -
// "עד כישלון", say - leaves the existing rows alone.
function prescriptionsFor(entry: WorkoutExercise, sets: string, reps: string) {
  const count = Number.parseInt(sets, 10);
  if (!Number.isFinite(count) || count <= 0) return entry.setPrescriptions;
  const capped = Math.min(count, 12);
  return Array.from({ length: capped }, (_, order) => ({
    id: entry.setPrescriptions?.[order]?.id ?? `${entry.id}-set-${order + 1}`,
    order,
    repetitions: reps || entry.setPrescriptions?.[order]?.repetitions,
  }));
}

function Prescription({ label, name, value, editable, onChange }: { label: string; name: string; value: string; editable: boolean; onChange: (value: string) => void }) {
  return <div className="rounded-xl bg-[#F7F8F7] p-3">
    <dt className="text-xs text-[#5B5F5B]">{label}</dt>
    <dd className="mt-1">
      {editable
        ? <input aria-label={name} className="nutrition-input" value={value} placeholder="—" onChange={(event) => onChange(event.target.value)} />
        : <span className="font-black">{value || "—"}</span>}
    </dd>
  </div>;
}
