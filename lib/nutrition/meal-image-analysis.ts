import type { MacroValues } from "@/lib/meal-plans/types";

export type AiConfidence = "high" | "medium" | "low";

export type RawMealComponent = Readonly<{
  name: string;
  estimatedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: AiConfidence;
  assumptions: readonly string[];
  clarification: string | null;
}>;

export type MealAnalysisComponent = Readonly<{
  index: number;
  name: string;
  grams: number;
  per100: MacroValues;
  foodId: string | null;
  source: "catalog" | "ai_estimate";
  confidence: AiConfidence;
  assumptions: readonly string[];
  clarification: string | null;
}>;

export type MatchableFood = Readonly<{
  id: string;
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}>;

const LIMITS = { calories: 900, protein: 100, carbs: 100, fat: 100 } as const;
const round = (value: number) => Math.round(value * 10) / 10;
const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0591-\u05C7]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();

export const MEAL_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["containsFood", "components", "summary"],
  properties: {
    containsFood: { type: "boolean" },
    summary: { type: "string", maxLength: 200 },
    components: {
      type: "array", minItems: 0, maxItems: 20,
      items: {
        type: "object", additionalProperties: false,
        required: ["name", "estimatedGrams", "calories", "protein", "carbs", "fat", "confidence", "assumptions", "clarification"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          estimatedGrams: { type: "number", exclusiveMinimum: 0, maximum: 3000 },
          calories: { type: "number", minimum: 0, maximum: 5000 },
          protein: { type: "number", minimum: 0, maximum: 500 },
          carbs: { type: "number", minimum: 0, maximum: 1000 },
          fat: { type: "number", minimum: 0, maximum: 500 },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          assumptions: { type: "array", maxItems: 5, items: { type: "string", maxLength: 160 } },
          clarification: { anyOf: [{ type: "string", maxLength: 160 }, { type: "null" }] },
        },
      },
    },
  },
} as const;

export function parseMealAnalysis(value: unknown): { containsFood: boolean; summary: string; components: RawMealComponent[] } | null {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;
  if (typeof root.containsFood !== "boolean" || typeof root.summary !== "string" || !Array.isArray(root.components) || root.components.length > 20) return null;
  const components: RawMealComponent[] = [];
  for (const raw of root.components) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const name = String(item.name ?? "").trim().slice(0, 100);
    const numbers = [item.estimatedGrams, item.calories, item.protein, item.carbs, item.fat].map(Number);
    const [grams, calories, protein, carbs, fat] = numbers;
    const confidence = item.confidence;
    if (!name || !numbers.every(Number.isFinite) || grams <= 0 || grams > 3000 || calories < 0 || calories > 5000 || protein < 0 || protein > 500 || carbs < 0 || carbs > 1000 || fat < 0 || fat > 500) return null;
    if (!(["high", "medium", "low"] as const).includes(confidence as AiConfidence)) return null;
    const assumptions = Array.isArray(item.assumptions) ? item.assumptions.map(String).map((text) => text.trim().slice(0, 160)).filter(Boolean).slice(0, 5) : [];
    const clarification = item.clarification == null ? null : String(item.clarification).trim().slice(0, 160) || null;
    components.push({ name, estimatedGrams: round(grams), calories: round(calories), protein: round(protein), carbs: round(carbs), fat: round(fat), confidence: confidence as AiConfidence, assumptions, clarification });
  }
  if (root.containsFood !== (components.length > 0)) return null;
  return { containsFood: root.containsFood, summary: root.summary.trim().slice(0, 200), components };
}

export function matchFood(name: string, foods: readonly MatchableFood[]): MatchableFood | null {
  const wanted = normalize(name);
  if (!wanted) return null;
  const exact = foods.filter((food) => normalize(food.name) === wanted);
  if (exact.length === 1) return exact[0];
  const wantedTokens = new Set(wanted.split(" ").filter((token) => token.length > 1));
  let best: { food: MatchableFood; score: number } | null = null;
  let second = 0;
  for (const food of foods) {
    const candidate = normalize(food.name);
    const tokens = new Set(candidate.split(" ").filter((token) => token.length > 1));
    const intersection = [...wantedTokens].filter((token) => tokens.has(token)).length;
    const union = new Set([...wantedTokens, ...tokens]).size;
    const score = union ? intersection / union : 0;
    if (!best || score > best.score) { second = best?.score ?? 0; best = { food, score }; }
    else if (score > second) second = score;
  }
  return best && best.score >= 0.8 && best.score - second >= 0.15 ? best.food : null;
}

export function normalizeComponents(raw: readonly RawMealComponent[], foods: readonly MatchableFood[]): MealAnalysisComponent[] {
  return raw.map((item, index) => {
    const match = matchFood(item.name, foods);
    const factor = 100 / item.estimatedGrams;
    const aiPer100 = {
      calories: round(item.calories * factor), protein: round(item.protein * factor),
      carbs: round(item.carbs * factor), fat: round(item.fat * factor),
    };
    const catalogPer100 = match ? {
      calories: Number(match.calories ?? 0), protein: Number(match.protein ?? 0),
      carbs: Number(match.carbs ?? 0), fat: Number(match.fat ?? 0),
    } : null;
    const per100 = catalogPer100 ?? aiPer100;
    if (per100.calories < 0 || per100.calories > LIMITS.calories || per100.protein < 0 || per100.protein > LIMITS.protein || per100.carbs < 0 || per100.carbs > LIMITS.carbs || per100.fat < 0 || per100.fat > LIMITS.fat)
      throw new Error("invalid_component_nutrition");
    return { index, name: match?.name ?? item.name, grams: item.estimatedGrams, per100, foodId: match?.id ?? null, source: match ? "catalog" as const : "ai_estimate" as const, confidence: item.confidence, assumptions: item.assumptions, clarification: item.clarification };
  });
}
