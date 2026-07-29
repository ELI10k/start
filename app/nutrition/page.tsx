import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import SubmitButton from "@/components/forms/SubmitButton";
import {
  setMealCompletion,
  setMealItemCompletion,
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
  const menuTotals = menu?.meals
    .flatMap((meal) => meal.items)
    .reduce(
      (sum, item) => ({
        calories: sum.calories + item.calories,
        protein: sum.protein + item.protein,
        carbs: sum.carbs + item.carbs,
        fat: sum.fat + item.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
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
                  <p className="mt-1 text-xs text-zinc-500">
                    {meal.items
                      .reduce((sum, item) => sum + item.calories, 0)
                      .toFixed(0)}{" "}
                    קל׳
                  </p>
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
              <ul className="mt-4 divide-y divide-white/5">
                {meal.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <span className={item.eaten ? "text-emerald-300" : ""}>
                        {item.name}
                      </span>
                      <span className="mr-2 text-zinc-500">
                        {item.amount} גרם · {item.calories} קל׳
                      </span>
                    </div>
                    <form action={setMealItemCompletion}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="date" value={today} />
                      <input
                        type="hidden"
                        name="eaten"
                        value={item.eaten ? "false" : "true"}
                      />
                      <SubmitButton
                        idle={item.eaten ? "ביטול נאכל" : "סימון כנאכל"}
                        pending="שומרים…"
                        className={
                          item.eaten
                            ? "min-h-10 rounded-xl border border-emerald-400/30 px-3 text-xs font-bold text-emerald-300 disabled:opacity-50"
                            : "min-h-10 rounded-xl border border-[#4A3915] px-3 text-xs font-bold text-[#E7C85D] disabled:opacity-50"
                        }
                      />
                    </form>
                  </li>
                ))}
              </ul>
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
