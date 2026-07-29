import "server-only";

import { getSupabaseConfig } from "./env";
import { createSupabaseServerClient } from "./server";

export type SupabaseHealthResult =
  | { connected: true; status: "connected" }
  | { connected: false; message: string; detail?: string };

const CONNECTION_ERROR_MESSAGE =
  "לא ניתן לאמת כרגע את החיבור ל-Supabase. בדקו את משתני הסביבה ואת migration של app_health.";

export async function readSupabaseHealth(): Promise<SupabaseHealthResult> {
  if (!getSupabaseConfig()) {
    return {
      connected: false,
      message: "חסרים משתני הסביבה של Supabase.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("app_health")
      .select("status")
      .eq("status", "connected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        connected: false,
        message: CONNECTION_ERROR_MESSAGE,
        detail: [error.code, error.message].filter(Boolean).join(": "),
      };
    }

    if (data?.status !== "connected") {
      return {
        connected: false,
        message: CONNECTION_ERROR_MESSAGE,
        detail: "לא נמצאה רשומת connected בטבלה app_health.",
      };
    }

    return { connected: true, status: "connected" };
  } catch {
    return { connected: false, message: CONNECTION_ERROR_MESSAGE };
  }
}
