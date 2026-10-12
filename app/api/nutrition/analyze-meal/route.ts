import { getVercelOidcToken } from "@vercel/oidc";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { validateFoodLogPhoto } from "@/lib/nutrition/food-log";
import { detectImageFormat } from "@/lib/images/signature";
import { MEAL_ANALYSIS_SCHEMA, normalizeComponents, parseMealAnalysis, type MatchableFood } from "@/lib/nutrition/meal-image-analysis";
import { signMealAnalysis } from "@/lib/nutrition/meal-analysis-signature";
import { AI_MEAL_DEFAULT_MODEL, canUseAiMealAnalysis, isAiMealAnalysisEnabled } from "@/lib/nutrition/ai-meal-feature";

export const maxDuration = 60;
const mealAnalysisModel = process.env.AI_MEAL_MODEL?.trim() || AI_MEAL_DEFAULT_MODEL;
const modelPricingUsdPerMillion = {
  "openai/gpt-6-luna": { input: 0.1, output: 0.5 },
  "alibaba/qwen3.8-omni-flash": { input: 0.15, output: 0.47 },
} satisfies Record<string, { input: number; output: number }>;

const prompt = (description: string) => [
  "נתח תמונה של ארוחה לצורך מעקב תזונתי משוער, לא מדידה רפואית.",
  "התמונה היא המקור המרכזי והסמכות להערכת הנפח והמשקל. הטקסט נועד לזהות מזונות ואופן הכנה, ויכול לתקן זיהוי שגוי או לציין רכיב מוסתר, אך אינו הוכחה לכמות גדולה יותר.",
  "אל תגדיל את משקל הארוחה או רכיביה רק מפני שהטקסט מפרט יותר רכיבים. אל תנסה להתאים את התוצאה לערך קלורי קודם או ליעד כלשהו.",
  "החזר כל מזון כרכיב נפרד, עם משקל משוער בגרמים וערכי המנה כולה. ברירת המחדל לכל מזון שעל הצלחת היא משקל לאחר הכנה (as_served), אלא אם יש ראיה ברורה אחרת.",
  "הבחן במפורש בין מזון נא, מבושל, צלוי, אפוי ומטוגן. ערכי התזונה חייבים להתאים לאופן ההכנה ולמשקל לאחר הכנה.",
  "שים לב במיוחד למאכלים ישראליים: חומוס, פלאפל, שווארמה, פרגית, קוסקוס, פיתה, אורז ושניצל.",
  "כאשר כמה סלטים נמצאים יחד באותו אזור קטן, צור עבורם group אחד: הערך קודם את המשקל הכולל של הקבוצה מהתמונה, ואז חלק אותו בין רכיבי הסלט. סכום משקלי הרכיבים חייב להתאים למשקל הקבוצה.",
  "זהה שמן, מיונז, טחינה ורטבים לפי התמונה והטקסט. במזון מוכן כגון חצילים מטוגנים או גזר במיונז, כלול את השמן או המיונז פעם אחת בתוך הערכים של המזון וסמן nutritionIncludesAddedFat=true.",
  "אל תחזיר שמן, מיונז או רוטב כרכיב נפרד אם הם כבר כלולים בערכי המזון המוכן. רכיב כזה יכול להיות נפרד רק אם הוא תוספת נפרדת שנראית בתמונה; במקרה זה סמן standaloneVisibleAddition=true ושייך אותו לקבוצה נפרדת.",
  "אם כמות שמן, מיונז או רוטב אינה ידועה, השתמש בהערכה סבירה אחת, ציין את ההנחה וסמן confidence נמוך או בינוני. שאל clarification קצרה רק כאשר התשובה תשנה מהותית את ההערכה.",
  "אל תמציא רכיבים שאינם בתמונה או בתיאור המשתמש.",
  "אם התמונה מטושטשת מדי או אינה מכילה מזון, החזר containsFood=false ומערכי groups ו-components ריקים.",
  "confidence הוא שיקול איכותי בלבד ואין להציג אותו כאחוז דיוק.",
  `תיאור הארוחה מהמשתמש: ${description}`,
].join("\n");

