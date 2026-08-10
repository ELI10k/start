"use client";
import { useState } from "react";
import { Save } from "lucide-react";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import { validateGuidance } from "@/lib/workouts/exercise-guidance";
import type { Exercise } from "@/lib/workouts/types";

// The only way guidance ever gets into the app. Nothing is generated and nothing
// is imported from an unverified source: the coach types what they know, one
// line per cue, and that is exactly what the client sees.
export default function ExerciseGuidanceEditor({ exercise }: { exercise: Exercise }) {
  const { role, saveExerciseGuidance } = useWorkouts();
  const [imageUrl, setImageUrl] = useState(exercise.imageUrl ?? "");
  const [howTo, setHowTo] = useState(exercise.howTo ?? "");
  const [cues, setCues] = useState(exercise.cues.join("\n"));
  const [mistakes, setMistakes] = useState(exercise.commonMistakes.join("\n"));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  if (role !== "coach") return null;

  const lines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

  const submit = async () => {
    if (saving) return;
    const check = validateGuidance({ imageUrl, howTo, cues: lines(cues), commonMistakes: lines(mistakes) });
    if (!check.valid) {
      setMessage(check.message ?? "הקלט אינו תקין.");
      return;
    }
    setSaving(true);
    setMessage("");
    const ok = await saveExerciseGuidance(exercise.id, check.guidance);
    setSaving(false);
    setMessage(ok ? "הדגשים נשמרו ומופיעים ללקוח." : "השמירה נכשלה. יש לנסות שוב.");
  };

  return (
    <section className="premium-card mt-6">
      <h2 className="text-xl font-black">עריכת דגשים לתרגיל</h2>
      <p className="mt-1 text-sm text-[#5B5F5B]">רק מה שנכתב כאן מוצג ללקוח. שדה ריק פשוט לא יופיע.</p>

      <label className="mt-4 block text-xs font-bold text-[#3F433F]">
        כתובת תמונה (https)
        <input className="nutrition-input mt-1" dir="ltr" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" />
      </label>

      <label className="mt-3 block text-xs font-bold text-[#3F433F]">
        איך מבצעים
        <textarea className="nutrition-input mt-1 min-h-28" value={howTo} onChange={(event) => setHowTo(event.target.value)} />
      </label>

      <label className="mt-3 block text-xs font-bold text-[#3F433F]">
        דגשים חשובים (שורה לכל דגש, עד 6)
        <textarea className="nutrition-input mt-1 min-h-24" value={cues} onChange={(event) => setCues(event.target.value)} />
      </label>

      <label className="mt-3 block text-xs font-bold text-[#3F433F]">
        טעויות נפוצות (שורה לכל טעות, עד 6)
        <textarea className="nutrition-input mt-1 min-h-24" value={mistakes} onChange={(event) => setMistakes(event.target.value)} />
      </label>

      {message && <p role="status" className="mt-3 rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-3 text-sm">{message}</p>}

      <button type="button" onClick={submit} disabled={saving} className="premium-primary-button mt-4">
        <Save aria-hidden="true" size={17} />
        {saving ? "שומרים…" : "שמירת הדגשים"}
      </button>
    </section>
  );
}
