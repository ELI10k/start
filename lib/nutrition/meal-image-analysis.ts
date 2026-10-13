import type { MacroValues } from "@/lib/meal-plans/types";

export type AiConfidence = "high" | "medium" | "low";
export type MealImageQuality = "high" | "medium" | "low";
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

export type MealClarificationKind = "group_split" | "component_identity" | "preparation" | "sauce_amount";

export type MealClarificationEffect = "keep_estimate" | "split_even" | "first_more" | "second_more" | "catalog_food" | "both";

export type RawClarificationOption = Readonly<{
  id: string;
  label: string;
  effect: MealClarificationEffect;
  foodName: string;
  preparation: string;
}>;

export type RawMealClarification = Readonly<{
  id: string;
  kind: MealClarificationKind;
  groupId: string;
  question: string;
  options: readonly [RawClarificationOption, RawClarificationOption];
}>;

export type ParsedMealAnalysis = Readonly<{
  containsFood: boolean;
  summary: string;
  imageQuality: MealImageQuality;
  needsCloserPhoto: boolean;
  groups: RawMealGroup[];
  components: RawMealComponent[];
  clarifications: RawMealClarification[];
  discardedClarificationGroupIds: string[];
}>;

export type MealAnalysisComponent = Readonly<{
  index: number;
  componentKey?: string;
  groupId?: string;
  name: string;
  grams: number;
  per100: MacroValues;
  foodId: string | null;
  source: "catalog" | "ai_estimate";
  confidence: AiConfidence;
  assumptions: readonly string[];
  clarification: string | null;
}>;

export type MealClarificationOption = Readonly<{
  id: string;
  label: string;
  replacements: readonly MealAnalysisComponent[];
}>;

export type MealClarification = Readonly<{
  id: string;
  kind: MealClarificationKind;
  question: string;
  targetComponentKeys: readonly string[];
  options: readonly MealClarificationOption[];
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
const optionalTextField = { type: "string", maxLength: 100 } as const;
const clarificationEffect = { type: "string", enum: ["keep_estimate", "split_even", "first_more", "second_more", "catalog_food", "both"] } as const;

export const MEAL_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["containsFood", "groups", "components", "clarifications", "summary", "imageQuality", "needsCloserPhoto"],
  properties: {
    containsFood: { type: "boolean" },
    summary: { type: "string", maxLength: 200 },
    imageQuality: { type: "string", enum: ["high", "medium", "low"] },
    needsCloserPhoto: { type: "boolean" },
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
    clarifications: {
      type: "array", minItems: 0, maxItems: 4,
      items: {
        type: "object", additionalProperties: false,
        required: ["questionId", "kind", "groupId", "question", "option1Id", "option1Label", "option1Effect", "option1FoodName", "option1Preparation", "option2Id", "option2Label", "option2Effect", "option2FoodName", "option2Preparation"],
        properties: {
          questionId: { type: "string", minLength: 1, maxLength: 40 },
          kind: { type: "string", enum: ["group_split", "component_identity", "preparation", "sauce_amount"] },
          groupId: { type: "string", minLength: 1, maxLength: 40 },
          question: { type: "string", minLength: 1, maxLength: 160 },
          option1Id: { type: "string", minLength: 1, maxLength: 40 },
          option1Label: { type: "string", minLength: 1, maxLength: 60 },
          option1Effect: clarificationEffect,
          option1FoodName: optionalTextField,
          option1Preparation: { type: "string", maxLength: 80 },
          option2Id: { type: "string", minLength: 1, maxLength: 40 },
          option2Label: { type: "string", minLength: 1, maxLength: 60 },
          option2Effect: clarificationEffect,
          option2FoodName: optionalTextField,
          option2Preparation: { type: "string", maxLength: 80 },
        },
      },
    },
  },
} as const;