export async function POST(request: Request) {
  const startedAt = Date.now();
  if (!isAiMealAnalysisEnabled()) return Response.json({ error: "feature_disabled" }, { status: 404 });
  const auth = await getAuthContext();
  if (!auth || auth.role !== "client") return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!canUseAiMealAnalysis(auth.id)) return Response.json({ error: "feature_unavailable" }, { status: 404 });
  const [minuteAllowed, dailyAllowed] = await Promise.all([
    consumeRateLimit({ action: "food_ai_minute", subject: auth.id, windowSeconds: 60, limit: 5 }),
    consumeRateLimit({ action: "food_ai_day", subject: auth.id, windowSeconds: 86_400, limit: 50 }),
  ]);
  if (!minuteAllowed || !dailyAllowed) return Response.json({ error: "rate_limited" }, { status: 429 });

  const form = await request.formData();
  const photo = form.get("photo");
  const description = String(form.get("description") ?? "").trim().slice(0, 200);
  if (!(photo instanceof File) || photo.size === 0) return Response.json({ error: "photo_required" }, { status: 400 });
  if (!description) return Response.json({ error: "description_required" }, { status: 400 });
  const photoProblem = validateFoodLogPhoto(photo);
  if (photoProblem || await detectImageFormat(photo) !== photo.type) return Response.json({ error: "invalid_photo", message: photoProblem }, { status: 400 });

  let gatewayToken = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!gatewayToken) {
    try { gatewayToken = await getVercelOidcToken(); }
    catch { return Response.json({ error: "analysis_unavailable" }, { status: 503 }); }
  }
  if (!gatewayToken) return Response.json({ error: "analysis_unavailable" }, { status: 503 });
  const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST", signal: controller.signal,
      headers: { Authorization: `Bearer ${gatewayToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: mealAnalysisModel, reasoning_effort: "none", stream: false,
        messages: [{ role: "user", content: [
          { type: "text", text: prompt(description) },
          { type: "image_url", image_url: { url: `data:${photo.type};base64,${base64}`, detail: "high" } },
        ] }],
        response_format: { type: "json_schema", json_schema: { name: "meal_analysis", strict: true, schema: MEAL_ANALYSIS_SCHEMA } },
      }),
    });
    if (!response.ok) {
      console.error("ai_meal_gateway_error", { status: response.status, durationMs: Date.now() - startedAt });
      return Response.json({ error: "analysis_failed" }, { status: 502 });
    }
    const result = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const content = result.choices?.[0]?.message?.content;
    const parsed = content ? parseMealAnalysis(JSON.parse(content)) : null;
    if (!parsed) return Response.json({ error: "invalid_analysis" }, { status: 502 });
    if (!parsed.containsFood) return Response.json({ error: "no_food", summary: parsed.summary }, { status: 422 });
    const supabase = await createSupabaseServerClient();
    const { data: rows, error } = await supabase.from("foods").select("id,name,calories,protein,carbs,fat,verification_status,notes");
    if (error) throw error;
    const foods: MatchableFood[] = (rows ?? []).map((row) => ({
      id: String(row.id), name: String(row.name), calories: row.calories == null ? null : Number(row.calories),
      protein: row.protein == null ? null : Number(row.protein), carbs: row.carbs == null ? null : Number(row.carbs), fat: row.fat == null ? null : Number(row.fat),
      verificationStatus: row.verification_status == null ? null : String(row.verification_status), notes: row.notes == null ? null : String(row.notes),
    }));
    const components = normalizeComponents(parsed.components, foods, parsed.groups);
    const analysisToken = signMealAnalysis({ userId: auth.id, expiresAt: Date.now() + 30 * 60_000, components });
    const usage = result.usage ?? {};
    const pricing = modelPricingUsdPerMillion[mealAnalysisModel as keyof typeof modelPricingUsdPerMillion];
    const estimatedCostUsd = pricing
      ? ((usage.prompt_tokens ?? 0) * pricing.input + (usage.completion_tokens ?? 0) * pricing.output) / 1_000_000
      : null;
    console.info("ai_meal_analysis", { model: mealAnalysisModel, durationMs: Date.now() - startedAt, components: components.length, promptTokens: usage.prompt_tokens ?? null, completionTokens: usage.completion_tokens ?? null, estimatedCostUsd: estimatedCostUsd == null ? null : Number(estimatedCostUsd.toFixed(6)) });
    return Response.json({ summary: parsed.summary, components, analysisToken });
  } catch (error) {
    console.error("ai_meal_analysis_failed", { durationMs: Date.now() - startedAt, error: error instanceof Error ? error.name : "unknown" });
    return Response.json({ error: "analysis_failed" }, { status: 502 });
  } finally { clearTimeout(timeout); }
}
