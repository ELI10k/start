import { getVercelOidcToken } from "@vercel/oidc";

export type EstimatedNutrition = Readonly<{
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}>;

type EstimateInput = Readonly<{ description?: string; photo?: File }>;
const LIMITS = { calories: 5000, protein: 500, carbs: 1000, fat: 500 } as const;
/** What the estimator may spend in total, across every model it tries. */
const ESTIMATE_BUDGET_MS = 30_000;
/** And what any single attempt may spend of it. */
const ESTIMATE_ATTEMPT_MS = 15_000;
const rounded = (value: number) => Math.round(value * 10) / 10;

/** Parse and constrain model output before any of it can reach the food log. */
export function parseNutritionEstimate(raw: string): EstimatedNutrition | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const value = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const name = String(value.name ?? "").trim().slice(0, 200);
    const calories = Number(value.calories);
    const protein = Number(value.protein);
    const carbs = Number(value.carbs);
    const fat = Number(value.fat);
    if (!name || ![calories, protein, carbs, fat].every(Number.isFinite)) return null;
    if (calories <= 0 || calories > LIMITS.calories) return null;
    if (protein < 0 || protein > LIMITS.protein || carbs < 0 || carbs > LIMITS.carbs || fat < 0 || fat > LIMITS.fat) return null;
    const macroCalories = protein * 4 + carbs * 4 + fat * 9;
    if (macroCalories > 0 && (calories < macroCalories * 0.55 || calories > macroCalories * 1.8)) return null;
    return { name, calories: rounded(calories), protein: rounded(protein), carbs: rounded(carbs), fat: rounded(fat) };
  } catch {
    return null;
  }
}

const estimatePrompt = (description: string) => [
  "אתה מעריך תזונה לארוחה שהלקוח כבר אכל.",
  "זהה את כל המזונות ואת הכמות הסבירה בתמונה ו/או בתיאור, והחזר הערכה לכל המנה יחד.",
  "אל תחזיר טווח ואל תחזיר ערכים ל-100 גרם. אם חסרה כמות, השתמש במנה ביתית סבירה.",
  "החזר JSON בלבד: {\"name\":\"תיאור קצר בעברית\",\"calories\":number,\"protein\":number,\"carbs\":number,\"fat\":number}.",
  "calories הן קקאל וכל המאקרו בגרמים.",
  description ? `תיאור הלקוח: ${description}` : "לא נכתב תיאור; הסתמך על התמונה.",
].join("\n");

/** Uses Vercel's deployment OIDC token, so production needs no browser secret. */
export async function estimateFoodNutrition({ description = "", photo }: EstimateInput): Promise<EstimatedNutrition | null> {
  // A deployment OIDC token is short-lived. Reading the environment variable
  // directly left long-running/local sessions using an expired token and the AI
  // Gateway answered 401. The official helper returns the current token and
  // refreshes it in development; an explicit Gateway key still takes priority.
  let token = process.env.AI_GATEWAY_API_KEY;
  if (!token) {
    try {
      token = await getVercelOidcToken();
    } catch (error) {
      console.error("food_estimator_oidc_error", { error: error instanceof Error ? error.message : "unknown" });
      return null;
    }
  }
  if (!token) return null;
  const content: Array<Record<string, unknown>> = [{ type: "text", text: estimatePrompt(description.trim().slice(0, 200)) }];
  if (photo) {
    const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
    content.push({ type: "image_url", image_url: { url: `data:${photo.type};base64,${base64}`, detail: "high" } });
  }
  // Reasoning models may reject temperature, and an individual provider can
  // occasionally be unavailable. Keep the payload portable and retry once on
  // another vision-capable model before telling the client the estimate failed.
  // One budget for the whole attempt, not one per model.
  //
  // Three models at forty seconds each is two minutes, and the function this
  // runs inside is not given two minutes: the platform kills it first, so the
  // client saw a failed save instead of the unmeasured row this is written to
  // fall back to. The deadline below is what the estimator is allowed to spend
  // in total, and each attempt gets whatever is left of it - so a first model
  // that hangs costs the fallbacks their turn rather than costing the save.
  const deadline=Date.now()+ESTIMATE_BUDGET_MS;
  for(const model of["openai/gpt-5.4","openai/gpt-5-mini","openai/gpt-5.4-mini"]){
    const remaining=deadline-Date.now();
    // Under two seconds is not enough for a vision call to come back; spending
    // it means answering later with the same nothing.
    if(remaining<2_000)break;
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),Math.min(ESTIMATE_ATTEMPT_MS,remaining));
    try{
      const response=await fetch("https://ai-gateway.vercel.sh/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({model,messages:[{role:"user",content}],response_format:{type:"json_object"},stream:false}),signal:controller.signal});
      if(!response.ok){console.error("food_estimator_gateway_error",{model,status:response.status,body:(await response.text()).slice(0,500)});continue}
      const payload=await response.json()as{choices?:Array<{message?:{content?:string}}>};const estimate=parseNutritionEstimate(payload.choices?.[0]?.message?.content??"");
      if(estimate)return estimate;
      console.error("food_estimator_invalid_response",{model});
    }catch(error){console.error("food_estimator_request_failed",{model,error:error instanceof Error?error.name:"unknown"})}finally{clearTimeout(timeout)}
  }
  return null;
}
