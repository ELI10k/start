import { getVercelOidcToken } from "@vercel/oidc";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { validateFoodLogPhoto } from "@/lib/nutrition/food-log";
import { detectImageFormat } from "@/lib/images/signature";
import { buildMealClarifications, MEAL_ANALYSIS_SCHEMA, normalizeComponents, parseMealAnalysis, type MatchableFood } from "@/lib/nutrition/meal-image-analysis";
import { signMealAnalysis } from "@/lib/nutrition/meal-analysis-signature";
import { AI_MEAL_DEFAULT_MODEL, canUseAiMealAnalysis, isAiMealAnalysisEnabled } from "@/lib/nutrition/ai-meal-feature";

export const maxDuration = 60;
const MAX_MEAL_PHOTOS = 3;
const MAX_MEAL_PHOTOS_TOTAL_BYTES = 3.5 * 1024 * 1024;
const mealAnalysisModel = process.env.AI_MEAL_MODEL?.trim() || AI_MEAL_DEFAULT_MODEL;
const modelPricingUsdPerMillion = {
  "openai/gpt-6-luna": { input: 0.1, output: 0.5 },
  "alibaba/qwen3.8-omni-flash": { input: 0.15, output: 0.47 },
} satisfies Record<string, { input: number; output: number }>;

