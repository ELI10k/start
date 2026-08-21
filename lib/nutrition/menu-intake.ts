/**
 * What a day's menu currently amounts to.
 *
 * Three screens ask this question - the client's nutrition screen, the client's
 * dashboard and the coach's client file - and until now each answered it with
 * its own arithmetic over a different field. The nutrition screen read the
 * group's chosen alternative, which carries the portion the client reported
 * eating; the other two read `meal.items`, which is every row the coach wrote at
 * the portion the coach wrote it. So a client who said "I only ate half" saw the
 * corrected figure on one screen and the planned one on the next, and the coach
 * saw the planned one everywhere.
 *
 * One rule, in one place: a meal stands at its chosen alternative in each group,
 * at the amount the client reported, or at the primary where nothing has been
 * chosen yet.
 */

export type IntakeTotals = Readonly<{ calories: number; protein: number; carbs: number; fat: number }>;

type Item = Readonly<{
  id: string;
  itemRole: "primary" | "alternative";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}>;

type Group = Readonly<{ items: readonly Item[]; selectedItemId?: string }>;

export type IntakeMeal = Readonly<{
  status: "eaten" | "not_eaten" | "other" | null;
  completed: boolean;
  freeCalorieTarget?: number;
  groups: readonly Group[];
}>;

export const ZERO_TOTALS: IntakeTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

/** A meal is answered when it says so - eaten, skipped or substituted. */
export const isMealAnswered = (meal: IntakeMeal) => meal.status !== null || meal.completed;

/** A meal counts as eaten when it was marked so, or when every choice in it was logged. */
export const isMealEaten = (meal: IntakeMeal) => meal.status === "eaten" || (meal.status === null && meal.completed);

/**
 * The rows that describe this meal as it currently stands.
 *
 * The chosen alternative in each group - already carrying the client's reported
 * amount, because the repository scales it there - or the primary where nothing
 * is chosen yet. An unchosen group is still part of the plan, so it stands at
 * what the coach wrote.
 */
export function mealStanding(meal: IntakeMeal): readonly Item[] {
  return meal.groups.flatMap((group) => {
    const chosen = group.items.find((item) => item.id === group.selectedItemId);
    if (chosen) return [chosen];
    const primary = group.items.find((item) => item.itemRole === "primary") ?? group.items[0];
    return primary ? [primary] : [];
  });
}

export function sumItems(items: readonly Item[]): IntakeTotals {
  return items.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      protein: sum.protein + item.protein,
      carbs: sum.carbs + item.carbs,
      fat: sum.fat + item.fat,
    }),
    ZERO_TOTALS,
  );
}

export const addTotals = (a: IntakeTotals, b: IntakeTotals): IntakeTotals => ({
  calories: a.calories + b.calories,
  protein: a.protein + b.protein,
  carbs: a.carbs + b.carbs,
  fat: a.fat + b.fat,
});

/** What has been eaten off the plan so far today. */
export const eatenFromMenu = (meals: readonly IntakeMeal[]): IntakeTotals =>
  sumItems(meals.filter(isMealEaten).flatMap(mealStanding));

/** What is still on the plan today - meals nobody has answered yet. */
export const remainingInMenu = (meals: readonly IntakeMeal[]): IntakeTotals =>
  sumItems(meals.filter((meal) => !isMealAnswered(meal)).flatMap(mealStanding));

/**
 * Where the client ate something other than the portion that was written.
 *
 * The totals now read what actually happened, which is right - but a total that
 * is right tells the coach nothing about *why* it is what it is. "1,840 calories"
 * and "1,840 calories, because they have halved the carbohydrate at dinner four
 * days running" are the same number and completely different information.
 *
 * Only rows the client actually changed appear. A day eaten as prescribed
 * produces an empty list, which is the common case and should say nothing.
 */
export type ReportedPortion = Readonly<{
  mealTitle: string;
  name: string;
  planned: number;
  reported: number;
  unit: string;
}>;

type PortionMeal = Readonly<{
  title: string;
  /** The coach's rows, unscaled - this is where the planned portion survives. */
  items: readonly Readonly<{ id: string; name: string; displayQuantity: number; measurementUnit: string }>[];
  groups: readonly Readonly<{ selectedItemId?: string; amountOverride?: number }>[];
}>;

export function reportedPortions(meals: readonly PortionMeal[]): readonly ReportedPortion[] {
  return meals.flatMap((meal) =>
    meal.groups.flatMap((group) => {
      if (group.amountOverride === undefined || !group.selectedItemId) return [];
      const planned = meal.items.find((item) => item.id === group.selectedItemId);
      if (!planned || planned.displayQuantity === group.amountOverride) return [];
      return [{
        mealTitle: meal.title,
        name: planned.name,
        planned: planned.displayQuantity,
        reported: group.amountOverride,
        unit: planned.measurementUnit,
      }];
    }),
  );
}
