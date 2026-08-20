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
    <main className="px-4 py-8 text-[#0B0B0B] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs text-[#16A34A]">תצוגה מקדימה · {menu.status}</p>
        <h1 className="mt-2 text-3xl font-black">{menu.title}</h1>
        <p className="mt-2 text-[#5B5F5B]">{menu.description}</p>
        <div className="mt-6 space-y-4">
          {(menu.days as PreviewDay[])
            .flatMap((day) => day.meals)
            .map((meal) => (
              <article
                key={meal.id}
                className="rounded-[22px] border border-[#E5E7E5] bg-[#FFFFFF] p-5"
              >
                <h2 className="text-xl font-black">{meal.title}</h2>
                {meal.notes?<p className="mt-2 text-sm text-[#5B5F5B]">{meal.notes}</p>:null}
                {meal.free_calorie_target?<p className="mt-3 rounded-xl border border-[#16A34A]/20 p-3 text-[#16A34A]">מסגרת: {meal.free_calorie_target} קלוריות חופשיות</p>:<div className="mt-3 space-y-3">
                  {(meal.groups??[]).map(group=>{
                  // Which row is the primary is a property of the row, not of its
                  // position: a group can hold more than one primary - "ביצה 1 +
                  // 2 לבני ביצה" is one protein portion built from two foods - and
                  // reading position alone showed the coach a preview with one
                  // primary where the client will be served two. Position is used
                  // only for rows saved before item_role existed.
                  const roled=group.items.some((item)=>item.item_role==="primary"||item.item_role==="alternative");
                  const isPrimary=(item:PreviewItem,index:number)=>roled?item.item_role==="primary":index===0;
                  return <section key={group.id} className="rounded-xl border border-[#E5E7E5] p-3"><h3 className="font-bold">{groupName(group.group_type)}</h3><p className="mt-1 text-xs text-[#5B5F5B]">יש לבחור אפשרות אחת מהקבוצה</p><ul className="mt-2 divide-y divide-[#E5E7E5]">{group.items.map((item,index) => (
                    <li
                      key={item.id}
                      className={`flex justify-between gap-4 py-3 text-sm ${isPrimary(item,index)?"font-bold text-[#16A34A]":""}`}
                    >
                      <span>{isPrimary(item,index)?"מאכל ראשי · ":"חלופה · "}{names.get(item.food_id) ?? "מזון לא זמין"}</span>
                      <span className="text-[#5B5F5B]">
                        {item.display_quantity??item.amount} {item.measurement_unit==="יחידות"?"יחידות":"גרם"} · {item.calculated_calories} קל׳
                      </span>
                    </li>
                  ))}</ul></section>})}
                </div>}
              </article>
            ))}
        </div>
      </div>
    </main>
  );
}

function groupName(type:string){return({protein:"מנת חלבון",carbohydrate:"מנת פחמימה",fat:"מנת שומן",vegetables:"ירקות"} as Record<string,string>)[type]??"קבוצת מזון"}
