"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TemplateState = Readonly<{ ok: boolean; message?: string }>;

export type ResponseTemplate = Readonly<{
  id: string;
  title: string;
  body: string;
  useCount: number;
}>;

// Applied by hand like the other migrations here, so the screens have to survive
// the window before it runs: no templates is the same as none saved yet.
const MISSING_RELATION = new Set(["42P01", "PGRST202", "PGRST205"]);
const isMissing = (code?: string) => MISSING_RELATION.has(code ?? "");

export async function listResponseTemplates(): Promise<readonly ResponseTemplate[]> {
  const auth = await getAuthContext();
  if (auth?.role !== "coach") return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("coach_response_templates")
    .select("id,title,body,use_count")
    .order("use_count", { ascending: false })
    .order("title");
  if (error) {
    if (isMissing(error.code)) return [];
    throw error;
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    body: row.body as string,
    useCount: Number(row.use_count ?? 0),
  }));
}

export async function saveResponseTemplate(_state: TemplateState, form: FormData): Promise<TemplateState> {
  const auth = await getAuthContext();
  if (auth?.role !== "coach") return { ok: false, message: "אין הרשאה." };

  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  if (!title) return { ok: false, message: "יש לתת לתשובה שם, כדי למצוא אותה אחר כך." };
  if (title.length > 80) return { ok: false, message: "השם ארוך מדי. עד 80 תווים." };
  if (!body) return { ok: false, message: "אי אפשר לשמור תשובה ריקה." };
  if (body.length > 4000) return { ok: false, message: "התשובה ארוכה מדי. עד 4000 תווים." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("coach_response_templates")
    .upsert({ coach_id: auth.id, title, body }, { onConflict: "coach_id,title" });
  if (error) {
    if (isMissing(error.code)) return { ok: false, message: "התשובות השמורות עדיין לא הופעלו במסד הנתונים." };
    return { ok: false, message: "התשובה לא נשמרה. יש לנסות שוב." };
  }
  revalidatePath("/coach/check-ins");
  return { ok: true, message: `„${title}” נשמרה.` };
}

export async function deleteResponseTemplate(form: FormData): Promise<void> {
  const auth = await getAuthContext();
  if (auth?.role !== "coach") return;
  const id = String(form.get("templateId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const supabase = await createSupabaseServerClient();
  // The policy already restricts this to the coach's own rows; the filter is
  // here so a mistake is a no-op rather than an error.
  await supabase.from("coach_response_templates").delete().eq("id", id).eq("coach_id", auth.id);
  revalidatePath("/coach/check-ins");
}

export async function recordTemplateUse(templateId: string): Promise<void> {
  const auth = await getAuthContext();
  if (auth?.role !== "coach") return;
  if (!/^[0-9a-f-]{36}$/i.test(templateId)) return;
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("record_response_template_use", { p_template_id: templateId });
}
