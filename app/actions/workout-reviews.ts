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

export async function markNutritionHandled(clientId: string, activityDate: string) {
  const auth = await getAuthContext();
  if (
    !auth ||
    auth.role !== "coach" ||
    !clientId.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(activityDate)
  ) {
    return { ok: false, message: "לא ניתן לסמן את פעילות התזונה כטופלה." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("coach_nutrition_reviews").upsert(
    { coach_id: auth.id, client_id: clientId, activity_date: activityDate },
    { onConflict: "coach_id,client_id,activity_date", ignoreDuplicates: true },
  );
  if (error) return { ok: false, message: "שמירת הטיפול נכשלה. נסה שוב." };
  revalidatePath("/coach");
  return { ok: true, message: "פעילות התזונה סומנה כטופלה." };
}
