import { redirect } from "next/navigation";
import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import ShoppingList from "@/components/client/ShoppingList";
import { StateBlock } from "@/components/client/AppPatterns";
import { getActiveClientMenu, getAuthContext, listDatabaseFoods } from "@/lib/data/product-repository";
import { israelDateKey } from "@/lib/date-time";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { masterFoodGroup } from "@/lib/nutrition/master-foods";

// The shopping list on its own screen.
//
// It was a button on the nutrition screen, which is where the menu is read, not
// where the shopping happens - the client is in a supermarket holding a phone,
// and the list was two taps behind the meals of a day they are not eating yet.
// One tab, one screen, nothing above it.
export default async function ShoppingPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");

  const today = israelDateKey();
  const [menu, foodRows] = await Promise.all([getActiveClientMenu(auth.id, today), listDatabaseFoods()]);
  const supabase = await createSupabaseServerClient();
  const since = new Date(`${today}T12:00:00Z`);
  since.setUTCDate(since.getUTCDate() - 30);
  const { data: loggedFoods } = await supabase
    .from("client_food_log")
    .select("name,quantity,unit,meal_id,created_at")
    .eq("client_id", auth.id)
    .gte("log_date", since.toISOString().slice(0, 10))
    .not("meal_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);
  const loggedMealIds = [...new Set((loggedFoods ?? []).map((row) => String(row.meal_id)).filter(Boolean))];
  const { data: freeMeals } = loggedMealIds.length
    ? await supabase.from("meals").select("id").in("id", loggedMealIds).not("free_calorie_target", "is", null)
    : { data: [] };
  const freeMealIds = new Set((freeMeals ?? []).map((row) => String(row.id)));
  const seenFreeFoods = new Set<string>();
  const recentFreeFoods = (loggedFoods ?? []).flatMap((row) => {
    const name = String(row.name ?? "").trim();
    const unit = String(row.unit ?? "יחידה").trim() || "יחידה";
    const key = `${name}\u0000${unit}`;
    if (!name || !freeMealIds.has(String(row.meal_id)) || seenFreeFoods.has(key)) return [];
    seenFreeFoods.add(key);
    return [{ name, displayQuantity: Number(row.quantity) > 0 ? Number(row.quantity) : 1, measurementUnit: unit, itemRole: "primary" as const, groupType: "other" }];
  });
  const catalogueFoods = foodRows.map((food) => ({
    id: String(food.id), name: String(food.name), brand: food.brand ? String(food.brand) : null,
    category: food.category ? String(food.category) : undefined,
    protein: food.protein === null ? null : Number(food.protein),
    carbs: food.carbs === null ? null : Number(food.carbs),
    fat: food.fat === null ? null : Number(food.fat),
    isMaster: Boolean(masterFoodGroup(String(food.id))),
    masterGroup: masterFoodGroup(String(food.id)),
  }));
  const menuItems = menu?.meals.flatMap((meal) => meal.groups.flatMap((group) => group.items.map((item) => ({
    name: item.name,
    displayQuantity: Number(item.displayQuantity),
    measurementUnit: item.measurementUnit,
    itemRole: item.itemRole,
    groupType: group.type,
  })))) ?? [];

  return (
    <ClientShell>
      <h1 className="text-2xl font-black">רשימת קניות</h1>
      <p className="mb-4 mt-1 text-sm text-[#5B5F5B]">{menu?.title ?? "הרשימה האישית שלי"}</p>
      {!menu ? <StateBlock icon={<ShoppingBasket aria-hidden="true" size={22} />} title="אין תפריט פעיל" description="עדיין אפשר לבנות כאן רשימת קניות אישית מהמאגר או בהקלדה ידנית." action={<Link href="/nutrition" className="premium-primary-button">לארוחות שלי</Link>} /> : null}
      <ShoppingList inline title={menu?.title ?? "אישי"} items={menuItems} catalogueFoods={catalogueFoods} recentFreeFoods={recentFreeFoods} />
    </ClientShell>
  );
}
