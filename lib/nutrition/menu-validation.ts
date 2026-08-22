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
// All four, matching save_meal_plan_tree. 202608180004 widened the database to
// accept fat and vegetables - its own header says the narrow list "made the whole
// menu unsavable" - but this validator was never widened with it, so a coach who
// filled a fat portion or the vegetables row still had their save rejected here,
// before the request ever reached the server that would have accepted it.
const GROUP_TYPES=new Set(["protein","carbohydrate","fat","vegetables"]);

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
  if (!Array.isArray(plan.days)) {
    return { ok: false, message: "מבנה ימי התפריט אינו תקין." };
  }

  const meals = (plan.days as MenuDayInput[]).flatMap((day) =>
    Array.isArray(day.meals) ? (day.meals as MenuMealInput[]) : [],
  );
  // Empty is a legitimate menu right up until somebody eats from it.
  //
  // A coach building a freestyle plan - calories and macros, no prescribed rows -
  // had nothing to save: the emptiness that is the whole point of it was refused
  // as an unfinished draft. The rule that matters is the one at the other end,
  // and it is unchanged: a menu that reaches a client has to have something in
  // it, because an active menu with no meals serves that client nothing.
  if (plan.status === "active" && (plan.days.length === 0 || meals.length === 0)) {
    return { ok: false, message: "כדי להפעיל תפריט אצל לקוח יש להוסיף לפחות ארוחה אחת." };
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
    // A meal needs at least one filled group, not both. Demanding both made a
    // perfectly ordinary plan unsaveable - eggs for breakfast with no carbohydrate,
    // or a protein-only snack - and the editor drops groups the coach left empty,
    // so the rejection surfaced as a missing group rather than as a real problem.
    if(!seen.has("protein")&&!seen.has("carbohydrate"))
      return{ok:false,message:"בכל ארוחה רגילה נדרשת לפחות קבוצת חלבון או קבוצת פחמימה."};
  }
  return { ok: true };
}
