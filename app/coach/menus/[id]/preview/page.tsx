import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { israelDateKey, israelWeekday } from "@/lib/date-time";
import { WEEKDAY_LABELS } from "@/lib/nutrition/menu-days";
import {
  getAuthContext,
  getCoachMenu,
  listDatabaseFoods,
} from "@/lib/data/product-repository";
type PreviewItem={id:string;food_id:string;amount:number|string;display_quantity?:number|string;measurement_unit?:string;item_role?:string;calculated_calories:number|string};
type PreviewDay = { day_index: number; meals: Array<{ id: string; title: string;notes?:string;free_calorie_target?:number|string; groups?:Array<{id:string;group_type:string;items:PreviewItem[]}>;items:PreviewItem[] }> };
export default async function MenuPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");
  const { id } = await params;
  const [menu, foods, query] = await Promise.all([
    getCoachMenu(auth.id, id),
    listDatabaseFoods(),
    searchParams,
  ]);
  if (!menu) notFound();
  const names = new Map(foods.map((food) => [food.id, food.name]));

  // Which day the coach is looking at.
  //
  // A menu can carry a different Tuesday, and this screen flattened every day it
  // held into one list - so a two-day menu previewed as twelve meals in a row,
  // with nothing saying which six the client sees on any given day. The whole
  // question a preview answers is "what will they be served", and it could not
  // answer it.
  //
  // The default is the day the client would be served right now, resolved by the
  // same rule getActiveClientMenu uses: today's weekday if the menu names it,
  // otherwise the lowest day it holds. Anything else would preview a day the
  // client is not on.
  const days = menu.days as PreviewDay[];
  const available = days.map((day) => day.day_index);
  const todayIndex = israelWeekday(israelDateKey());
  const served = available.includes(todayIndex) ? todayIndex : available.length ? Math.min(...available) : 0;
  const requested = Number(query.day);
  const activeDay = Number.isInteger(requested) && available.includes(requested) ? requested : served;
  const meals = days.find((day) => day.day_index === activeDay)?.meals ?? [];
  const dayName = (index: number) => index === 0 ? "ברירת מחדל" : `יום ${WEEKDAY_LABELS[index] ?? index}`;
  return (
    <main className="px-4 py-8 text-[#0B0B0B] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs text-[#16A34A]">תצוגה מקדימה · {menu.status}</p>
        <h1 className="mt-2 text-3xl font-black">{menu.title}</h1>
        <p className="mt-2 text-[#5B5F5B]">{menu.description}</p>

        {/* Only where there is a choice to make. A one-day menu is served every
            day and a row of one tab would say nothing. */}
        {available.length > 1 && (
          <nav aria-label="בחירת יום בתפריט" className="chip-row mt-4">
            {available.map((index) => (
              <Link
                key={index}
                href={index === served ? `/coach/menus/${id}/preview` : `/coach/menus/${id}/preview?day=${index}`}
                aria-current={index === activeDay ? "page" : undefined}
                className={`chip${index === activeDay ? " pill--green" : ""}`}
              >
                {dayName(index)}{index === served ? " · מוגש היום" : ""}
              </Link>
            ))}
          </nav>
        )}
        <p className="mt-3 text-sm text-[#5B5F5B]">
          {available.length > 1
            ? `זה מה שהלקוח יראה ב${dayName(activeDay)} — ${meals.length} ארוחות.`
            : `${meals.length} ארוחות, בכל יום בשבוע.`}
        </p>

        <div className="mt-6 space-y-4">
          {meals.map((meal) => (
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
