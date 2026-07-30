import { notFound, redirect } from "next/navigation";
import PersistentMenuEditor, {
  type EditableMenu,
} from "@/components/coach/menus/PersistentMenuEditor";
import {
  getAuthContext,
  getCoachMenu,
  listCoachDashboardClients,
  listCoachFoodUsage,
  listDatabaseFoods,
} from "@/lib/data/product-repository";
import { masterFoodGroup } from "@/lib/nutrition/master-foods";
type StoredDay = { meals: Array<{ title: EditableMenu["meals"][number]["title"]; notes?:string;free_calorie_target?:number|string; groups?:Array<{group_type:"protein"|"carbohydrate"|"fat"|"vegetables";items:Array<{food_id:string;amount:number|string;display_quantity?:number|string;amount_source?:string}>}>; items: Array<{ food_id: string; amount: number | string;display_quantity?:number|string;amount_source?:string }> }> };
function editableGroups(meal:StoredDay["meals"][number]){
  const stored=meal.groups?.length?meal.groups:[{group_type:"protein" as const,items:meal.items}];
  return(["protein","carbohydrate"] as const).map(type=>{
    const group=stored.find(candidate=>candidate.group_type===type);
    return{
      type,
      items:(group?.items??[]).map(item=>({
        foodId:item.food_id,
        amount:Number(item.display_quantity??item.amount),
        amountSource:item.amount_source==="auto"?"auto" as const:"manual" as const,
      })),
    };
  });
}
export default async function EditMenuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");
  const { id } = await params;
  const [menu, clientResult, rows, usageRows] = await Promise.all([
    getCoachMenu(auth.id, id),
    listCoachDashboardClients(auth.id, { pageSize: 50 }),
    listDatabaseFoods(),
    listCoachFoodUsage(auth.id),
  ]);
  if (!menu) notFound();
  const foods = rows.map((food) => ({
    ...food,
    calories: Number(food.calories),
    protein: food.protein === null ? null : Number(food.protein),
    carbs: food.carbs === null ? null : Number(food.carbs),
    fat: food.fat === null ? null : Number(food.fat),
    packageUnit:food.package_unit,
    unitWeightGrams:food.unit_weight_grams===null?null:Number(food.unit_weight_grams),
    isMaster:Boolean(masterFoodGroup(food.id)),
    masterGroup:masterFoodGroup(food.id),
  }));
  const initial: EditableMenu = {
    id: menu.id,
    title: menu.title,
    description: menu.description ?? "",
    clientId: menu.client_id ?? "",
    status: menu.status === "archived" ? "draft" : menu.status,
    calorieTarget: String(menu.calorie_target ?? ""),
    proteinTarget: String(menu.protein_target ?? ""),
    carbohydrateTarget: String(menu.carbohydrate_target ?? ""),
    fatTarget: String(menu.fat_target ?? ""),
    macroSources: {
      protein:
        menu.protein_target == null || menu.protein_target_source === "auto"
          ? "auto"
          : "manual",
      carbohydrates:
        menu.carbohydrate_target == null ||
        menu.carbohydrate_target_source === "auto"
          ? "auto"
          : "manual",
      fat:
        menu.fat_target == null || menu.fat_target_source === "auto"
          ? "auto"
          : "manual",
    },
    meals: (menu.days as StoredDay[]).flatMap((day) =>
      day.meals.map((meal) => ({
        title: meal.title,
        notes:meal.notes??"",
        freeCalorieTarget:String(meal.free_calorie_target??""),
        groups:editableGroups(meal),
      })),
    ),
  };
  return (
    <PersistentMenuEditor
      initial={initial}
      foods={foods}
      clients={clientResult.items.map(({ id, full_name, latestWeight }) => ({
        id,
        full_name,
        weight: latestWeight,
      }))}
      initialUsage={usageRows.map((row) => ({
        foodId: String(row.food_id),
        count: Number(row.selection_count),
        lastUsedAt: String(row.last_used_at),
        favorite: Boolean(row.manual_favorite),
      }))}
    />
  );
}
