import type { MacroValues } from "@/lib/meal-plans/types";

export type AiConfidence = "high" | "medium" | "low";
export type MealWeightBasis = "as_served" | "raw" | "unknown";

export type RawMealGroup = Readonly<{
  id: string;
  name: string;
  estimatedGrams: number;
}>;

export type RawMealComponent = Readonly<{
  name: string;
  preparation: string;
  weightBasis: MealWeightBasis;
  groupId: string;
  estimatedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nutritionIncludesAddedFat: boolean;
  standaloneVisibleAddition: boolean;
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
  verificationStatus?: string | null;
  source?: string | null;
  notes?: string | null;
}>;

const LIMITS = { calories: 900, protein: 100, carbs: 100, fat: 100 } as const;
const round = (value: number) => Math.round(value * 10) / 10;
const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0591-\u05C7]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();

const textField = { type: "string", minLength: 1, maxLength: 100 } as const;

export const MEAL_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["containsFood", "groups", "components", "summary"],
  properties: {
    containsFood: { type: "boolean" },
    summary: { type: "string", maxLength: 200 },
    groups: {
      type: "array", minItems: 0, maxItems: 20,
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "name", "estimatedGrams"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 40 },
          name: textField,
          estimatedGrams: { type: "number", exclusiveMinimum: 0, maximum: 3000 },
        },
      },
    },
    components: {
      type: "array", minItems: 0, maxItems: 20,
      items: {
        type: "object", additionalProperties: false,
        required: ["name", "preparation", "weightBasis", "groupId", "estimatedGrams", "calories", "protein", "carbs", "fat", "nutritionIncludesAddedFat", "standaloneVisibleAddition", "confidence", "assumptions", "clarification"],
        properties: {
          name: textField,
          preparation: { type: "string", minLength: 1, maxLength: 80 },
          weightBasis: { type: "string", enum: ["as_served", "raw", "unknown"] },
          groupId: { type: "string", minLength: 1, maxLength: 40 },
          estimatedGrams: { type: "number", exclusiveMinimum: 0, maximum: 3000 },
          calories: { type: "number", minimum: 0, maximum: 5000 },
          protein: { type: "number", minimum: 0, maximum: 500 },
          carbs: { type: "number", minimum: 0, maximum: 1000 },
          fat: { type: "number", minimum: 0, maximum: 500 },
          nutritionIncludesAddedFat: { type: "boolean" },
          standaloneVisibleAddition: { type: "boolean" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          assumptions: { type: "array", maxItems: 5, items: { type: "string", maxLength: 160 } },
          clarification: { anyOf: [{ type: "string", maxLength: 160 }, { type: "null" }] },
        },
      },
    },
  },
} as const;

