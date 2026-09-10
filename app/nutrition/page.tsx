import { redirect } from "next/navigation";
import { Fragment } from "react";
import ClientShell from "@/components/client/ClientShell";
import MealOptionButton from "@/components/client/MealOptionButton";
import MealStatusControl from "@/components/client/MealStatusControl";
import MealGroupSubstitution from "@/components/client/MealGroupSubstitution";
import MealCard from "@/components/client/MealCard";
import { selectMealGroupAlternative } from "@/app/actions/product";
import {
  getActiveClientMenu,
  getAuthContext,
  getFreeMenuDay,
  listClientFoodLog,
  listDatabaseFoods,
  getClientNutritionBehavior,
} from "@/lib/data/product-repository";
import FreeMenu from "@/components/client/FreeMenu";
import { unitLabel } from "@/lib/nutrition/meal-alternatives";
import { householdMeasure } from "@/lib/nutrition/household-measures";
import { israelDateKey, israelWeekday, ISRAEL_TIME_ZONE, formatIsraelDate } from "@/lib/date-time";
import NutritionDayStrip from "@/components/client/NutritionDayStrip";
import RepeatYesterday from "@/components/client/RepeatYesterday";
import PortionOverride from "@/components/client/PortionOverride";
import LoggedFoodList from "@/components/client/LoggedFoodList";
import FreeCalorieMeal from "@/components/client/FreeCalorieMeal";
import OutsideMenuFood from "@/components/client/OutsideMenuFood";
import { sumLoggedFood } from "@/lib/nutrition/food-log";
import { addTotals, eatenFromMenu, remainingInMenu } from "@/lib/nutrition/menu-intake";
import { dailyNutritionInsights } from "@/lib/nutrition/daily-insights";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { masterFoodGroup } from "@/lib/nutrition/master-foods";

