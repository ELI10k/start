import FoodDatabase from "@/components/FoodDatabase";
import { getAuthContext, listDatabaseFoods } from "@/lib/data/product-repository";
import { masterFoodGroup } from "@/lib/nutrition/master-foods";
import { catalogueServingNutrition } from "@/lib/nutrition/catalogue-serving";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CoachFoodsPage() {
  const [rows, auth] = await Promise.all([listDatabaseFoods(), getAuthContext()]);
  const supabase = await createSupabaseServerClient();
  const [{ data: favorites }, { data: menuUsage }] = auth
    ? await Promise.all([
        supabase.from("food_favorites").select("food_id").eq("user_id", auth.id),
        // The menu builder treats every master food as a favorite until the
        // coach explicitly removes it. Reading only `manual_favorite=true`
        // omitted that entire set from the catalogue's Favorites tab.
        supabase
          .from("coach_food_usage")
          .select("food_id,manual_favorite")
          .eq("coach_id", auth.id),
      ])
    : [{ data: [] }, { data: [] }];

  const usageByFood = new Map(
    (menuUsage ?? []).map((row) => [String(row.food_id), row.manual_favorite]),
  );
  const menuFavoriteIds = rows.flatMap((food) => {
    const manual = usageByFood.get(food.id);
    const favorite = manual === null || manual === undefined
      ? Boolean(masterFoodGroup(food.id))
      : Boolean(manual);
    return favorite ? [food.id] : [];
  });
  const favoriteIds = [
    ...new Set([
      ...(favorites ?? []).map((row) => String(row.food_id)),
      ...menuFavoriteIds,
    ]),
  ];
  const foods = rows.map((food) => {
    const nutrition = catalogueServingNutrition({
      calories: Number(food.calories),
      protein: food.protein === null ? null : Number(food.protein),
      carbs: food.carbs === null ? null : Number(food.carbs),
      fat: food.fat === null ? null : Number(food.fat),
      packageUnit: food.package_unit,
      unitWeightGrams: food.unit_weight_grams === null ? null : Number(food.unit_weight_grams),
      servingLabel: food.serving_label,
    });
    return {
      id: food.id,
      name: food.name,
      brand: food.brand ?? undefined,
      category: food.category,
      calories: nutrition.calories,
      protein: nutrition.protein ?? undefined,
      carbs: nutrition.carbs ?? undefined,
      fat: nutrition.fat ?? undefined,
      servingLabel: nutrition.servingLabel,
    };
  });
  return <main className="foods-page"><FoodDatabase foods={foods} initialFavorites={favoriteIds}/></main>;
}