export function parseMealAnalysis(value: unknown): ParsedMealAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;
  if (typeof root.containsFood !== "boolean" || typeof root.summary !== "string" || !Array.isArray(root.groups) || root.groups.length > 20 || !Array.isArray(root.components) || root.components.length > 20) return null;
  const imageQuality = (["high", "medium", "low"] as const).includes(root.imageQuality as MealImageQuality) ? root.imageQuality as MealImageQuality : "medium";
  const needsCloserPhoto = typeof root.needsCloserPhoto === "boolean" ? root.needsCloserPhoto : false;
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
  const clarifications: RawMealClarification[] = [];
  const discardedClarificationGroupIds = new Set<string>();
  const clarificationIds = new Set<string>();
  const rawClarifications = Array.isArray(root.clarifications) ? root.clarifications.slice(0, 4) : [];
  for (const raw of rawClarifications) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const id = String(item.questionId ?? "").trim().slice(0, 40);
    const kind = item.kind;
    const groupId = String(item.groupId ?? "").trim().slice(0, 40);
    const question = String(item.question ?? "").trim().slice(0, 160);
    const effects = [item.option1Effect, item.option2Effect];
    const optionIds = [item.option1Id, item.option2Id].map((value) => String(value ?? "").trim().slice(0, 40));
    const labels = [item.option1Label, item.option2Label].map((value) => String(value ?? "").trim().slice(0, 60));
    const effectValues = ["keep_estimate", "split_even", "first_more", "second_more", "catalog_food", "both"] as const;
    const invalid = !id || clarificationIds.has(id) || !groupIds.has(groupId) || !question
      || !(["group_split", "component_identity", "preparation", "sauce_amount"] as const).includes(kind as MealClarificationKind)
      || optionIds.some((value) => !value) || optionIds[0] === optionIds[1] || labels.some((value) => !value)
      || effects.some((value) => !effectValues.includes(value as MealClarificationEffect));
    if (invalid) {
      if (groupIds.has(groupId)) discardedClarificationGroupIds.add(groupId);
      continue;
    }
    clarificationIds.add(id);
    const options = [0, 1].map((index): RawClarificationOption => ({
      id: optionIds[index], label: labels[index], effect: effects[index] as MealClarificationEffect,
      foodName: String(item[`option${index + 1}FoodName`] ?? "").trim().slice(0, 100),
      preparation: String(item[`option${index + 1}Preparation`] ?? "").trim().slice(0, 80),
    })) as [RawClarificationOption, RawClarificationOption];
    clarifications.push({ id, kind: kind as MealClarificationKind, groupId, question, options });
  }
  if (root.containsFood !== (components.length > 0) || root.containsFood !== (groups.length > 0)) return null;
  if (!root.containsFood) clarifications.length = 0;
  return { containsFood: root.containsFood, summary: root.summary.trim().slice(0, 200), imageQuality, needsCloserPhoto, groups, components, clarifications, discardedClarificationGroupIds: [...discardedClarificationGroupIds] };
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
  return tokens.length <= 3 && ["שמן", "מיונז", "רוטב", "טחינה"].some((term) => tokens.includes(term));
};

const isNonNutritiveDrinkMedium = (item: RawMealComponent) => {
  const tokens = normalize(item.name).split(" ");
  const isWaterOrIce = tokens.length <= 3 && ["מים", "מי קרח", "קרח", "water", "ice"].some((term) => normalize(item.name) === normalize(term));
  return isWaterOrIce && item.calories === 0 && item.protein === 0 && item.carbs === 0 && item.fat === 0;
};

