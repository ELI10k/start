import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import SubmitButton from "@/components/forms/SubmitButton";
import {
  setMealCompletion,
  selectMealGroupAlternative,
} from "@/app/actions/product";
import {
  getActiveClientMenu,
  getAuthContext,
  getFreeMenuDay,
  listDatabaseFoods,
} from "@/lib/data/product-repository";
import FreeMenu from "@/components/client/FreeMenu";

export default async function NutritionPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");
  const today = new Date().toISOString().slice(0, 10);
  const [menu, freeMenu, foods] = await Promise.all([getActiveClientMenu(auth.id, today),getFreeMenuDay(auth.id, today),listDatabaseFoods()]);
  const freeCalories=menu?.meals.reduce((sum,meal)=>sum+(meal.freeCalorieTarget??0),0)??0;
  const menuTotals = menu?.meals
    .flatMap((meal) => meal.groups.flatMap(group=>group.items.filter(item=>item.id===group.selectedItemId)))
    .reduce(
      (sum, item) => ({
        calories: sum.calories + item.calories,
        protein: sum.protein + item.protein,
        carbs: sum.carbs + item.carbs,
        fat: sum.fat + item.fat,
      }),
      { calories: freeCalories, protein: 0, carbs: 0, fat: 0 },
    );
  return (
    <ClientShell>
      <PageHeader
        eyebrow="התזונה שלי"
        title="הארוחות של היום"
        description={menu?.title ?? "התפריט האישי שלך"}
      />
      {freeMenu ? <FreeMenu date={today} day={freeMenu} foods={foods}/> : menu ? (
        <div className="space-y-4">
          {menuTotals ? (
            <section
              aria-labelledby="daily-macro-summary"
              className="start-surface rounded-[24px] p-5 sm:p-6"
            >
              <h2 id="daily-macro-summary" className="text-lg font-black">
                סיכום התפריט היומי
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MacroTotal label="קלוריות" value={menuTotals.calories} target={menu.calorieTarget} unit="קל׳" />
                <MacroTotal label="חלבון" value={menuTotals.protein} target={menu.proteinTarget} unit="גרם" />
                <MacroTotal label="פחמימות" value={menuTotals.carbs} target={menu.carbohydrateTarget} unit="גרם" />
                <MacroTotal label="שומן" value={menuTotals.fat} target={menu.fatTarget} unit="גרם" />
              </dl>
            </section>
          ) : null}
          {menu.meals.map((meal) => (
            <article
              key={meal.id}
              className="start-surface rounded-[24px] p-5 sm:p-6"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">{meal.title}</h2>
                  {meal.freeCalorieTarget?<p className="mt-1 text-xs text-zinc-500">מסגרת: {meal.freeCalorieTarget} קל׳</p>:<p className="mt-1 text-xs text-zinc-500">יש לבחור חלופה אחת מכל קבוצה</p>}
                </div>
                <form action={setMealCompletion}>
                  <input type="hidden" name="id" value={meal.id} />
                  <input type="hidden" name="date" value={today} />
                  <input
                    type="hidden"
                    name="eaten"
                    value={meal.completed ? "false" : "true"}
                  />
                  <SubmitButton
                    idle={meal.completed ? "ביטול השלמה" : "סימון הארוחה כנאכלה"}
                    pending="שומרים…"
                    className={
                      meal.completed
                        ? "min-h-11 rounded-xl border border-emerald-400/30 px-4 text-sm font-bold text-emerald-300 disabled:opacity-50"
                        : "min-h-11 rounded-xl bg-[#D4AF37] px-4 text-sm font-black text-black disabled:opacity-50"
                    }
                  />
                </form>
              </div>
              {meal.notes?<p className="mt-3 text-sm text-zinc-400">{meal.notes}</p>:null}
              {meal.freeCalorieTarget?<p className="mt-4 rounded-xl border border-[#D4AF37]/20 p-4 text-sm text-[#E7C85D]">אפשר לבחור כל מזון, כל עוד הסך נשאר במסגרת {meal.freeCalorieTarget} קלוריות.</p>:<div className="mt-4 space-y-4">
                {meal.groups.map(group=><fieldset key={group.id} className="rounded-2xl border border-white/10 p-4"><legend className="px-2 font-black">{groupLabel(group.type)}</legend><div className="mt-2 space-y-2">{group.items.map(item=><form key={item.id} action={selectMealGroupAlternative} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm ${group.selectedItemId===item.id?"border-[#D4AF37] bg-[#D4AF37]/5":"border-white/5"}`}>
                    <input type="hidden" name="groupId" value={group.id}/><input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="date" value={today}/>
                    <div>
                      <span className={group.selectedItemId===item.id ? "text-[#E7C85D]" : ""}>
                        {item.itemRole==="primary"?"מאכל ראשי: ":"חלופה: "}{item.name}
                      </span>
                      <span className="mr-2 text-zinc-500">
                        {item.displayQuantity} {item.measurementUnit} · {item.calories} קל׳
                      </span>
                    </div>
                    <SubmitButton idle={group.selectedItemId===item.id?"נבחר":"בחירה"} pending="שומרים…" className="min-h-10 rounded-xl border border-[#4A3915] px-3 text-xs font-bold text-[#E7C85D] disabled:opacity-50"/>
                  </form>)}</div></fieldset>)}
              </div>}
            </article>
          ))}
        </div>
      ) : (
        <div className="start-empty rounded-[24px] p-10 text-center sm:p-12">
          <h2 className="font-black">עדיין אין תפריט פעיל</h2>
          <p className="mt-2 text-sm text-zinc-500">
            לאחר שהמאמן יפעיל תפריט, הארוחות יופיעו כאן.
          </p>
        </div>
      )}
    </ClientShell>
  );
}

function groupLabel(type:string){return({protein:"מנת חלבון",carbohydrate:"מנת פחמימה",fat:"מנת שומן",vegetables:"ירקות"} as Record<string,string>)[type]??"קבוצת מזון"}

function MacroTotal({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target?: number;
  unit: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 font-black">
        {value.toFixed(1)} {unit}
      </dd>
      {target ? (
        <p className="mt-1 text-xs text-zinc-500">
          יעד: {Number(target).toFixed(1)} {unit}
        </p>
      ) : null}
    </div>
  );
}
