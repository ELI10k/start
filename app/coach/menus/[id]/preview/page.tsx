import { notFound, redirect } from "next/navigation";
import {
  getAuthContext,
  getCoachMenu,
  listDatabaseFoods,
} from "@/lib/data/product-repository";
type PreviewItem={id:string;food_id:string;amount:number|string;display_quantity?:number|string;measurement_unit?:string;item_role?:string;calculated_calories:number|string};
type PreviewDay = { meals: Array<{ id: string; title: string;notes?:string;free_calorie_target?:number|string; groups?:Array<{id:string;group_type:string;items:PreviewItem[]}>;items:PreviewItem[] }> };
export default async function MenuPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");
  const { id } = await params;
  const [menu, foods] = await Promise.all([
    getCoachMenu(auth.id, id),
    listDatabaseFoods(),
  ]);
  if (!menu) notFound();
  const names = new Map(foods.map((food) => [food.id, food.name]));
  return (
    <main className="px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs text-[#D4AF37]">תצוגה מקדימה · {menu.status}</p>
        <h1 className="mt-2 text-3xl font-black">{menu.title}</h1>
        <p className="mt-2 text-zinc-500">{menu.description}</p>
        <div className="mt-6 space-y-4">
          {(menu.days as PreviewDay[])
            .flatMap((day) => day.meals)
            .map((meal) => (
              <article
                key={meal.id}
                className="rounded-[22px] border border-[#292929] bg-[#151515] p-5"
              >
                <h2 className="text-xl font-black">{meal.title}</h2>
                {meal.notes?<p className="mt-2 text-sm text-zinc-400">{meal.notes}</p>:null}
                {meal.free_calorie_target?<p className="mt-3 rounded-xl border border-[#D4AF37]/20 p-3 text-[#E7C85D]">מסגרת: {meal.free_calorie_target} קלוריות חופשיות</p>:<div className="mt-3 space-y-3">
                  {(meal.groups??[]).map(group=><section key={group.id} className="rounded-xl border border-white/10 p-3"><h3 className="font-bold">{groupName(group.group_type)}</h3><p className="mt-1 text-xs text-zinc-500">יש לבחור אפשרות אחת מהקבוצה</p><ul className="mt-2 divide-y divide-white/5">{group.items.map((item,index) => (
                    <li
                      key={item.id}
                      className={`flex justify-between gap-4 py-3 text-sm ${index===0?"font-bold text-[#E7C85D]":""}`}
                    >
                      <span>{index===0?"מאכל ראשי · ":"חלופה · "}{names.get(item.food_id) ?? "מזון לא זמין"}</span>
                      <span className="text-zinc-500">
                        {item.display_quantity??item.amount} {item.measurement_unit==="יחידות"?"יחידות":"גרם"} · {item.calculated_calories} קל׳
                      </span>
                    </li>
                  ))}</ul></section>)}
                </div>}
              </article>
            ))}
        </div>
      </div>
    </main>
  );
}

function groupName(type:string){return({protein:"מנת חלבון",carbohydrate:"מנת פחמימה",fat:"מנת שומן",vegetables:"ירקות"} as Record<string,string>)[type]??"קבוצת מזון"}
