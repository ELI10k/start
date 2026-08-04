export type MenuValidationResult =
  | { ok: true }
  | { ok: false; message: string };

type MenuItemInput = { foodId?: unknown; amount?: unknown };
type MenuGroupInput = { type?: unknown; items?: unknown };
type MenuMealInput = { title?: unknown; groups?: unknown; freeCalorieTarget?: unknown };
type MenuDayInput = { meals?: unknown };
export const FIXED_MEAL_TITLES=[
  "ארוחת בוקר","ארוחת ביניים 1","ארוחת צהריים",
  "ארוחת ביניים 2","ארוחת ערב","קלוריות חופשיות",
] as const;
const GROUP_TYPES=new Set(["protein","carbohydrate"]);

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
    if (typeof meal.title !== "string" || !FIXED_MEAL_TITLES.includes(meal.title as typeof FIXED_MEAL_TITLES[number])) {
      return { ok: false, message: "יש לבחור סוג ארוחה מהרשימה הקבועה." };
    }
    if(meal.title==="קלוריות חופשיות"){
      const target=Number(meal.freeCalorieTarget);
      if(!Number.isFinite(target)||target<=0)return{ok:false,message:"יש להזין יעד קלורי חיובי לקלוריות החופשיות."};
      continue;
    }
    if (!Array.isArray(meal.groups) || meal.groups.length === 0) {
      return {
        ok: false,
        message: `יש להוסיף לפחות קבוצת מזון אחת לארוחה „${meal.title}”.`,
      };
    }
    const seen=new Set<string>();
    for(const group of meal.groups as MenuGroupInput[]){
      if(typeof group.type!=="string"||!GROUP_TYPES.has(group.type)||seen.has(group.type))
        return{ok:false,message:"קבוצות המזון בארוחה אינן תקינות."};
      seen.add(group.type);
      if(!Array.isArray(group.items)||group.items.length===0)
        return{ok:false,message:"יש לבחור לפחות מאכל אחד בכל קבוצת מזון."};
      for (const item of group.items as MenuItemInput[]) {
        if (typeof item.foodId !== "string" || !item.foodId) {
          return { ok: false, message: "יש לבחור מזון בכל חלופה." };
        }
        const amount = Number(item.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          return { ok: false, message: "כל כמויות המזון חייבות להיות חיוביות." };
        }
      }
    }
    if(!seen.has("protein")||!seen.has("carbohydrate"))
      return{ok:false,message:"בכל ארוחה רגילה נדרשות קבוצת חלבון וקבוצת פחמימה."};
  }
  return { ok: true };
}
