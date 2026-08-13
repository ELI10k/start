"use client";
import { useState } from "react";
import { ExternalLink, ImageOff, Info } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import { buildGuidanceView } from "@/lib/workouts/exercise-guidance";
import type { Exercise } from "@/lib/workouts/types";

// "דגשים לתרגיל" sits next to the video link everywhere an exercise is named -
// the coach's builder, the client's programme and the live workout. The workout
// screen itself stays as it was: a name, the prescription and the set rows. All
// of the teaching lives one tap away, inside the sheet, so nothing competes with
// the set the client is in the middle of.
export default function ExerciseGuidanceButton({ exercise, variant = "chip" }: { exercise?: Exercise; variant?: "chip" | "link" }) {
  const [open, setOpen] = useState(false);
  if (!exercise) return null;
  const view = buildGuidanceView(exercise);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={variant === "chip" ? "chip shrink-0" : "inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-bold text-[#16A34A]"}
      >
        <Info aria-hidden="true" size={15} />
        דגשים לתרגיל
      </button>
      <BottomSheet open={open} title={view.name} onClose={() => setOpen(false)}>
        <ExerciseGuidancePanel exercise={exercise} />
        <div className="sheet__actions">
          <button type="button" onClick={() => setOpen(false)} className="premium-secondary-button">
            סגירה
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

// Split out so the coach's exercise page can show the same panel inline without
// a sheet around it.
export function ExerciseGuidancePanel({ exercise }: { exercise: Exercise }) {
  const view = buildGuidanceView(exercise);
  return (
    <div className="grid gap-4">
      {/* A missing image is stated plainly. An <img> pointing at nothing would
          render as a broken icon, which reads as a bug rather than as missing
          content. */}
      {view.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- coach-supplied remote URLs are not in the Next image allowlist
        <img src={view.imageUrl} alt={`תמונת ההדגמה של ${view.name}`} loading="lazy" className="max-h-56 w-full rounded-2xl border border-[#E5E7E5] object-cover" />
      ) : (
        <div className="grid h-32 place-items-center gap-2 rounded-2xl border border-dashed border-[#E5E7E5] bg-[#F7F8F7] text-[#5B5F5B]">
          <ImageOff aria-hidden="true" size={22} />
          <span className="text-xs">לא הועלתה תמונה לתרגיל</span>
        </div>
      )}

      {view.sections.map((section) => (
        <section key={section.key}>
          <h3 className="text-sm font-black text-[#0B0B0B]">{section.title}</h3>
          {section.kind === "text" ? (
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#5B5F5B]">{section.text}</p>
          ) : (
            <ul className="mt-1 grid gap-1 text-sm leading-6 text-[#5B5F5B]">
              {section.items?.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[#16A34A]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {view.videoUrl && (
        <a href={view.videoUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#16A34A]">
          צפייה בסרטון ההסבר
          <ExternalLink aria-hidden="true" size={15} />
        </a>
      )}

      {/* Naming what is absent is the point: it tells the coach exactly what to
          fill in, and it tells the client that nothing was hidden from them. */}
      {view.missing.length > 0 && (
        <p className="rounded-2xl border border-dashed border-[#E5E7E5] p-3 text-xs text-[#5B5F5B]">
          {view.hasAnyContent ? "עדיין לא סופק מידע ל: " : "לתרגיל הזה עדיין לא סופק מידע. חסרים: "}
          {view.missing.map((key) => MISSING_LABELS[key]).join(", ")}.
        </p>
      )}
    </div>
  );
}

const MISSING_LABELS = {
  "how-to": "איך מבצעים",
  cues: "דגשים חשובים",
  mistakes: "טעויות נפוצות",
  muscles: "שריר עיקרי",
  "assisting-muscles": "שרירים מסייעים",
  equipment: "ציוד",
} as const;
