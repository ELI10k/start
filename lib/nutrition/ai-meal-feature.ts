export const AI_MEAL_DEFAULT_MODEL = "alibaba/qwen3.8-omni-flash";
export const AI_MEAL_ALLOWED_USER_ID = "368e193a-1364-4069-9743-be3da7bddac1";

export function isAiMealAnalysisEnabled() {
  return process.env.AI_MEAL_ANALYSIS_ENABLED?.trim().toLowerCase() === "true";
}

export function canUseAiMealAnalysis(userId: string | null | undefined) {
  return isAiMealAnalysisEnabled() && userId === AI_MEAL_ALLOWED_USER_ID;
}
