import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import SubmitButton from "@/components/forms/SubmitButton";
import MealOptionButton from "@/components/client/MealOptionButton";
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
import { unitLabel } from "@/lib/nutrition/meal-alternatives";

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
          {menu.meals.map((meal) => {
            // The database refuses to mark a meal eaten until every group has a
            // chosen alternative. That rule was only discoverable by pressing the
            // button and landing on the error screen, so the button now states the
            // condition and waits for it.
            const missingChoice = !meal.freeCalorieTarget && meal.groups.some((group) => !group.selectedItemId);
            return (
            <article
              key={meal.id}
              className="start-surface rounded-[24px] p-5 sm:p-6"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">{meal.title}</h2>
                  {meal.freeCalorieTarget?<p className="mt-1 text-xs text-[#5B5F5B]">מסגרת: {meal.freeCalorieTarget} קל׳</p>:<p className="mt-1 text-xs text-[#5B5F5B]">יש לבחור חלופה אחת מכל קבוצה</p>}
                </div>
                {missingChoice ? (
                  <p className="pill">בחרו חלופה בכל קבוצה</p>
                ) : (
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
                        ? "premium-secondary-button"
                        : "premium-primary-button"
                    }
                  />
                </form>
                )}
              </div>
              {meal.notes?<p className="mt-3 text-sm text-[#5B5F5B]">{meal.notes}</p>:null}
              {meal.freeCalorieTarget?<p className="mt-4 rounded-xl border border-[#16A34A]/20 p-4 text-sm text-[#16A34A]">אפשר לבחור כל מזון, כל עוד הסך נשאר במסגרת {meal.freeCalorieTarget} קלוריות.</p>:<div className="mt-4 grid gap-4 md:grid-cols-2 md:items-start">
                {meal.groups.map(group=><fieldset key={group.id} className="rounded-2xl border border-[#E5E7E5] p-4"><legend className="px-2 font-black">{groupLabel(group.type)}</legend><p className="text-xs text-[#5B5F5B]">בחר אפשרות אחת מתוך {group.items.length}</p><div className="mt-3 space-y-1">{group.items.map(item=><form key={item.id} action={selectMealGroupAlternative}>
                    <input type="hidden" name="groupId" value={group.id}/><input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="date" value={today}/>
                    <MealOptionButton
                      selected={group.selectedItemId===item.id}
                      name={item.name}
                      quantity={String(item.displayQuantity)}
                      unit={unitLabel(item.measurementUnit,Number(item.displayQuantity))}
                      calories={String(item.calories)}
                    />
                  </form>)}</div></fieldset>)}
              </div>}
            </article>
          );})}
        </div>
      ) : (
        <div className="start-empty rounded-[24px] p-10 text-center sm:p-12">
          <h2 className="font-black">עדיין אין תפריט פעיל</h2>
          <p className="mt-2 text-sm text-[#5B5F5B]">
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
    <div className="rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-3">
      <dt className="text-xs text-[#5B5F5B]">{label}</dt>
      <dd className="mt-1 font-black">
        {value.toFixed(1)} {unit}
      </dd>
      {target ? (
        <p className="mt-1 text-xs text-[#5B5F5B]">
          יעד: {Number(target).toFixed(1)} {unit}
        </p>
      ) : null}
    </div>
  );
}
