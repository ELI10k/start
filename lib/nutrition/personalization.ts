import { CALORIES_PER_GRAM, type MacroTargets } from "./macro-targets.ts";

export type DietType = "mediterranean" | "low_carb" | "keto" | "pescatarian" | "vegetarian" | "vegan" | "other";
export type GenerationStatus = "ready" | "needs_review" | "unavailable" | "failed";

export type DietaryIntake = Readonly<{
  dietType: DietType;
  restrictions: readonly string[];
  allergies: string;
  avoidances: string;
  mealCount: number;
}>;

export type TaggedFood = Readonly<{
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  vegan: boolean;
  vegetarian: boolean;
  pescatarian: boolean;
  containsGluten: boolean;
  containsLactose: boolean;
  allergens: readonly string[];
  dietaryTags: readonly string[];
  metadataVerified: boolean;
}>;

const NONE = new Set(["אין", "ללא", "none", "no", "לא"]);
export const isExplicitNone = (value: string) => NONE.has(value.trim().toLocaleLowerCase("he"));

export function dietaryReviewReason(input: DietaryIntake): string | null {
  if (input.dietType === "other") return "סוג התזונה החופשי דורש מיפוי מקצועי לפני יצירת תפריט.";
  if (!Number.isInteger(input.mealCount) || input.mealCount < 3 || input.mealCount > 5) return "יש לבחור 3, 4 או 5 ארוחות ביום.";
  if (!isExplicitNone(input.allergies)) return "אלרגיה או רגישות בטקסט חופשי דורשת בדיקה; לא נציג תפריט כבטוח ללא מיפוי ודאי.";
  if (!isExplicitNone(input.avoidances)) return "מאכלים שלא נאכלים הם איסור קשיח ודורשים מיפוי ודאי לפני יצירת תפריט.";
  return null;
}

export function calculateDietMacros(weightKg: number, calorieTarget: number, dietType: DietType): MacroTargets | null {
  if (!(weightKg > 0) || !(calorieTarget > 0)) return null;
  const protein = Math.round(weightKg * 1.8);
  const carbohydrateShare = dietType === "keto" ? 0.08 : dietType === "low_carb" ? 0.25 : null;
  if (carbohydrateShare === null) {
    const fat = Math.round((calorieTarget * 0.25) / CALORIES_PER_GRAM.fat);
    const carbohydrates = Math.round((calorieTarget - protein * 4 - fat * 9) / 4);
    return carbohydrates >= 0 ? { protein, fat, carbohydrates } : null;
  }
  const carbohydrates = Math.round((calorieTarget * carbohydrateShare) / 4);
  const fat = Math.round((calorieTarget - protein * 4 - carbohydrates * 4) / 9);
  return fat > 0 ? { protein, fat, carbohydrates } : null;
}

export function foodAllowed(food: TaggedFood, input: DietaryIntake): boolean {
  if (!food.metadataVerified) return false;
  if (input.dietType === "vegan" && !food.vegan) return false;
  if (input.dietType === "vegetarian" && !food.vegetarian) return false;
  if (input.dietType === "pescatarian" && !food.pescatarian) return false;
  if (input.restrictions.includes("gluten_free") && food.containsGluten) return false;
  if (input.restrictions.includes("lactose_free") && food.containsLactose) return false;
  return true;
}

export type GeneratedMenu = Readonly<{
  templateKey: "balanced" | "low_carb" | "keto" | "plant_based";
  title: string;
  description: string;
  calorieTarget: number;
  proteinTarget: number;
  carbohydrateTarget: number;
  fatTarget: number;
  days: readonly { dayIndex: number; meals: readonly { title: string; sortOrder: number; groups: readonly { type: "protein" | "carbohydrate" | "fat"; sortOrder: number; items: readonly { foodId: string; amount: number; sortOrder: number }[] }[] }[] }[];
}>;

const mealTitles = ["ארוחת בוקר", "ארוחת ביניים 1", "ארוחת צהריים", "ארוחת ביניים 2", "ארוחת ערב"] as const;

export function buildPersonalizedMenu(input: DietaryIntake, foods: readonly TaggedFood[], calorieTarget: number, macros: MacroTargets): GeneratedMenu | null {
  if (dietaryReviewReason(input)) return null;
  const allowed = foods.filter(food => foodAllowed(food, input));
  const byTag = (tag: string) => allowed.filter(food => food.dietaryTags.includes(tag));
  const protein = byTag("protein").filter(food=>food.protein>0).slice(0, 3), carbs = byTag("carbohydrate").filter(food=>food.carbs>0).slice(0, 3), fats = byTag("fat").filter(food=>food.fat>0).slice(0, 3);
  if (protein.length < 2 || fats.length < 2 || (input.dietType !== "keto" && carbs.length < 2)) return null;
  const amountFor = (food: TaggedFood, type: "protein" | "carbohydrate" | "fat") => {
    const targetPerMeal = (type === "protein" ? macros.protein : type === "carbohydrate" ? macros.carbohydrates : macros.fat) / input.mealCount;
    const perHundred = type === "protein" ? food.protein : type === "carbohydrate" ? food.carbs : food.fat;
    return Math.max(10, Math.round((targetPerMeal / perHundred) * 100 / 5) * 5);
  };
  const groupsForMeal = (offset: number) => {
    const group = (type: "protein" | "carbohydrate" | "fat", pool: readonly TaggedFood[], sortOrder: number) => ({
      type, sortOrder, items: [0, 1].map(index => {
        const food = pool[(offset + index) % pool.length];
        return { foodId: food.id, amount: amountFor(food, type), sortOrder: index };
      }),
    });
    const groups = [group("protein", protein, 0)];
    if (input.dietType !== "keto") groups.push(group("carbohydrate", carbs, 1));
    groups.push(group("fat", fats, 2));
    return groups;
  };
  return {
    templateKey: input.dietType === "keto" ? "keto" : input.dietType === "low_carb" ? "low_carb" : input.dietType === "vegan" || input.dietType === "vegetarian" || input.dietType === "pescatarian" ? "plant_based" : "balanced",
    title: "התפריט האישי שלי",
    description: "נוצר אוטומטית לפי תשובות שאלון האפיון. כל שורה בקבוצה היא חלופה לבחירה.",
    calorieTarget,
    proteinTarget: macros.protein,
    carbohydrateTarget: macros.carbohydrates,
    fatTarget: macros.fat,
    days: Array.from({ length: 7 }, (_, dayIndex) => ({
      dayIndex,
      meals: mealTitles.slice(0, input.mealCount).map((title, sortOrder) => ({ title, sortOrder, groups: groupsForMeal(dayIndex + sortOrder) })),
    })),
  };
}
