import type { MealPlan } from "./types.ts";
import { clients } from "../clients.ts";

export function validateMealPlan(plan: MealPlan): string[] {
  const errors: string[] = [];
  if (!plan.name.trim()) errors.push("יש להזין שם לתפריט.");
  for (const [label, value] of [["קלוריות", plan.targets.calories], ["חלבון", plan.targets.protein], ["פחמימות", plan.targets.carbs], ["שומן", plan.targets.fat]] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) errors.push(`יעד ${label} חייב להיות מספר חיובי.`);
  }
  if (plan.meals.some((meal) => meal.items.some((item) => !Number.isFinite(item.quantityGrams) || item.quantityGrams <= 0))) errors.push("כל כמויות המזון חייבות להיות חיוביות.");
  if (plan.status === "active" && plan.meals.length === 0) errors.push("כדי להפעיל תפריט יש להוסיף לפחות ארוחה אחת.");
  if (plan.status === "active" && !plan.meals.some((meal) => meal.items.length > 0)) errors.push("כדי להפעיל תפריט יש להוסיף לפחות מזון אחד.");
  if (plan.assignedClientId && !clients.some((client) => client.id === plan.assignedClientId)) errors.push("לא ניתן לשייך תפריט ללקוח שאינו קיים.");
  return errors;
}
