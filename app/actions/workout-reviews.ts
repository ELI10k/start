"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function markWorkoutHandled(workoutSessionId: string) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "coach" || !workoutSessionId.trim()) {
    return { ok: false, message: "לא ניתן לסמן את האימון כטופל." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("coach_workout_reviews").upsert(
    { workout_session_id: workoutSessionId, coach_id: auth.id },
    { onConflict: "workout_session_id,coach_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false, message: "שמירת הטיפול נכשלה. נסה שוב." };
  revalidatePath("/coach");
  return { ok: true, message: "האימון סומן כטופל." };
}