export function parseMealAnalysis(value: unknown): { containsFood: boolean; summary: string; groups: RawMealGroup[]; components: RawMealComponent[] } | null {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;
  if (typeof root.containsFood !== "boolean" || typeof root.summary !== "string" || !Array.isArray(root.groups) || root.groups.length > 20 || !Array.isArray(root.components) || root.components.length > 20) return null;
  const groups: RawMealGroup[] = [];
  const groupIds = new Set<string>();
  for (const raw of root.groups) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const id = String(item.id ?? "").trim().slice(0, 40);
    const name = String(item.name ?? "").trim().slice(0, 100);
    const estimatedGrams = Number(item.estimatedGrams);
    if (!id || !name || groupIds.has(id) || !Number.isFinite(estimatedGrams) || estimatedGrams <= 0 || estimatedGrams > 3000) return null;
    groupIds.add(id);
    groups.push({ id, name, estimatedGrams: round(estimatedGrams) });
  }
  const components: RawMealComponent[] = [];
  for (const raw of root.components) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const name = String(item.name ?? "").trim().slice(0, 100);
    const preparation = String(item.preparation ?? "").trim().slice(0, 80);
    const weightBasis = item.weightBasis;
    const groupId = String(item.groupId ?? "").trim().slice(0, 40);
    const numbers = [item.estimatedGrams, item.calories, item.protein, item.carbs, item.fat].map(Number);
    const [grams, calories, protein, carbs, fat] = numbers;
    const confidence = item.confidence;
    if (!name || !preparation || !groupIds.has(groupId) || !(["as_served", "raw", "unknown"] as const).includes(weightBasis as MealWeightBasis) || !numbers.every(Number.isFinite) || grams <= 0 || grams > 3000 || calories < 0 || calories > 5000 || protein < 0 || protein > 500 || carbs < 0 || carbs > 1000 || fat < 0 || fat > 500) return null;
    if (typeof item.nutritionIncludesAddedFat !== "boolean" || typeof item.standaloneVisibleAddition !== "boolean") return null;
    if (!(["high", "medium", "low"] as const).includes(confidence as AiConfidence)) return null;
    const assumptions = Array.isArray(item.assumptions) ? item.assumptions.map(String).map((text) => text.trim().slice(0, 160)).filter(Boolean).slice(0, 5) : [];
    const clarification = item.clarification == null ? null : String(item.clarification).trim().slice(0, 160) || null;
    components.push({ name, preparation, weightBasis: weightBasis as MealWeightBasis, groupId, estimatedGrams: round(grams), calories: round(calories), protein: round(protein), carbs: round(carbs), fat: round(fat), nutritionIncludesAddedFat: item.nutritionIncludesAddedFat, standaloneVisibleAddition: item.standaloneVisibleAddition, confidence: confidence as AiConfidence, assumptions, clarification });
  }
  if (root.containsFood !== (components.length > 0) || root.containsFood !== (groups.length > 0)) return null;
  return { containsFood: root.containsFood, summary: root.summary.trim().slice(0, 200), groups, components };
}

const PREPARATION_TERMS = {
  raw: ["נא", "נאה", "לפני בישול"],
  cooked: ["מבושל", "מבושלת", "בישול"],
  grilled: ["צלוי", "צלויה", "גריל", "על האש"],
  fried: ["מטוגן", "מטוגנת", "טיגון"],
  baked: ["אפוי", "אפויה", "אפייה"],
  mayo: ["מיונז"],
  sauce: ["רוטב"],
} as const;
type PreparationKey = keyof typeof PREPARATION_TERMS;
const preparationKeys = (value: string) => new Set<PreparationKey>((Object.entries(PREPARATION_TERMS) as Array<[PreparationKey, readonly string[]]>).filter(([, terms]) => terms.some((term) => normalize(value).includes(normalize(term)))).map(([key]) => key));
const withoutPreparation = (value: string) => {
  const terms = Object.values(PREPARATION_TERMS).flat().map(normalize);
  return normalize(value).split(" ").filter((token) => !terms.some((term) => token.includes(term) || term.includes(token))).join(" ");
};
const isTrustedFood = (food: MatchableFood) => {
  if (food.verificationStatus === undefined && food.notes === undefined) return true;
  return normalize(food.verificationStatus ?? "") === normalize("מאושר") || normalize(food.notes ?? "").includes(normalize("מאכל מאסטר"));
};
const preparationCompatible = (wanted: string, food: MatchableFood) => {
  const requested = preparationKeys(wanted);
  const candidateText = `${food.name} ${food.notes ?? ""}`;
  const candidate = preparationKeys(candidateText);
  const candidateIsPreparedMaster = normalize(food.notes ?? "").includes(normalize("לאחר הכנה"));
  if (requested.has("raw")) return candidate.has("raw");
  if (candidate.has("raw")) return false;
  if (requested.has("fried") || requested.has("mayo") || requested.has("sauce"))
    return [...requested].filter((key) => key === "fried" || key === "mayo" || key === "sauce").every((key) => candidate.has(key));
  const cooking = (["cooked", "grilled", "baked"] as const).filter((key) => requested.has(key));
  if (!cooking.length) return true;
  return cooking.some((key) => candidate.has(key)) || candidateIsPreparedMaster;
};