const buildMealAnalysisPrompt = (description: string, photoCount: number) => [
  `נתח ${photoCount === 1 ? "תמונה אחת" : `${photoCount} תמונות`} של אותה ארוחה לצורך מעקב תזונתי משוער, לא מדידה רפואית.`,
  "תמונה 1 היא התמונה הכללית והסמכות לקביעת מספר המנות, מספר הפריטים והמשקל הכולל. תמונות 2 ו-3, אם צורפו, הן זוויות נוספות של אותה ארוחה ומשמשות רק לזיהוי מילוי, עובי, מרקם ואופן הכנה.",
  "אל תספור מזון, מנה או משקל יותר מפעם אחת כאשר אותו פריט מופיע בכמה תמונות. צור מלאי קנוני אחד של רכיבי הארוחה והשתמש באותו groupId לכל התצוגות של אותו פריט פיזי.",
  "אם תמונה נוספת מגלה מילוי או רכיב מוסתר, כלול אותו בתוך המשקל הכולל של קבוצת המזון. במאפה ממולא, סכום משקל הבצק והמילוי חייב להיות משקל המאפה כולו; אסור להחזיר גם את המאפה השלם וגם את המילוי כמשקלים מצטברים.",
  "התמונות הן המקור המרכזי והסמכות להערכת הנפח והמשקל. הטקסט נועד לזהות מזונות ואופן הכנה, ויכול לתקן זיהוי שגוי או לציין רכיב מוסתר, אך אינו הוכחה לכמות גדולה יותר.",
  "אל תגדיל את משקל הארוחה או רכיביה רק מפני שהטקסט מפרט יותר רכיבים. אל תנסה להתאים את התוצאה לערך קלורי קודם או ליעד כלשהו.",
  "החזר כל מזון כרכיב נפרד, עם משקל משוער בגרמים וערכי המנה כולה. ברירת המחדל לכל מזון שעל הצלחת היא משקל לאחר הכנה (as_served), אלא אם יש ראיה ברורה אחרת.",
  "הבחן במפורש בין מזון נא, מבושל, צלוי, אפוי ומטוגן. ערכי התזונה חייבים להתאים לאופן ההכנה ולמשקל לאחר הכנה.",
  "שים לב במיוחד למאכלים ישראליים: חומוס, פלאפל, שווארמה, פרגית, קוסקוס, פיתה, אורז ושניצל.",
  "כאשר כמה סלטים נמצאים יחד באותו אזור קטן, צור עבורם group אחד: הערך קודם את המשקל הכולל של הקבוצה מהתמונה, ואז חלק אותו בין רכיבי הסלט. סכום משקלי הרכיבים חייב להתאים למשקל הקבוצה.",
  "זהה שמן, מיונז, טחינה ורטבים לפי התמונה והטקסט. במזון מוכן כגון חצילים מטוגנים או גזר במיונז, כלול את השמן או המיונז פעם אחת בתוך הערכים של המזון וסמן nutritionIncludesAddedFat=true.",
  "אל תחזיר שמן, מיונז או רוטב כרכיב נפרד אם הם כבר כלולים בערכי המזון המוכן. רכיב כזה יכול להיות נפרד רק אם הוא תוספת נפרדת שנראית בתמונה; במקרה זה סמן standaloneVisibleAddition=true ושייך אותו לקבוצה נפרדת.",
  "אם כמות שמן, מיונז או רוטב אינה ידועה, השתמש בהערכה סבירה אחת, ציין את ההנחה וסמן confidence נמוך או בינוני. שאל clarification קצרה רק כאשר התשובה תשנה מהותית את ההערכה.",
  "החזר במערך clarifications רק שאלות בחירה קצרות שהתשובה עליהן עשויה לשנות מהותית קלוריות או מאקרו. אפשר להציע עד ארבע שאלות; השרת יציג לכל היותר שתיים.",
  "לפני יצירת שאלה, קרא את תיאור המשתמש. אל תשאל על סוג מזון, אופן הכנה, רוטב או רכיב שכבר נמסרו. לדוגמה, אם המשתמש כתב גם חציל מטוגן וגם חציל במיונז, אל תשאל איזה מהם קיים; אפשר לשאול רק כיצד המשקל הכולל מתחלק ביניהם.",
  "מבנה clarification שטוח: questionId, kind, groupId, question ושתי אפשרויות קבועות option1/option2. לכל אפשרות החזר רק Id, תווית קצרה, effect, שם מזון ואופן הכנה. אל תחזיר מערכי options, משקלים, אחוזים או ערכים תזונתיים בתוך clarification.",
  "בחר effect רק מתוך: keep_estimate לשמירת ההערכה; split_even לחלוקה שווה בין רכיבי הקבוצה; first_more כאשר הרכיב הראשון הוא בערך 70%; second_more כאשר האחרון הוא בערך 70%; catalog_food להחלפת הקבוצה במזון המזוהה; both כאשר שתי זהויות המזון שבאפשרויות קיימות יחד. השרת בלבד מחשב משקלים וערכים.",
  "ב-catalog_food מלא optionFoodName ו-optionPreparation. ב-both מלא שם מזון שונה בכל אחת משתי האפשרויות, כדי שהשרת יוכל לבנות את שני הרכיבים. בשאלת חלוקה אפשר להשתמש ב-split_even/first_more/second_more ולהשאיר שמות ריקים.",
  "לכל שאלה חייבות להיות בדיוק שתי אפשרויות קצרות ושונות. אין ליצור אפשרות 'לא בטוח'; הדילוג מוצג בממשק ואינו משנה את הניתוח.",
  "אם אין שאלה משמעותית או שהתיאור כבר ענה עליה, החזר clarifications ריק. אם structured clarification נוצרה, clarification של הרכיב הוא רק תיאור קצר של אי-הוודאות ולא שאלה נוספת.",
  "אל תמציא רכיבים שאינם בתמונה או בתיאור המשתמש.",
  "מים וקרח שהם חלק ממשקה שכבר חושב אינם רכיבים תזונתיים נפרדים. שייך אותם לאותה קבוצת משקה ואל תוסיף להם קלוריות או מאקרו. אל תשמיט חלב, סוכר, סירופ או אלכוהול.",
  "הערך את איכות התמונות בשדות imageQuality ו-needsCloserPhoto. אם המזון קטן בפריים, מרוחק, מטושטש או לא מאפשר הערכת משקל אמינה, החזר imageQuality=low ו-needsCloserPhoto=true, אך המשך בניתוח אם עדיין ניתן לזהות מזון.",
  "רק אם התמונות אינן מכילות מזון או אינן מאפשרות זיהוי כלל, החזר containsFood=false ומערכי groups ו-components ריקים.",
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
  const submittedPhotos = form.getAll("photos");
  const legacyPhoto = form.get("photo");
  const photos = (submittedPhotos.length ? submittedPhotos : legacyPhoto == null ? [] : [legacyPhoto]).filter((value): value is File => value instanceof File && value.size > 0);
  const description = String(form.get("description") ?? "").trim().slice(0, 200);
  if (!photos.length) return Response.json({ error: "photo_required" }, { status: 400 });
  if (photos.length > MAX_MEAL_PHOTOS) return Response.json({ error: "too_many_photos" }, { status: 400 });
  if (photos.reduce((sum, photo) => sum + photo.size, 0) > MAX_MEAL_PHOTOS_TOTAL_BYTES) return Response.json({ error: "photos_too_large" }, { status: 413 });
  if (!description) return Response.json({ error: "description_required" }, { status: 400 });
  for (const photo of photos) {
    const photoProblem = validateFoodLogPhoto(photo);
    if (photoProblem || await detectImageFormat(photo) !== photo.type) return Response.json({ error: "invalid_photo", message: photoProblem }, { status: 400 });
  }

  let gatewayToken = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!gatewayToken) {
    try { gatewayToken = await getVercelOidcToken(); }
    catch { return Response.json({ error: "analysis_unavailable" }, { status: 503 }); }
  }
  if (!gatewayToken) return Response.json({ error: "analysis_unavailable" }, { status: 503 });
  const encodedPhotos = await Promise.all(photos.map(async (photo) => ({ type: photo.type, base64: Buffer.from(await photo.arrayBuffer()).toString("base64") })));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), photos.length === 1 ? 30_000 : 50_000);
  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST", signal: controller.signal,
      headers: { Authorization: `Bearer ${gatewayToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: mealAnalysisModel, reasoning_effort: "none", stream: false,
        messages: [{ role: "user", content: [
          { type: "text", text: buildMealAnalysisPrompt(description, photos.length) },
          ...encodedPhotos.flatMap((photo, index) => [
            { type: "text" as const, text: index === 0 ? "תמונה 1 — תמונה כללית של הארוחה" : `תמונה ${index + 1} — צילום קרוב, חתך או זווית נוספת של אותה ארוחה` },
            { type: "image_url" as const, image_url: { url: `data:${photo.type};base64,${photo.base64}`, detail: "high" } },
          ]),
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
    const { data: rows, error } = await supabase.from("foods").select("id,name,calories,protein,carbs,fat,verification_status,notes").eq("catalogue_visible", true);
    if (error) throw error;
    const foods: MatchableFood[] = (rows ?? []).map((row) => ({
      id: String(row.id), name: String(row.name), calories: row.calories == null ? null : Number(row.calories),
      protein: row.protein == null ? null : Number(row.protein), carbs: row.carbs == null ? null : Number(row.carbs), fat: row.fat == null ? null : Number(row.fat),
      verificationStatus: row.verification_status == null ? null : String(row.verification_status), notes: row.notes == null ? null : String(row.notes),
    }));
    const normalizedComponents = normalizeComponents(parsed.components, foods, parsed.groups);
    const clarifications = buildMealClarifications(parsed.clarifications, description, normalizedComponents, foods, parsed.groups);
    const targetKeys = new Set(clarifications.flatMap((question) => question.targetComponentKeys));
    const discardedGroups = new Set(parsed.discardedClarificationGroupIds);
    const malformedQuestionNote = "קיימת אי־ודאות שעשויה להשפיע על ההערכה; אפשר לתקן את המזון או הכמות ידנית.";
    const components = normalizedComponents.map((component) => {
      if (targetKeys.has(component.componentKey ?? "")) return { ...component, clarification: null };
      if (component.groupId && discardedGroups.has(component.groupId) && !component.clarification) return { ...component, clarification: malformedQuestionNote };
      return component;
    });
    const alternativeComponents = clarifications.flatMap((question) => question.options.flatMap((option) => option.replacements));
    const allowedComponents = [...components, ...alternativeComponents];
    const selectionGroups = clarifications.map((question) => ({
      id: question.id,
      variants: [question.targetComponentKeys, ...question.options.map((option) => option.replacements.map((component) => component.componentKey!))],
    }));
    const analysisToken = signMealAnalysis({ userId: auth.id, expiresAt: Date.now() + 30 * 60_000, components, allowedComponents, selectionGroups });
    const usage = result.usage ?? {};
    const pricing = modelPricingUsdPerMillion[mealAnalysisModel as keyof typeof modelPricingUsdPerMillion];
    const estimatedCostUsd = pricing
      ? ((usage.prompt_tokens ?? 0) * pricing.input + (usage.completion_tokens ?? 0) * pricing.output) / 1_000_000
      : null;
    console.info("ai_meal_analysis", { model: mealAnalysisModel, durationMs: Date.now() - startedAt, photoCount: photos.length, components: components.length, promptTokens: usage.prompt_tokens ?? null, completionTokens: usage.completion_tokens ?? null, estimatedCostUsd: estimatedCostUsd == null ? null : Number(estimatedCostUsd.toFixed(6)) });
    const imageQualityWarning = parsed.needsCloserPhoto || parsed.imageQuality === "low"
      ? "התמונות מרוחקות או לא ברורות מספיק, ולכן הערכת המשקל פחות אמינה. מומלץ להוסיף צילום מקרוב בניתוח הבא."
      : null;
    return Response.json({ summary: parsed.summary, imageQualityWarning, components, clarifications, analysisToken });
  } catch (error) {
    console.error("ai_meal_analysis_failed", { durationMs: Date.now() - startedAt, error: error instanceof Error ? error.name : "unknown" });
    return Response.json({ error: "analysis_failed" }, { status: 502 });
  } finally { clearTimeout(timeout); }
}
