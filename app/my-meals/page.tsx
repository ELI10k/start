import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import MyMealsManager from "@/components/client/MyMealsManager";
import { getActiveClientMenu, getAuthContext, listDatabaseFoods } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { israelDateKey, ISRAEL_TIME_ZONE } from "@/lib/date-time";
import type { MyMeal } from "@/lib/nutrition/my-meals";

export default async function MyMealsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");
  const today = israelDateKey();
  const requested = (await searchParams).date;
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested <= today ? requested : today;
  const supabase = await createSupabaseServerClient();
  const [{ data: mealRows, error: mealError }, foods, activeMenu] = await Promise.all([
    supabase.from("my_meals").select("id,name,updated_at").eq("client_id", auth.id).order("updated_at", { ascending: false }),
    listDatabaseFoods(),
    getActiveClientMenu(auth.id, date),
  ]);
  if (mealError) throw mealError;
  const ids = (mealRows ?? []).map((row) => String(row.id));
  const { data: itemRows, error: itemError } = ids.length
    ? await supabase.from("my_meal_items").select("id,meal_id,food_id,quantity,unit,sort_order,snapshot_name,snapshot_calories,snapshot_protein,snapshot_carbs,snapshot_fat,nutrition_source,foods(name,calories,protein,carbs,fat,package_unit,unit_weight_grams)").in("meal_id", ids).order("sort_order")
    : { data: [], error: null };
  if (itemError) throw itemError;
  const number = (value: unknown) => value == null ? 0 : Number(value);
  const meals: MyMeal[] = (mealRows ?? []).map((meal) => ({
    id: String(meal.id), name: String(meal.name), updatedAt: String(meal.updated_at),
    items: (itemRows ?? []).filter((item) => item.meal_id === meal.id).map((item) => {
      const food = (Array.isArray(item.foods) ? item.foods[0] : item.foods) as Record<string, unknown> | null;
      const quantity = number(item.quantity);
      const unit = String(item.unit);
      const grams = unit === "גרם" ? quantity : quantity * number(food?.unit_weight_grams);
      const factor = grams / 100;
      const per100 = { calories: number(food?.calories ?? item.snapshot_calories), protein: number(food?.protein ?? item.snapshot_protein), carbs: number(food?.carbs ?? item.snapshot_carbs), fat: number(food?.fat ?? item.snapshot_fat) };
      return {
        id: String(item.id), foodId: item.food_id ? String(item.food_id) : null, name: String(food?.name ?? item.snapshot_name ?? "מאכל"), quantity, unit,
        sortOrder: number(item.sort_order), calories: per100.calories * factor,
        protein: per100.protein * factor, carbs: per100.carbs * factor, fat: per100.fat * factor, per100,
        nutritionEstimated: item.nutrition_source === "ai_estimate",
      };
    }),
  }));
  const pickerFoods = foods.map((food) => ({
    id: String(food.id), name: String(food.name), brand: food.brand ? String(food.brand) : null,
    category: food.category ? String(food.category) : undefined, calories: Number(food.calories ?? 0),
    protein: food.protein == null ? null : Number(food.protein), carbs: food.carbs == null ? null : Number(food.carbs),
    fat: food.fat == null ? null : Number(food.fat), packageUnit: food.package_unit ? String(food.package_unit) : null,
    unitWeightGrams: food.unit_weight_grams == null ? null : Number(food.unit_weight_grams),
  }));
  const plannedMeals = (activeMenu?.meals ?? []).filter((meal) => !meal.freeCalorieTarget).map((meal) => ({ id: meal.id, title: meal.title }));
  const now = new Intl.DateTimeFormat("en-GB", { timeZone: ISRAEL_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  return <ClientShell><MyMealsManager meals={meals} foods={pickerFoods} date={date} now={now} plannedMeals={plannedMeals}/></ClientShell>;
}