export function matchFood(name: string, foods: readonly MatchableFood[], preparation = ""): MatchableFood | null {
  const wanted = normalize(name);
  if (!wanted) return null;
  const eligible = foods.filter(isTrustedFood).filter((food) => preparationCompatible(`${name} ${preparation}`, food));
  const exact = eligible.filter((food) => normalize(food.name) === wanted);
  if (exact.length === 1) return exact[0];
  const wantedTokens = new Set(withoutPreparation(name).split(" ").filter((token) => token.length > 1));
  let best: { food: MatchableFood; score: number } | null = null;
  let second = 0;
  for (const food of eligible) {
    const candidate = withoutPreparation(food.name);
    const tokens = new Set(candidate.split(" ").filter((token) => token.length > 1));
    const intersection = [...wantedTokens].filter((token) => tokens.has(token)).length;
    const union = new Set([...wantedTokens, ...tokens]).size;
    const score = union ? intersection / union : 0;
    if (!best || score > best.score) { second = best?.score ?? 0; best = { food, score }; }
    else if (score > second) second = score;
  }
  return best && best.score >= 0.8 && best.score - second >= 0.15 ? best.food : null;
}

const isStandaloneFatOrSauce = (name: string) => {
  const value = normalize(name);
  const tokens = value.split(" ");
  return tokens.length <= 3 && ["שמן", "מיונז", "רוטב"].some((term) => tokens.includes(term));
};

export function normalizeComponents(raw: readonly RawMealComponent[], foods: readonly MatchableFood[], groups: readonly RawMealGroup[]): MealAnalysisComponent[] {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const groupsWithIncludedFat = new Set(raw.filter((item) => !isStandaloneFatOrSauce(item.name) && item.nutritionIncludesAddedFat).map((item) => item.groupId));
  const kept = raw.filter((item) => {
    if (!isStandaloneFatOrSauce(item.name)) return true;
    return item.standaloneVisibleAddition && !groupsWithIncludedFat.has(item.groupId);
  });
  const indicesByGroup = new Map<string, number[]>();
  for (const [index, item] of kept.entries()) indicesByGroup.set(item.groupId, [...(indicesByGroup.get(item.groupId) ?? []), index]);
  const allocatedGrams = new Array<number>(kept.length);
  for (const [groupId, indices] of indicesByGroup) {
    const group = groupById.get(groupId);
    if (!group) throw new Error("invalid_component_group");
    const componentTotal = indices.reduce((sum, index) => sum + kept[index].estimatedGrams, 0);
    if (componentTotal <= 0) throw new Error("invalid_component_group_weight");
    let assigned = 0;
    indices.forEach((index, position) => {
      const grams = position === indices.length - 1
        ? round(group.estimatedGrams - assigned)
        : Math.floor(kept[index].estimatedGrams * group.estimatedGrams / componentTotal * 10) / 10;
      if (grams <= 0) throw new Error("invalid_component_group_weight");
      allocatedGrams[index] = grams;
      assigned = round(assigned + grams);
    });
  }
  return kept.map((item, index) => {
    const group = groupById.get(item.groupId);
    if (!group) throw new Error("invalid_component_group");
    const grams = allocatedGrams[index];
    const match = matchFood(item.name, foods, item.preparation);
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
    const assumptions = [...item.assumptions];
    if (item.weightBasis !== "as_served") assumptions.push(item.weightBasis === "raw" ? "המשקל סומן כמשקל לפני הכנה" : "בסיס המשקל אינו ודאי");
    return { index, name: match?.name ?? item.name, grams, per100, foodId: match?.id ?? null, source: match ? "catalog" as const : "ai_estimate" as const, confidence: item.confidence, assumptions: assumptions.slice(0, 5), clarification: item.clarification };
  });
}
