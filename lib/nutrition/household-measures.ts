// Grams, in the units a person actually has in their kitchen.
//
// A client handed "200 גרם אורז" either owns a scale or guesses. Most guess. The
// conversion below is Eli's own working rule, given on 2026-08-19, and is the
// only source for these figures - nothing here is derived, averaged or looked up.
//
// It is deliberately approximate and says so at every call site: a spoon of rice
// and a spoon of couscous are not the same weight, and the "≈" is not decoration.
// The nutrition values themselves are never touched by any of this - the portion
// stays the grams the coach prescribed, and this is a second way of reading it.

/** Eli's rule: one level eating spoon is about 20 g. */
export const GRAMS_PER_TABLESPOON = 20;

/** And a serving spoon is 100 g. "19 כפות בורגול" is a true sentence that helps
    nobody; the same portion is under four serving spoons. */
export const GRAMS_PER_SERVING_SPOON = 100;

/** Above this, an eating spoon stops being a usable instruction. */
const SERVING_SPOON_FROM_GRAMS = 100;

/** The one meal whose carbohydrate is measured this way. Eli's instruction: the
    spoon rule is a lunch rule, and printing it on breakfast cereal or on an
    evening portion is a number nobody asked for. */
export const SPOON_MEAL_TITLE = "ארוחת צהריים";

/** And a meat portion of 100 g is about the size of a palm. */
export const GRAMS_PER_PALM = 100;

export type HouseholdMeasure = Readonly<{
  /** The rendered hint, already carrying its "≈". */
  label: string;
  /** How many of the unit, rounded to something sayable. */
  count: number;
  unit: "tablespoon" | "serving-spoon" | "palm";
}>;

// Halves, because "3.5 כפות" is a thing a person can do and "3.47" is not.
const toHalf = (value: number) => Math.round(value * 2) / 2;

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/**
 * The household reading of a portion, or null when there isn't an honest one.
 *
 * Only two groups get one, because only two have a rule behind them:
 * carbohydrates are spoonable, and a meat portion has the palm convention. A fat
 * or a vegetable gets nothing rather than a number invented to fill the slot.
 *
 * Foods already sold in a countable unit - a pita, a slice, an egg - are skipped
 * as well: those already say "2 פרוסות", which is a better instruction than any
 * spoon count, and the food's own unit is real data where a spoon is a rule of
 * thumb.
 */
export function householdMeasure(
  grams: number,
  groupType: string,
  measurementUnit?: string,
  mealTitle?: string,
): HouseholdMeasure | null {
  if (!Number.isFinite(grams) || grams <= 0) return null;
  // Already expressed in a natural unit from the food source - leave it alone.
  // "1 פרוסה" is a better instruction than any spoon count, and the food's own
  // unit is real data where a spoon is a rule of thumb.
  if (measurementUnit && measurementUnit !== "גרם") return null;

  if (groupType === "carbohydrate") {
    // Only at lunch. Elsewhere the portion stands on its grams.
    if (mealTitle !== undefined && mealTitle !== SPOON_MEAL_TITLE) return null;
    if (grams >= SERVING_SPOON_FROM_GRAMS) {
      const count = toHalf(grams / GRAMS_PER_SERVING_SPOON);
      if (count < 0.5) return null;
      return { label: `≈ ${count} ${plural(count, "כף הגשה", "כפות הגשה")}`, count, unit: "serving-spoon" };
    }
    const count = toHalf(grams / GRAMS_PER_TABLESPOON);
    if (count < 0.5) return null;
    return { label: `≈ ${count} ${plural(count, "כף אכילה", "כפות אכילה")}`, count, unit: "tablespoon" };
  }

  if (groupType === "protein") {
    const count = toHalf(grams / GRAMS_PER_PALM);
    if (count < 0.5) return null;
    // The palm is a size, not a weight, so it is phrased as one.
    return {
      label: count === 1 ? "≈ בגודל כף יד" : `≈ ${count} כפות יד`,
      count,
      unit: "palm",
    };
  }

  return null;
}
