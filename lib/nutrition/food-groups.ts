import { masterFoodGroup } from "./master-foods.ts";

// Which macro group a catalogue food belongs to.
//
// The database already answers this for meal items, in
// 202607290005_refine_legacy_macro_groups.sql: the dominant macro decides, with
// protein winning ties. Mirroring that rule here rather than inventing a second
// one is the point - a food classified as carbohydrate on the plate must not
// appear under protein in the picker.
//
// This existed nowhere before, which is why the protein group was listing
// everything: the picker filtered on `!food.masterGroup || masterGroup === type`,
// so every food that was not a curated master - the overwhelming majority - fell
// through the filter untouched.

export type MacroGroup = "protein" | "carbohydrate" | "fat";

export type ClassifiableFood = Readonly<{
  id: string;
  name?: string;
  category?: string;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}>;

export function foodMacroGroup(food: ClassifiableFood): MacroGroup {
  // A curated master food carries its group in its id and is authoritative:
  // it was placed in that group deliberately.
  const master = masterFoodGroup(food.id);
  if (master) return master;

  const protein = Number(food.protein ?? 0);
  const carbs = Number(food.carbs ?? 0);
  const fat = Number(food.fat ?? 0);

  if (carbs > protein && carbs >= fat) return "carbohydrate";
  if (fat > protein && fat > carbs) return "fat";
  return "protein";
}

/**
 * The foods a group's picker may offer: only those classified into that group.
 *
 * Strict on purpose. A meal here is one protein choice and one carbohydrate
 * choice, so a fat-dominant food is not a primary item in either - the fat comes
 * from the foods themselves. Offering olive oil under "protein" is the same
 * class of mistake as offering rice there.
 */
export function foodsForGroup<T extends ClassifiableFood>(foods: readonly T[], group: MacroGroup | "vegetables"): readonly T[] {
  if (group === "vegetables") return foods.filter((food) => {
    const label=`${food.name??""} ${food.category??""}`.toLocaleLowerCase("he");
    return /ירק|ירקות|סלט|מלפפון|עגבני|פלפל|חסה|כרוב|קישוא|ברוקולי|כרובית|פטרי|גזר|סלרי|תרד|חציל/.test(label);
  });
  return foods.filter((food) => foodMacroGroup(food) === group);
}
