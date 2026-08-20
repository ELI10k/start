import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import BarcodeScanner from "@/components/client/BarcodeScanner";
import MealOptionButton from "@/components/client/MealOptionButton";
import MealStatusControl from "@/components/client/MealStatusControl";
import { selectMealGroupAlternative } from "@/app/actions/product";
import {
  getActiveClientMenu,
  getAuthContext,
  getFreeMenuDay,
  listClientFoodLog,
  listDatabaseFoods,
} from "@/lib/data/product-repository";
import FreeMenu from "@/components/client/FreeMenu";
import { unitLabel } from "@/lib/nutrition/meal-alternatives";
import { householdMeasure } from "@/lib/nutrition/household-measures";
import { israelDateKey, ISRAEL_TIME_ZONE } from "@/lib/date-time";
import ShoppingList from "@/components/client/ShoppingList";
import RepeatYesterday from "@/components/client/RepeatYesterday";
import PortionOverride from "@/components/client/PortionOverride";
import LoggedFoodList from "@/components/client/LoggedFoodList";
import { sumLoggedFood } from "@/lib/nutrition/food-log";

export default async function NutritionPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");
  const today = israelDateKey();
  const [menu, freeMenu, foods, logged] = await Promise.all([getActiveClientMenu(auth.id, today),getFreeMenuDay(auth.id, today),listDatabaseFoods(),listClientFoodLog(auth.id, today)]);
  // What was eaten instead, and what of it carries figures. Only the measured
  // part joins the day's totals; the rest is shown as unmeasured rather than
  // counted as zero.
  const loggedTotals=sumLoggedFood(logged);
  const freeCalories=menu?.meals.reduce((sum,meal)=>sum+(meal.freeCalorieTarget??0),0)??0;
  // Before any choice is made the summary used to read 0 against the target,
  // which looks like a broken screen rather than "you have not started". Where a
  // group has no chosen alternative yet the primary stands in for it, so the
  // number opens as the day the coach planned and then follows the real choices.
  const summaryItems = menu?.meals.flatMap((meal) =>
    meal.groups.flatMap((group) => {
      const chosen = group.items.find((item) => item.id === group.selectedItemId);
      if (chosen) return [chosen];
      const primary = group.items.find((item) => item.itemRole === "primary") ?? group.items[0];
      return primary ? [primary] : [];
    })) ?? [];
  const anyChoiceMade = menu?.meals.some((meal) => meal.groups.some((group) => group.selectedItemId)) ?? false;
  const menuTotals = menu
    ? summaryItems.reduce(
      (sum, item) => ({
        calories: sum.calories + item.calories,
        protein: sum.protein + item.protein,
        carbs: sum.carbs + item.carbs,
        fat: sum.fat + item.fat,
      }),
      { calories: freeCalories + loggedTotals.calories, protein: loggedTotals.protein, carbs: loggedTotals.carbs, fat: loggedTotals.fat },
    )
    : undefined;
  // Which meal it is now. The fixed meal titles map to the day, so the screen can
  // open on the meal the client came to mark instead of at the top of a list of
  // six. Free text from onboarding is not used for this - it cannot be relied on
  // to parse - so the windows are the ones the fixed titles already imply.
  const hour = Number(new Intl.DateTimeFormat("he-IL", { timeZone: ISRAEL_TIME_ZONE, hour: "2-digit", hour12: false }).format(new Date()));
  const currentMealTitle =
    hour < 10 ? "ארוחת בוקר"
    : hour < 12 ? "ארוחת ביניים 1"
    : hour < 16 ? "ארוחת צהריים"
    : hour < 18 ? "ארוחת ביניים 2"
    : "ארוחת ערב";

  return (
    <ClientShell>
      <PageHeader
        eyebrow="התזונה שלי"
        title="הארוחות של היום"
        description={menu?.title ?? "התפריט האישי שלך"}
      />
      {/* The screen already works out which meal is due and gives it an anchor -
          nothing ever linked to it, so a client at 19:00 still scrolled past five
          meals to reach dinner. One link, only while there is something to jump
          to: once the current meal is marked, the anchor is gone and so is this. */}
      {/* How many groups are still waiting for a choice today. The button only
          appears while that number is above zero. */}
      {menu?<RepeatYesterday date={today} remaining={menu.meals.flatMap((meal)=>meal.groups).filter((group)=>!group.selectedItemId).length}/>:null}
      {menu?.meals.some((meal)=>meal.title===currentMealTitle&&!meal.status&&!meal.completed)
        ? <a href="#current-meal" className="chip mb-3 inline-flex">לארוחה של עכשיו · {currentMealTitle}</a>
        : null}
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <BarcodeScanner date={today}/>
        {menu ? <ShoppingList
          title={menu.title}
          items={menu.meals.flatMap((meal)=>meal.groups.flatMap((group)=>group.items.map((item)=>({
            name:item.name,displayQuantity:Number(item.displayQuantity),measurementUnit:item.measurementUnit,itemRole:item.itemRole,
          }))))}
        /> : null}
      </div>
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
              <p className="mt-1 text-xs text-[#5B5F5B]">
                {anyChoiceMade
                  ? "מחושב לפי החלופות שבחרת. קבוצה שטרם נבחרה נספרת לפי המאכל הראשי."
                  : "כך נראה היום המתוכנן. הסיכום יתעדכן לפי החלופות שתבחרו."}
                {loggedTotals.measured ? ` נוספו ${loggedTotals.measured} פריטים שסרקת.` : ""}
                {loggedTotals.unmeasured ? ` ${loggedTotals.unmeasured} פריטים שרשמת אינם נספרים — אין להם ערכים מאושרים.` : ""}
              </p>
              {/* No targets here. A target is the coach's instrument, and a menu
                  does not always land on the protein or the carbohydrate figure
                  on purpose - the coach trades them off knowingly. Printing the
                  gap to a client turns every deliberate decision into a number
                  they appear to have missed. The coach still sees both sides,
                  in the builder and on the client file. */}
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MacroTotal label="קלוריות" value={menuTotals.calories} unit="קל׳" />
                <MacroTotal label="חלבון" value={menuTotals.protein} unit="גרם" />
                <MacroTotal label="פחמימות" value={menuTotals.carbs} unit="גרם" />
                <MacroTotal label="שומן" value={menuTotals.fat} unit="גרם" />
              </dl>
            </section>
          ) : null}
          {menu.meals.map((meal) => {
            // The database refuses to mark a meal eaten until every group has a
            // chosen alternative. That rule was only discoverable by pressing the
            // button and landing on the error screen, so the button now states the
            // condition and waits for it.
            const missingChoice = !meal.freeCalorieTarget && meal.groups.some((group) => !group.selectedItemId);
            // Marked, not reordered: the day still reads in its own order, and
            // the meal that is due right now says so.
            const isNow = meal.title === currentMealTitle && !meal.status && !meal.completed;
            // What this meal costs as it currently stands: the chosen alternative
            // in each group, or the primary where nothing is chosen yet - the same
            // rule the daily summary uses, so the two never disagree.
            const mealCalories = Math.round(meal.groups.reduce((sum, group) => {
              const chosen = group.items.find((item) => item.id === group.selectedItemId);
              const primary = group.items.find((item) => item.itemRole === "primary") ?? group.items[0];
              return sum + ((chosen ?? primary)?.calories ?? 0);
            }, meal.freeCalorieTarget ?? 0));
            // Where the meal stands, in one word, for the closed row.
            const mark = meal.status === "not_eaten" ? "לא נאכל"
              : meal.status === "other" ? "נאכל משהו אחר"
              : (meal.status === "eaten" || meal.completed) ? "נאכל"
              : missingChoice ? "ממתין לבחירה"
              : "טרם סומן";
            return (
            <details
              key={meal.id}
              id={isNow ? "current-meal" : undefined}
              // Six meals in one scroll is a page nobody reads to the end. Each
              // one is a closed row carrying what it costs and where it stands,
              // and the meal that is due right now is the one already open.
              open={isNow}
              className={`start-surface meal-card rounded-[24px]${isNow ? " border-2 border-[#16A34A]" : ""}`}
            >
              <summary className="meal-card__summary">
                <span className="min-w-0">
                  <strong className="block text-lg font-black">{meal.title}{isNow ? <span className="pill pill--green mr-2">עכשיו</span> : null}</strong>
                  <span className="mt-1 block text-xs text-[#5B5F5B]">{mealCalories} קל׳ · {mark}</span>
                </span>
              </summary>
              <div className="meal-card__body">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  {meal.freeCalorieTarget?<p className="text-xs text-[#5B5F5B]">מסגרת: {meal.freeCalorieTarget} קל׳</p>:<p className="text-xs text-[#5B5F5B]">יש לבחור חלופה אחת מכל קבוצה</p>}
                </div>
                <MealStatusControl
                  mealId={meal.id}
                  date={today}
                  status={meal.status}
                  statusNote={meal.statusNote}
                  completed={meal.completed}
                  blocked={missingChoice}
                />
              </div>
              {meal.notes?<p className="mt-3 text-sm text-[#5B5F5B]">{meal.notes}</p>:null}
              {/* What was eaten instead of this meal, under the meal it replaced. */}
              <LoggedFoodList entries={logged.filter((entry)=>entry.mealId===meal.id)}/>
              {meal.freeCalorieTarget?<p className="mt-4 rounded-xl border border-[#16A34A]/20 p-4 text-sm text-[#16A34A]">אפשר לבחור כל מזון, כל עוד הסך נשאר במסגרת {meal.freeCalorieTarget} קלוריות.</p>:<div className="mt-4 grid gap-4 md:grid-cols-2 md:items-start [&>*]:min-w-0">
                {meal.groups.map(group=><fieldset key={group.id} className="min-w-0 rounded-2xl border border-[#E5E7E5] p-3 sm:p-4"><legend className="px-2 font-black">{groupLabel(group.type)}</legend><p className="text-xs text-[#5B5F5B]">בחר אפשרות אחת מתוך {group.items.length}</p><div className="mt-3 space-y-1">{group.items.map(item=><form key={item.id} action={selectMealGroupAlternative}>
                    <input type="hidden" name="groupId" value={group.id}/><input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="date" value={today}/>
                    <MealOptionButton
                      selected={group.selectedItemId===item.id}
                      name={item.name}
                      quantity={String(item.displayQuantity)}
                      unit={unitLabel(item.measurementUnit,Number(item.displayQuantity))}
                      calories={String(item.calories)}
                      household={householdMeasure(item.amount,group.type,item.measurementUnit,meal.title)?.label}
                      note={item.note}
                    />
                  </form>)}</div>
                  {/* Only where something is chosen: an amount with nothing
                      chosen is an amount of nothing. */}
                  {(()=>{const chosen=group.items.find(item=>item.id===group.selectedItemId);return chosen?<PortionOverride
                    groupId={group.id}
                    date={today}
                    planned={String(chosen.displayQuantity)}
                    unit={unitLabel(chosen.measurementUnit,Number(chosen.displayQuantity))}
                    current={group.amountOverride}
                  />:null})()}
                  </fieldset>)}
              </div>}
              </div>
            </details>
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
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-3">
      <dt className="text-xs text-[#5B5F5B]">{label}</dt>
      <dd className="mt-1 font-black">
        {value.toFixed(1)} {unit}
      </dd>
    </div>
  );
}
