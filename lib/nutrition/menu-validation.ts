export type MenuValidationResult =
  | { ok: true }
  | { ok: false; message: string };

type MenuItemInput = { foodId?: unknown; amount?: unknown };
type MenuMealInput = { title?: unknown; items?: unknown };
type MenuDayInput = { meals?: unknown };

export function validateMealPlanPayload(payload: unknown): MenuValidationResult {
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "מבנה התפריט אינו תקין." };
  }

  const plan = payload as {
    title?: unknown;
    status?: unknown;
    clientId?: unknown;
    days?: unknown;
  };
  if (typeof plan.title !== "string" || !plan.title.trim()) {
    return { ok: false, message: "יש להזין שם לתפריט." };
  }
  if (
    plan.status !== "draft" &&
    plan.status !== "published" &&
    plan.status !== "active"
  ) {
    return { ok: false, message: "סטטוס התפריט אינו תקין." };
  }
  if (
    plan.status === "active" &&
    (typeof plan.clientId !== "string" || !plan.clientId)
  ) {
    return { ok: false, message: "תפריט פעיל חייב להיות משויך ללקוח." };
  }
  if (!Array.isArray(plan.days) || plan.days.length === 0) {
    return { ok: false, message: "יש להוסיף לפחות יום אחד לתפריט." };
  }

  const meals = (plan.days as MenuDayInput[]).flatMap((day) =>
    Array.isArray(day.meals) ? (day.meals as MenuMealInput[]) : [],
  );
  if (meals.length === 0) {
    return { ok: false, message: "יש להוסיף לפחות ארוחה אחת לתפריט." };
  }
  for (const meal of meals) {
    if (typeof meal.title !== "string" || !meal.title.trim()) {
      return { ok: false, message: "לכל ארוחה חייב להיות שם." };
    }
    if (!Array.isArray(meal.items) || meal.items.length === 0) {
      return {
        ok: false,
        message: `יש להוסיף לפחות מזון אחד לארוחה „${meal.title.trim()}”.`,
      };
    }
    for (const item of meal.items as MenuItemInput[]) {
      if (typeof item.foodId !== "string" || !item.foodId) {
        return { ok: false, message: "יש לבחור מזון בכל שורת תפריט." };
      }
      const amount = Number(item.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false, message: "כל כמויות המזון חייבות להיות חיוביות." };
      }
    }
  }
  return { ok: true };
}