export function normalizeComponents(raw: readonly RawMealComponent[], foods: readonly MatchableFood[], groups: readonly RawMealGroup[]): MealAnalysisComponent[] {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const groupsWithIncludedFat = new Set(raw.filter((item) => !isStandaloneFatOrSauce(item.name) && item.nutritionIncludesAddedFat).map((item) => item.groupId));
  const groupsWithCalculatedDrink = new Set(raw.filter((item) => !isNonNutritiveDrinkMedium(item)).map((item) => item.groupId));
  const excludedDrinkMediumGrams = new Map<string, number>();
  for (const item of raw) {
    if (isNonNutritiveDrinkMedium(item) && groupsWithCalculatedDrink.has(item.groupId))
      excludedDrinkMediumGrams.set(item.groupId, (excludedDrinkMediumGrams.get(item.groupId) ?? 0) + item.estimatedGrams);
  }
  const kept = raw.filter((item) => {
    if (isNonNutritiveDrinkMedium(item) && groupsWithCalculatedDrink.has(item.groupId)) return false;
    if (!isStandaloneFatOrSauce(item.name)) return true;
    return item.standaloneVisibleAddition && !groupsWithIncludedFat.has(item.groupId);
  });
  const indicesByGroup = new Map<string, number[]>();
  for (const [index, item] of kept.entries()) indicesByGroup.set(item.groupId, [...(indicesByGroup.get(item.groupId) ?? []), index]);
  const allocatedGrams = new Array<number>(kept.length);
  for (const [groupId, indices] of indicesByGroup) {
    const group = groupById.get(groupId);
    if (!group) throw new Error("invalid_component_group");
    const targetGrams = round(group.estimatedGrams - (excludedDrinkMediumGrams.get(groupId) ?? 0));
    if (targetGrams <= 0) throw new Error("invalid_component_group_weight");
    const componentTotal = indices.reduce((sum, index) => sum + kept[index].estimatedGrams, 0);
    if (componentTotal <= 0) throw new Error("invalid_component_group_weight");
    let assigned = 0;
    indices.forEach((index, position) => {
      const grams = position === indices.length - 1
        ? round(targetGrams - assigned)
        : Math.floor(kept[index].estimatedGrams * targetGrams / componentTotal * 10) / 10;
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
    return { index, componentKey: `base-${index}`, groupId: item.groupId, name: match?.name ?? item.name, grams, per100, foodId: match?.id ?? null, source: match ? "catalog" as const : "ai_estimate" as const, confidence: item.confidence, assumptions: assumptions.slice(0, 5), clarification: item.clarification };
  });
}

const descriptionTokens = (value: string) => new Set(normalize(value).split(" ").filter(Boolean).map((token) => {
  let result = token;
  if (result.length > 4 && /^[והבלכמש]/u.test(result)) result = result.slice(1);
  if (result.length > 4 && /(ים|ות)$/u.test(result)) result = result.slice(0, -2);
  return result;
}));
const phraseMentioned = (description: Set<string>, phrase: string) => {
  const tokens = [...descriptionTokens(phrase)].filter((token) => token.length > 1);
  return tokens.length > 0 && tokens.every((token) => description.has(token));
};

function clarificationAlreadyAnswered(description: string, clarification: RawMealClarification, targets: readonly MealAnalysisComponent[]) {
  const tokens = descriptionTokens(description);
  const normalizedDescription = normalize(description);
  const explicitlyUncertain = /לא\s*(?:ברור|בטוח)|אולי|ייתכן|(?:^|\s)או(?:\s|$)/u.test(normalizedDescription);
  if (clarification.kind === "group_split") {
    const amounts = normalizedDescription.match(/\d+(?:[.,]\d+)?\s*(?:גרם|אחוז|%)/gu) ?? [];
    const distinctNames = [...new Set([...clarification.options.map((option) => option.foodName), ...targets.map((target) => target.name)].filter(Boolean))];
    const mentionedNames = distinctNames.filter((name) => phraseMentioned(tokens, name)).length;
    return (amounts.length >= 2 && mentionedNames >= 2) || /חצי\s*חצי|שווה\s*בשווה/u.test(normalizedDescription);
  }
  if (clarification.kind === "sauce_amount") {
    return /\d+(?:[.,]\d+)?\s*(?:גרם|כפות?|כפיות?|מ[״"]?ל)/u.test(normalizedDescription) && /שמן|מיונז|רוטב|טחינה/u.test(normalizedDescription);
  }
  if (explicitlyUncertain) return false;
  if (clarification.kind === "preparation")
    return clarification.options.some((option) => option.preparation && phraseMentioned(tokens, option.preparation));
  const mentionedByOption = clarification.options.map((option) => option.foodName && phraseMentioned(tokens, option.foodName));
  if (mentionedByOption.some(Boolean)) return true;
  if (clarification.kind === "component_identity") {
    const distinctNames = [...new Set(clarification.options.map((option) => option.foodName).filter(Boolean))];
    return distinctNames.filter((name) => phraseMentioned(tokens, name)).length >= 2;
  }
  return false;
}

const macroTotals = (components: readonly MealAnalysisComponent[]) => components.reduce((totals, component) => {
  const factor = component.grams / 100;
  return {
    calories: totals.calories + component.per100.calories * factor,
    protein: totals.protein + component.per100.protein * factor,
    carbs: totals.carbs + component.per100.carbs * factor,
    fat: totals.fat + component.per100.fat * factor,
  };
}, { calories: 0, protein: 0, carbs: 0, fat: 0 });

export function buildMealClarifications(raw: readonly RawMealClarification[], description: string, components: readonly MealAnalysisComponent[], foods: readonly MatchableFood[], groups: readonly RawMealGroup[]): MealClarification[] {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const candidates: Array<{ clarification: MealClarification; score: number; groupId: string }> = [];
  for (const question of raw) {
    const group = groupById.get(question.groupId);
    const targets = components.filter((component) => component.groupId === question.groupId && component.componentKey);
    if (!group || !targets.length) continue;
    if (clarificationAlreadyAnswered(description, question, targets)) continue;
    const options: MealClarificationOption[] = [];
    for (const option of question.options) {
      const replacements = buildDeterministicReplacements(question, option, targets, foods, group.estimatedGrams, components.length + options.length * 4);
      if (!replacements || round(replacements.reduce((sum, component) => sum + component.grams, 0)) !== round(group.estimatedGrams)) continue;
      options.push({ id: option.id, label: option.label, replacements });
    }
    if (options.length < 2) continue;
    const variants = [targets, ...options.map((option) => option.replacements)].map(macroTotals);
    const range = (key: keyof MacroValues) => Math.max(...variants.map((variant) => variant[key])) - Math.min(...variants.map((variant) => variant[key]));
    const calorieRange = range("calories");
    const proteinRange = range("protein");
    const carbsRange = range("carbs");
    const fatRange = range("fat");
    if (calorieRange < 40 && proteinRange < 5 && carbsRange < 10 && fatRange < 4) continue;
    candidates.push({ groupId: question.groupId, score: Math.max(calorieRange, proteinRange * 4 + carbsRange * 4 + fatRange * 9), clarification: { id: question.id, kind: question.kind, question: question.question, targetComponentKeys: targets.map((component) => component.componentKey!), options } });
  }
  const selectedGroups = new Set<string>();
  return candidates.sort((a, b) => b.score - a.score).filter((candidate) => {
    if (selectedGroups.has(candidate.groupId)) return false;
    selectedGroups.add(candidate.groupId);
    return true;
  }).slice(0, 2).map((candidate) => candidate.clarification);
}

const catalogProfile = (food: MatchableFood, groupId: string): MealAnalysisComponent | null => {
  const per100 = {
    calories: Number(food.calories ?? 0), protein: Number(food.protein ?? 0),
    carbs: Number(food.carbs ?? 0), fat: Number(food.fat ?? 0),
  };
  if (per100.calories < 0 || per100.calories > LIMITS.calories || per100.protein < 0 || per100.protein > LIMITS.protein || per100.carbs < 0 || per100.carbs > LIMITS.carbs || per100.fat < 0 || per100.fat > LIMITS.fat) return null;
  return { index: -1, groupId, name: food.name, grams: 0, per100, foodId: food.id, source: "catalog", confidence: "high", assumptions: [], clarification: null };
};

const sameFood = (left: string, right: string) => {
  const a = normalize(left);
  const b = normalize(right);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
};

const candidateProfile = (foodName: string, preparation: string, targets: readonly MealAnalysisComponent[], foods: readonly MatchableFood[], groupId: string) => {
  if (!foodName) return null;
  const catalog = matchFood(foodName, foods, preparation);
  if (catalog) return catalogProfile(catalog, groupId);
  const existing = targets.find((component) => sameFood(component.name, foodName));
  return existing ? { ...existing, grams: 0, componentKey: undefined, clarification: null } : null;
};

const hasDuplicateIncludedFat = (profiles: readonly MealAnalysisComponent[]) => profiles.some((profile, index) => {
  if (!isStandaloneFatOrSauce(profile.name)) return false;
  const fatTerms = ["שמן", "מיונז", "רוטב", "טחינה"].filter((term) => normalize(profile.name).includes(normalize(term)));
  return profiles.some((other, otherIndex) => otherIndex !== index && !isStandaloneFatOrSauce(other.name) && fatTerms.some((term) => normalize(other.name).includes(normalize(term))));
});

const allocateProfiles = (profiles: readonly MealAnalysisComponent[], shares: readonly number[], totalGrams: number, keyPrefix: string, startIndex: number): MealAnalysisComponent[] | null => {
  if (!profiles.length || profiles.length !== shares.length || hasDuplicateIncludedFat(profiles)) return null;
  const shareTotal = shares.reduce((sum, share) => sum + share, 0);
  if (shareTotal <= 0) return null;
  let assigned = 0;
  return profiles.map((profile, index) => {
    const grams = index === profiles.length - 1 ? round(totalGrams - assigned) : Math.floor(totalGrams * shares[index] / shareTotal * 10) / 10;
    assigned = round(assigned + grams);
    return { ...profile, index: startIndex + index, componentKey: `${keyPrefix}-${index}`, grams, clarification: null };
  });
};

function buildDeterministicReplacements(question: RawMealClarification, option: RawClarificationOption, targets: readonly MealAnalysisComponent[], foods: readonly MatchableFood[], totalGrams: number, startIndex: number) {
  const prefix = `clar-${question.id}-${option.id}`;
  if (option.effect === "keep_estimate")
    return allocateProfiles(targets, targets.map((target) => target.grams), totalGrams, prefix, startIndex);
  if (option.effect === "split_even" || option.effect === "first_more" || option.effect === "second_more") {
    const shares = targets.map((_, index) => option.effect === "split_even" ? 1 : option.effect === "first_more" ? (index === 0 ? 7 : 3 / Math.max(1, targets.length - 1)) : (index === targets.length - 1 ? 7 : 3 / Math.max(1, targets.length - 1)));
    return allocateProfiles(targets, shares, totalGrams, prefix, startIndex);
  }
  if (option.effect === "catalog_food") {
    const profile = candidateProfile(option.foodName, option.preparation, targets, foods, question.groupId);
    return profile ? allocateProfiles([profile], [1], totalGrams, prefix, startIndex) : null;
  }
  const candidateOptions = question.options.filter((candidate) => candidate.foodName);
  const profiles = candidateOptions.map((candidate) => candidateProfile(candidate.foodName, candidate.preparation, targets, foods, question.groupId));
  if (profiles.length !== 2 || profiles.some((profile) => !profile)) return null;
  const resolved = profiles as MealAnalysisComponent[];
  const visualShares = resolved.map((profile) => targets.find((target) => sameFood(target.name, profile.name))?.grams ?? 0);
  const shares = visualShares.every((share) => share > 0) ? visualShares : [1, 1];
  return allocateProfiles(resolved, shares, totalGrams, prefix, startIndex);
}

export function applyMealClarification(components: readonly MealAnalysisComponent[], clarification: MealClarification, option: MealClarificationOption): MealAnalysisComponent[] {
  const targetKeys = new Set(clarification.targetComponentKeys);
  const targetIndices = components.map((component, index) => targetKeys.has(component.componentKey ?? `base-${component.index}`) ? index : -1).filter((index) => index >= 0);
  if (!targetIndices.length || !option.replacements.length) return [...components];
  const totalGrams = round(targetIndices.reduce((sum, index) => sum + components[index].grams, 0));
  const replacementTotal = option.replacements.reduce((sum, component) => sum + component.grams, 0);
  if (totalGrams <= 0 || replacementTotal <= 0) return [...components];
  let assigned = 0;
  const replacements = option.replacements.map((component, index) => {
    const grams = index === option.replacements.length - 1 ? round(totalGrams - assigned) : Math.floor(component.grams * totalGrams / replacementTotal * 10) / 10;
    assigned = round(assigned + grams);
    return { ...component, grams };
  });
  const first = Math.min(...targetIndices);
  return components.flatMap((component, index) => index === first ? replacements : targetIndices.includes(index) ? [] : [component]);
}
