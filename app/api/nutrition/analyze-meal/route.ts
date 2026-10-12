import { getVercelOidcToken } from "@vercel/oidc";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { validateFoodLogPhoto } from "@/lib/nutrition/food-log";
import { detectImageFormat } from "@/lib/images/signature";
import { MEAL_ANALYSIS_SCHEMA, normalizeComponents, parseMealAnalysis, type MatchableFood } from "@/lib/nutrition/meal-image-analysis";
import { signMealAnalysis } from "@/lib/nutrition/meal-analysis-signature";

export const maxDuration = 60;
const mealAnalysisModel = process.env.AI_MEAL_MODEL?.trim() || "openai/gpt-6-luna";
const modelPricingUsdPerMillion = {
  "openai/gpt-6-luna": { input: 0.1, output: 0.5 },
  "alibaba/qwen3.8-omni-flash": { input: 0.15, output: 0.47 },
} satisfies Record<string, { input: number; output: number }>;

const prompt = (description: string) => [
  "נתח תמונה של ארוחה לצורך מעקב תזונתי משוער, לא מדידה רפואית.",
  "החזר כל מזון כרכיב נפרד, עם משקל משוער בגרמים וערכי המנה כולה.",
  "שים לב במיוחד למאכלים ישראליים: חומוס, פלאפל, שווארמה, פרגית, קוסקוס, פיתה, אורז ושניצל.",
  "זהה שמן, טחינה, רטבים ותוספות כאשר הם נראים. אל תמציא רכיב מוסתר; ציין הנחה ושאל clarification קצרה רק כשהיא משנה מהותית את ההערכה.",
  "אם התמונה מטושטשת מדי או אינה מכילה מזון, החזר containsFood=false ומערך ריק.",
  "confidence הוא שיקול איכותי בלבד ואין להציג אותו כאחוז דיוק.",
  description ? `מידע נוסף מהמשתמש: ${description}` : "לא נמסר מידע נוסף.",
].join("\n");

export async function POST(request: Request) {
  const startedAt = Date.now();
  const auth = await getAuthContext();
  if (!auth || auth.role !== "client") return Response.json({ error: "unauthorized" }, { status: 401 });
  const [minuteAllowed, dailyAllowed] = await Promise.all([
    consumeRateLimit({ action: "food_ai_minute", subject: auth.id, windowSeconds: 60, limit: 5 }),
    consumeRateLimit({ action: "food_ai_day", subject: auth.id, windowSeconds: 86_400, limit: 50 }),
  ]);
  if (!minuteAllowed || !dailyAllowed) return Response.json({ error: "rate_limited" }, { status: 429 });

  const form = await request.formData();
  const photo = form.get("photo");
  const description = String(form.get("description") ?? "").trim().slice(0, 200);
  if (!(photo instanceof File) || photo.size === 0) return Response.json({ error: "photo_required" }, { status: 400 });
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
    const { data: rows, error } = await supabase.from("foods").select("id,name,calories,protein,carbs,fat");
    if (error) throw error;
    const foods: MatchableFood[] = (rows ?? []).map((row) => ({
      id: String(row.id), name: String(row.name), calories: row.calories == null ? null : Number(row.calories),
      protein: row.protein == null ? null : Number(row.protein), carbs: row.carbs == null ? null : Number(row.carbs), fat: row.fat == null ? null : Number(row.fat),
    }));
    const components = normalizeComponents(parsed.components, foods);
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