// "אכלתי משהו אחר" runs the photo/text estimator inside a server action, and a
// server action executes on the route segment that hosts it. Vercel's default
// budget for a Node function is ten seconds, which a vision model does not
// finish in - the save was being killed by the platform rather than by the
// estimator's own cut-off, so the client got an error instead of the unmeasured
// row the action is written to fall back to. Sixty is the ceiling on the plan
// this runs on; the estimator itself gives up well before it.
export const maxDuration = 60;

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");
  const now = israelDateKey();
  // Which day is on screen.
  //
  // Everything here has always been stored per date - the selections, the marks,
  // the amounts, the food log - and the screen simply never asked for any date
  // but this one. So a client who marked four meals and went to bed had no way
  // to close the fifth in the morning, and no way to look at what they ate
  // yesterday at all.
  //
  // The week as it is counted in Hebrew: Sunday to Saturday, in that order.
  //
  // This was the last seven days, newest first, so the row started on today and
  // ran backwards - a Wednesday put Thursday of the previous week beside Sunday
  // of this one, and no two consecutive screens showed the same week. A week has
  // a first day and a last day here, and they do not move.
  //
  // Days later in the week are drawn and not opened. Tomorrow has not happened,
  // and the database says so from its own side: every write checks the
  // assignment was active on that date.
  const weekOpens = new Date(`${now}T12:00:00Z`);
  weekOpens.setUTCDate(weekOpens.getUTCDate() - israelWeekday(now));
  const days = Array.from({ length: 7 }, (_, ahead) => {
    const day = new Date(weekOpens);
    day.setUTCDate(day.getUTCDate() + ahead);
    return day.toISOString().slice(0, 10);
  });
  const requested = (await searchParams).date;
  // A day this week that has already happened. Anything else falls back to today.
  const today = requested && days.includes(requested) && requested <= now ? requested : now;
  const isToday = today === now;
  const supabase = await createSupabaseServerClient();
  const [menu, freeMenu, foods, logged, behavior, favoriteResult] = await Promise.all([
    getActiveClientMenu(auth.id, today),
    getFreeMenuDay(auth.id, today),
    listDatabaseFoods(),
    listClientFoodLog(auth.id, today),
    getClientNutritionBehavior(auth.id,today),
    supabase.from("food_favorites").select("food_id").eq("user_id", auth.id),
  ]);
  // Favourites only reorder the food picker. This screen is the client's plan,
  // the day's log and today's totals, and none of that should disappear
  // because one convenience table was briefly unreachable - which is the rule
  // the rest of the codebase already follows for optional reads.
  if (favoriteResult.error)
    console.error("food favourites unavailable", { code: favoriteResult.error.code });
  const favoriteIds = new Set((favoriteResult.data ?? []).map((row) => String(row.food_id)));
  // What was eaten instead, and what of it carries figures. Only the measured
  // part joins the day's totals; the rest is shown as unmeasured rather than
  // counted as zero.
  const loggedTotals=sumLoggedFood(logged);
  // Eaten and still to come, kept apart. A single number cannot answer "how am I
  // doing" and "what is left", and a slash between two figures says neither: it
  // reads as a fraction, a score or a ratio depending on who is looking.
  //
  // A meal is eaten when it says so. One marked not-eaten or eaten-something-else
  // is neither eaten nor still to come - it is answered, and counting it as
  // remaining would keep asking a question the client has already answered.
  // Anything logged was eaten by definition - that is what logging it means -
  // and a free-calorie window marked eaten counts for what was left of it after
  // whatever went in. It used to count for nothing: a window has no rows, so the
  // arithmetic over rows returned zero and marking "300 קל׳ חופשיות" as eaten
  // moved no number on any screen.
  // The catalogue as the "אכלתי משהו אחר" sheet needs it: enough to search by,
  // and the four figures it needs to turn a weight into a count.
  const pickableFoods = foods.map((food) => ({
    id: String(food.id),
    name: String(food.name),
    brand: food.brand ? String(food.brand) : null,
    category: food.category ? String(food.category) : undefined,
    calories: food.calories === null ? null : Number(food.calories),
    protein: food.protein === null ? null : Number(food.protein),
    carbs: food.carbs === null ? null : Number(food.carbs),
    fat: food.fat === null ? null : Number(food.fat),
    clientAdded: food.created_by === auth.id,
    personalFavorite: favoriteIds.has(String(food.id)),
    isMaster: Boolean(masterFoodGroup(String(food.id))),
    masterGroup: masterFoodGroup(String(food.id)),
  }));
  // What was logged against a meal that is no longer in the menu.
  //
  // A logged row is keyed by date and meal, and the coach replacing a menu
  // replaces its meals - so anything the client had already recorded that day
  // lost the meal it hung under. It went on counting, correctly, and stopped
  // being displayed anywhere, which is the worst of both: the day's total moved
  // for a reason the client could not see and could not undo, because the delete
  // button lives on the row that was no longer being drawn.
  //
  // Kept rather than deleted - the client did eat it - and shown under its own
  // heading with its own delete, so a total that looks wrong can be read and,
  // if it was a mistake, taken back.
  const orphanedLogs = logged.filter((entry) =>
    entry.mealId && !(menu?.meals ?? []).some((meal) => meal.id === entry.mealId));
  // Entries created from the global "outside the menu" card deliberately have
  // no meal id. They used to affect the totals without being rendered anywhere,
  // so the client could neither see what moved the numbers nor delete a mistake.
  const outsideMenuLogs = logged.filter((entry) => !entry.mealId);
  const loggedCaloriesIn = (mealId: string | undefined) =>
    logged.filter((entry) => entry.mealId === mealId).reduce((sum, entry) => sum + (entry.calories ?? 0), 0);
  const eatenTotals = addTotals(eatenFromMenu(menu?.meals ?? [], loggedCaloriesIn), loggedTotals);
  const remainingTotals = remainingInMenu(menu?.meals ?? []);
  const anyChoiceMade = menu?.meals.some((meal) => meal.groups.some((group) => group.selectedItemId)) ?? false;
  const answeredMeals = menu?.meals.filter((meal) => Boolean(meal.status || meal.completed)).length ?? 0;
  const unansweredMeals = Math.max(0, (menu?.meals.length ?? 0) - answeredMeals);
  const nutritionInsights = dailyNutritionInsights({
    eaten: eatenTotals,
    targets: {
      calories: menu?.calorieTarget,
      protein: menu?.proteinTarget,
      carbs: menu?.carbohydrateTarget,
      fat: menu?.fatTarget,
    },
    answeredMeals,
    unansweredMeals,
    measuredOutsideItems: loggedTotals.measured,
    unmeasuredOutsideItems: loggedTotals.unmeasured,
    isToday,
    behavior,
  });
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
  const outsideMenuAfterMealId = menu
    ? (menu.meals.find((meal) => meal.title === "קלוריות חופשיות")
      ?? menu.meals.find((meal) => meal.title === "ארוחת ערב")
      ?? menu.meals.at(-1))?.id
    : null;
  const outsideMenuSection = (
    <section className="space-y-3">
      <OutsideMenuFood date={today} foods={pickableFoods}/>
      <LoggedFoodList entries={outsideMenuLogs}/>
    </section>
  );

  return (
    <ClientShell>
      {/* No page header. "התזונה שלי / הארוחות של היום / <שם התפריט>" was three
          lines and about 140px saying what the day strip below it, the bottom
          bar behind it and the tile that opened it all already say. The heading
          stays for anyone listening rather than looking. */}
      <h1 className="sr-only">
        {isToday ? "הארוחות של היום" : `הארוחות של ${formatIsraelDate(`${today}T12:00:00Z`, { weekday: "long", day: "numeric", month: "long" })}`}
      </h1>
      <NutritionDayStrip days={days} active={today} today={now} />
      {/* One row of tools, not three stacked ones.
          
          The jump-to-current-meal link, the repeat-yesterday button and the
          shopping list each had a line of their own, which is about 200px of a
          screen whose job is to show meals. They are all the same kind of thing
          - a shortcut off this screen - so they share a line and wrap only if
          they have to.
          
          The barcode scanner is not among them any more. The same scanner is a
          tab inside every meal's "אכלתי משהו אחר" sheet, so the card here was a
          second door to one room, charging 90px for it. */}
      <div className="nutrition-toolbar">
        {/* Only while there is something to jump to: once the current meal is
            marked, the anchor is gone and so is this. */}
        {isToday&&menu?.meals.some((meal)=>meal.title===currentMealTitle&&!meal.status&&!meal.completed)
          ? <a href="#current-meal" className="chip">לארוחה של עכשיו · {currentMealTitle}</a>
          : null}
        {/* How many groups are still waiting for a choice today. Appears only
            while that number is above zero. */}
        {menu?<RepeatYesterday date={today} remaining={menu.meals.flatMap((meal)=>meal.groups).filter((group)=>!group.selectedItemId).length}/>:null}
      </div>

      {freeMenu ? <div className="space-y-4"><FreeMenu date={today} day={freeMenu} foods={foods}/>{outsideMenuSection}</div> : menu ? (
        <div className="space-y-4">
          {menu.meals.map((meal) => {
            // Eating one part of a meal is still eating. The button becomes
            // available after any macro group is chosen; unchosen groups are
            // recorded as zero intake by the server.
            const noChoice = !meal.freeCalorieTarget && meal.groups.length > 0 && !meal.groups.some((group) => group.selectedItemId);
            // Marked, not reordered: the day still reads in its own order, and
            // the meal that is due right now says so.
            const isNow = isToday && meal.title === currentMealTitle && !meal.status && !meal.completed;
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
              : noChoice ? "ממתין לבחירה"
              : "טרם סומן";
            return <Fragment key={meal.id}>
            <MealCard
              id={isNow ? "current-meal" : undefined}
              // Six meals in one scroll is a page nobody reads to the end. Each
              // one is a closed row carrying what it costs and where it stands,
              // and the meal that is due right now is the one already open.
              // Which card is open after that is the client's business, not this
              // render's - see the component.
              defaultOpen={isNow}
              className={`start-surface meal-card rounded-[24px]${isNow ? " border-2 border-[#16A34A]" : ""}`}
              summary={
                <span className="min-w-0">
                  <strong className="block text-lg font-black">{meal.title}{isNow ? <span className="pill pill--green mr-2">עכשיו</span> : null}</strong>
                  <span className="mt-1 block text-xs text-[#5B5F5B]">{mealCalories} קל׳ · {mark}</span>
                </span>
              }
            >
              <div className="meal-card__body">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  {meal.freeCalorieTarget?<p className="text-xs text-[#5B5F5B]">מסגרת: {meal.freeCalorieTarget} קל׳</p>:<p className="text-xs text-[#5B5F5B]">אפשר לסמן לאחר בחירת פריט אחד לפחות</p>}
                </div>
                <MealStatusControl
                  mealId={meal.id}
                  date={today}
                  status={meal.status}
                  statusNote={meal.statusNote}
                  completed={meal.completed}
                  blocked={noChoice}
                  foods={pickableFoods}
                />
              </div>
              {meal.notes?<p className="mt-3 text-sm text-[#5B5F5B]">{meal.notes}</p>:null}
              {/* What was eaten instead of this meal, under the meal it replaced. */}
              <LoggedFoodList entries={logged.filter((entry)=>entry.mealId===meal.id)}/>
              {meal.freeCalorieTarget?(()=>{
                const mine=logged.filter((entry)=>entry.mealId===meal.id);
                const measured=mine.filter((entry)=>entry.calories!==null);
                return <FreeCalorieMeal
                  mealId={meal.id}
                  date={today}
                  frame={meal.freeCalorieTarget}
                  logged={measured.reduce((sum,entry)=>sum+(entry.calories??0),0)}
                  unmeasured={mine.length-measured.length}
                />;
              })():<div className="mt-4 grid gap-4 md:grid-cols-2 md:items-start [&>*]:min-w-0">
                {meal.groups.map(group=><fieldset key={group.id} className="min-w-0 rounded-2xl border border-[#E5E7E5] p-3 sm:p-4"><legend className="px-2 font-black">{groupLabel(group.type)}</legend><p className="text-xs text-[#5B5F5B]">בחר אפשרות אחת מתוך {group.items.length}. לחיצה נוספת מבטלת בחירה.</p><div className="mt-3 space-y-1">{group.items.map(item=><form key={item.id} action={selectMealGroupAlternative}>
                    <input type="hidden" name="groupId" value={group.id}/><input type="hidden" name="mealId" value={meal.id}/><input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="date" value={today}/><input type="hidden" name="selected" value={group.selectedItemId===item.id?"true":"false"}/>
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
                  <MealGroupSubstitution mealId={meal.id} date={today} groupLabel={groupLabel(group.type)} foods={pickableFoods}/>
                  </fieldset>)}
              </div>}
              </div>
            </MealCard>
            {meal.id === outsideMenuAfterMealId ? outsideMenuSection : null}
          </Fragment>;})}
          {orphanedLogs.length ? (
            <section className="start-surface rounded-[24px] p-5 sm:p-6" aria-labelledby="orphaned-logs">
              <h2 id="orphaned-logs" className="text-lg font-black">נרשם היום, מחוץ לתפריט הנוכחי</h2>
              <p className="mt-1 text-xs text-[#5B5F5B]">
                נרשם לארוחה שכבר אינה בתפריט של היום — למשל אחרי שהמאמן החליף תפריט.
                זה נספר ביום שלך; אם נרשם בטעות אפשר למחוק כאן.
              </p>
              <LoggedFoodList entries={orphanedLogs} />
            </section>
          ) : null}

          {/* What the day adds up to, under the day rather than over it.
              
              This sat above the first meal, so the screen opened on four macro
              figures and the meals began below the fold - and the figures are a
              summary of what is underneath them, which is not something to read
              first. Nothing about it changed but where it is. */}
          {(
            <section
              aria-labelledby="daily-macro-summary"
              className="start-surface rounded-[24px] p-5 sm:p-6"
            >
              <h2 id="daily-macro-summary" className="text-lg font-black">
                מה נאכל היום
              </h2>
              <p className="mt-1 text-xs text-[#5B5F5B]">
                {anyChoiceMade
                  ? "המספר הגדול הוא מה שכבר נאכל. מתחתיו — מה שנשאר בתפריט להיום."
                  : "עדיין לא סומנה אף ארוחה. המספרים יתמלאו ככל שתסמנו."}
                {loggedTotals.measured ? ` נוספו ${loggedTotals.measured} פריטים שנרשמו מחוץ לתפריט.` : ""}
                {loggedTotals.unmeasured ? ` ${loggedTotals.unmeasured} פריטים שרשמת אינם נספרים — אין להם ערכים מאושרים.` : ""}
              </p>
              {/* No targets here. A target is the coach's instrument, and a menu
                  does not always land on the protein or the carbohydrate figure
                  on purpose - the coach trades them off knowingly. Printing the
                  gap to a client turns every deliberate decision into a number
                  they appear to have missed. The coach still sees both sides,
                  in the builder and on the client file. */}
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MacroTotal label="קלוריות" value={eatenTotals.calories} left={remainingTotals.calories} target={menu.calorieTarget} unit="קל׳" />
                <MacroTotal label="חלבון" value={eatenTotals.protein} left={remainingTotals.protein} target={menu.proteinTarget} unit="גרם" />
                <MacroTotal label="פחמימות" value={eatenTotals.carbs} left={remainingTotals.carbs} target={menu.carbohydrateTarget} unit="גרם" />
                <MacroTotal label="שומן" value={eatenTotals.fat} left={remainingTotals.fat} target={menu.fatTarget} unit="גרם" />
              </dl>
            </section>
          )}
          {(nutritionInsights.preserve.length || nutritionInsights.improve.length) ? (
            <section aria-labelledby="nutrition-improvement" className="start-surface rounded-[24px] p-5 sm:p-6">
              <h2 id="nutrition-improvement" className="text-lg font-black">שיפור ושימור</h2>
              <p className="mt-1 text-xs text-[#5B5F5B]">דוח לפי ההתנהגות שנרשמה היום, בשבוע האחרון וב־30 הימים האחרונים.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <NutritionInsightList title="לשמר" items={nutritionInsights.preserve} tone="positive" />
                <NutritionInsightList title="לשפר" items={nutritionInsights.improve} tone="attention" />
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="start-empty rounded-[24px] p-10 text-center sm:p-12">
            <h2 className="font-black">{isToday ? "עדיין אין תפריט פעיל" : "לא היה תפריט פעיל ביום הזה"}</h2>
            <p className="mt-2 text-sm text-[#5B5F5B]">
              {isToday ? "לאחר שהמאמן יפעיל תפריט, הארוחות יופיעו כאן." : "אפשר לחזור להיום ולהמשיך משם."}
            </p>
          </div>
          {outsideMenuSection}
        </div>
      )}
    </ClientShell>
  );
}

function NutritionInsightList({
  title,
  items,
  tone,
}: {
  title: string;
  items: readonly string[];
  tone: "positive" | "attention";
}) {
  const positive = tone === "positive";
  return (
    <div className={`rounded-2xl border p-4 ${positive ? "border-[#BBF7D0] bg-[#F0FDF4]" : "border-[#FECACA] bg-[#FEF2F2]"}`}>
      <h3 className={`font-black ${positive ? "text-[#15803D]" : "text-[#B91C1C]"}`}>{title}</h3>
      {items.length ? (
        <ul className="mt-2 space-y-2 text-sm">
          {items.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      ) : <p className="mt-2 text-sm text-[#5B5F5B]">אין עדיין מספיק נתונים.</p>}
    </div>
  );
}

function groupLabel(type:string){return({protein:"מנת חלבון",carbohydrate:"מנת פחמימה",fat:"מנת שומן",vegetables:"ירקות"} as Record<string,string>)[type]??"קבוצת מזון"}

function MacroTotal({
  label,
  value,
  left,
  target,
  unit,
}: {
  label: string;
  value: number;
  /** Still on the plan for today, in meals not yet answered. */
  left: number;
  target?: number | null;
  unit: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-3">
      <dt className="text-xs text-[#5B5F5B]">{label}</dt>
      {/* Named, not slashed. Which figure is which is the whole question. */}
      <dd className="mt-1 font-black">
        {Math.round(value)} {unit}
      </dd>
      <p className={`mt-1 text-xs ${target && value - target > 0.5 ? "font-bold text-[#DC2626]" : "text-[#5B5F5B]"}`}>
        {target && target > 0
          ? value - target > 0.5
            ? `חריגה של ${Math.round(value - target)} ${unit}`
            : target - value > 0.5
              ? `נותרו ${Math.round(target - value)} ${unit} ליעד`
              : "היעד הושלם"
          : left > 0.5 ? `נותרו ${Math.round(left)} בתפריט` : "אין עוד ארוחות לסמן"}
      </p>
    </div>
  );
}
