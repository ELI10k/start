export const AI_MEAL_DEFAULT_MODEL = "alibaba/qwen3.8-omni-flash";

export function isAiMealAnalysisEnabled() {
  return process.env.AI_MEAL_ANALYSIS_ENABLED?.trim().toLowerCase() === "true";
}
