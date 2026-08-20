import { notFound, redirect } from "next/navigation";
import PersistentMenuEditor, {
  type EditableMenu,
} from "@/components/coach/menus/PersistentMenuEditor";
import {
  getAuthContext,
  getCoachMenu,
  listCoachFoodUsage,
  listCoachMenuClients,
  listDatabaseFoods,
} from "@/lib/data/product-repository";
import { masterFoodGroup } from "@/lib/nutrition/master-foods";
import { GRAM_UNIT } from "@/lib/nutrition/meal-alternatives";
type StoredItem={food_id:string;amount:number|string;display_quantity?:number|string;measurement_unit?:string|null;amount_source?:string;item_role?:string;note?:string|null};
type StoredDay = { day_index?: number; meals: Array<{ title: EditableMenu["days"][number]["meals"][number]["title"]; notes?:string;free_calorie_target?:number|string; groups?:Array<{group_type:"protein"|"carbohydrate"|"fat"|"vegetables";items:StoredItem[]}>; items: StoredItem[] }> };

// Reopening a saved menu has to hand back everything that was saved.
//
// This used to rebuild only the protein and carbohydrate groups, and only the
// food id, amount and source of each row. So a coach who added a fat portion and
// vegetables, saved, and came back the next day found both gone from the editor -
// and saving again deleted them from the menu for real. The same was true of
// which rows were marked primary and of any per-food note.
const GROUP_TYPES=["protein","carbohydrate","fat","vegetables"] as const;
function editableGroups(meal:StoredDay["meals"][number]){
  const stored=meal.groups?.length?meal.groups:[{group_type:"protein" as const,items:meal.items}];
  return GROUP_TYPES.map(type=>{
    const group=stored.find(candidate=>candidate.group_type===type);
    return{
      type,
      items:(group?.items??[]).map((item,index)=>({
        foodId:item.food_id,
        amount:Number(item.display_quantity??item.amount),
        amountSource:item.amount_source==="auto"?"auto" as const:"manual" as const,
        // Legacy rows carry no role; there the first row was the primary.
        primary:item.item_role?item.item_role==="primary":index===0,
        note:item.note??"",
        // Which unit the coach wrote the row in. The saved unit is the answer:
        // a row stored in grams reopens in grams even when the food could be
        // counted in pitas, because that is how the coach chose to say it.
        unitMode:(item.measurement_unit??GRAM_UNIT)===GRAM_UNIT?"gram" as const:"native" as const,
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
  const [menu, clients, rows, usageRows] = await Promise.all([
    getCoachMenu(auth.id, id),
    listCoachMenuClients(auth.id),
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
    // One entry per stored day, in weekday order. A menu saved before the day
    // model existed has exactly one day with index 0, which is what the editor
    // now calls "ברירת מחדל" - so it opens unchanged.
    days: (menu.days as StoredDay[])
      .map((day) => ({
        dayIndex: Number(day.day_index ?? 0),
        meals: day.meals.map((meal) => ({
          title: meal.title,
          notes: meal.notes ?? "",
          freeCalorieTarget: String(meal.free_calorie_target ?? ""),
          groups: editableGroups(meal),
        })),
      }))
      .sort((a, b) => a.dayIndex - b.dayIndex),
  };
  return (
    <PersistentMenuEditor
      initial={initial}
      foods={foods}
      clients={clients}
      initialUsage={usageRows.map((row) => ({
        foodId: String(row.food_id),
        count: Number(row.selection_count),
        lastUsedAt: String(row.last_used_at),
        favorite: row.manual_favorite === null || row.manual_favorite === undefined ? null : Boolean(row.manual_favorite),
      }))}
    />
  );
}
