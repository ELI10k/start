export type AlternativeFood=Readonly<{
  calories:number;
  protein:number|null;
  carbs:number|null;
  fat:number|null;
  packageUnit:string|null;
  unitWeightGrams:number|null;
}>;

export type Portion=Readonly<{
  quantity:number;
  unit:string;
  grams:number;
  calories:number;
  protein:number;
  carbs:number;
  fat:number;
}>;

export const GRAM_UNIT="גרם";

// Natural units come from the food source. A unit is only offered when the
// source also carries the weight of one - never guessed from the product name.
const UNIT_FORMS:ReadonlyArray<readonly[string,string]>=[
  ["יחידה","יחידות"],
  ["פרוסה","פרוסות"],
  ["פיתה","פיתות"],
  ["לחמנייה","לחמניות"],
  ["בגט","בגטים"],
  ["לחמניה","לחמניות"],
  ["פרכית","פרכיות"],
  ["טורטייה","טורטיות"],
  ["טורטיה","טורטיות"],
  ["כוס","כוסות"],
  ["גביע","גביעים"],
  ["קופסה","קופסאות"],
  ["בקבוק","בקבוקים"],
  ["כף","כפות"],
  ["כפית","כפיות"],
  ["ביצה","ביצים"],
  ["תמר","תמרים"],
  ["מנה","מנות"],
];
const UNIT_PLURALS=new Map(UNIT_FORMS);
const UNIT_SINGULARS=new Map(UNIT_FORMS.map(([singular,plural])=>[plural,singular]));

// Quantities are stored against the plural form. Read it back as a singular when
// there is exactly one, so a row says "1 פיתה" rather than "1 פיתות".
export function unitLabel(unit:string,quantity:number):string{
  // Both directions. New rows are stored plural, but rows repaired by
  // 202608200004 carry the food's own package_unit, which is singular - and
  // "3 פיתה" is as wrong as "1 פיתות".
  return quantity===1?UNIT_SINGULARS.get(unit)??unit:UNIT_PLURALS.get(unit)??unit;
}

// A mass or volume is already the measurement - it is never a countable unit.
// Catalog rows carry things like package_unit "גרם" alongside a unit weight,
// and treating those as countable multiplies every value by that weight.
const MEASURE_UNITS=new Set(["גרם","גר","ג","גרמים","מ\"ל","מל","מיליליטר","ליטר","ק\"ג","קג","קילו","קילוגרם","g","gr","gram","grams","ml","l","kg"]);

/**
 * How a quantity of this food is counted.
 *
 * `mode` lets the caller override the food's natural unit and work in grams
 * instead. A coach writing "1 פיתה" and a coach writing "55 גרם" of the same
 * pita are describing the same portion, and until now a food carrying a unit
 * could only ever be counted in that unit - there was no way to say the number
 * in grams, which is how half of a menu is actually written.
 *
 * Grams are always available. The natural unit is only offered where the source
 * carries the weight of one, never guessed from the product name.
 */
export function foodUnit(food:AlternativeFood,mode:"native"|"gram"="native"):Readonly<{unit:string;gramsPerUnit:number}>{
  if(mode==="gram")return{unit:GRAM_UNIT,gramsPerUnit:1};
  const source=food.packageUnit?.trim();
  if(source&&!MEASURE_UNITS.has(source.toLowerCase())&&food.unitWeightGrams&&food.unitWeightGrams>0)
    return{unit:UNIT_PLURALS.get(source)??source,gramsPerUnit:food.unitWeightGrams};
  return{unit:GRAM_UNIT,gramsPerUnit:1};
}

/** Whether this food can be counted in anything other than grams. */
export function hasNaturalUnit(food:AlternativeFood):boolean{
  return foodUnit(food).unit!==GRAM_UNIT;
}

/** The same portion, expressed in the other unit. Used when a row is switched. */
export function convertQuantity(food:AlternativeFood,quantity:number,from:"native"|"gram",to:"native"|"gram"):number{
  if(from===to||!Number.isFinite(quantity)||quantity<=0)return quantity;
  const grams=quantity*foodUnit(food,from).gramsPerUnit;
  const converted=grams/foodUnit(food,to).gramsPerUnit;
  // Grams read as whole numbers; counted units keep a half.
  return to==="gram"?Math.max(1,Math.round(converted)):Math.max(0.5,Math.round(converted*2)/2);
}

export function portionFor(food:AlternativeFood,quantity:number,mode:"native"|"gram"="native"):Portion|null{
  const unit=foodUnit(food,mode);
  if(!Number.isFinite(quantity)||quantity<=0)return null;
  const grams=quantity*unit.gramsPerUnit;
  const factor=grams/100;
  return{
    quantity:roundQuantity(quantity,unit.unit),
    unit:unit.unit,
    grams,
    calories:round(food.calories*factor),
    protein:round((food.protein??0)*factor),
    carbs:round((food.carbs??0)*factor),
    fat:round((food.fat??0)*factor),
  };
}

export function defaultPortionQuantity(food:AlternativeFood){
  const unit=foodUnit(food);
  return roundQuantity(100/unit.gramsPerUnit,unit.unit);
}

/**
 * An equivalent portion of `alternativeFood` for a given portion of the primary.
 *
 * `primaryMode` says which unit `primaryQuantity` is counted in, and it matters:
 * a coach who switched the primary row to grams is holding a gram figure, and
 * reading "55" as fifty-five pitas rather than fifty-five grams scales every
 * alternative in the group by a factor of a hundred. The alternative's own
 * quantity always comes back in its natural unit, which is how the row that
 * receives it is written.
 */
export function calculateAlternativePortion(
  primaryFood:AlternativeFood,
  primaryQuantity:number,
  alternativeFood:AlternativeFood,
  groupType:"protein"|"carbohydrate"|"fat"|"vegetables",
  primaryMode:"native"|"gram"="native",
):Portion|null{
  const primary=portionFor(primaryFood,primaryQuantity,primaryMode);
  if(!primary||alternativeFood.calories<=0)return null;
  const targetMacro=groupType==="protein"?primary.protein:groupType==="carbohydrate"?primary.carbs:groupType==="fat"?primary.fat:primary.calories;
  const alternativeMacroPer100=groupType==="protein"?(alternativeFood.protein??0):groupType==="carbohydrate"?(alternativeFood.carbs??0):groupType==="fat"?(alternativeFood.fat??0):alternativeFood.calories;
  const caloriesGrams=primary.calories/alternativeFood.calories*100;
  const macroGrams=alternativeMacroPer100>0?targetMacro/alternativeMacroPer100*100:caloriesGrams;
  // Calories have priority; a small macro correction improves equivalence
  // without allowing a high-fat alternative to inherit the primary quantity.
  const suggestedGrams=caloriesGrams*0.9+macroGrams*0.1;
  const unit=foodUnit(alternativeFood);
  const quantity=suggestedGrams/unit.gramsPerUnit;
  return portionFor(alternativeFood,roundQuantity(quantity,unit.unit));
}

function roundQuantity(value:number,unit:string){
  // Countable units round to a half so "2.5 פרוסות" stays sayable; grams round to 5.
  if(unit!==GRAM_UNIT)return Math.max(1,Math.round(value*2)/2);
  return Math.max(1,Math.round(value/5)*5);
}
function round(value:number){return Math.round(value*10)/10}

// The quantity of a food that costs a given number of calories, rounded the same
// way every other quantity in the builder is. Used to fill a meal against a
// budget instead of handing every food its flat 100 g default portion.
/**
 * The quantity of a food that costs a given number of calories.
 *
 * Countable units are capped. Arithmetic alone will happily answer "ten egg
 * whites" for a 200 calorie protein budget - which is correct and is not a
 * portion anybody eats. Grams are left uncapped: they scale continuously, and
 * 330 g of chicken is an ordinary answer where 10 units of anything is not.
 *
 * A capped portion no longer costs `targetCalories`, so a caller filling
 * against a budget should rank foods by how close they land rather than trust
 * any single one to hit it.
 */
export const MAX_COUNTABLE_UNITS=4;

export function portionForCalories(food:AlternativeFood,targetCalories:number):Portion|null{
  if(!Number.isFinite(targetCalories)||targetCalories<=0||food.calories<=0)return null;
  const unit=foodUnit(food);
  const grams=targetCalories/food.calories*100;
  const quantity=roundQuantity(grams/unit.gramsPerUnit,unit.unit);
  return portionFor(food,unit.unit===GRAM_UNIT?quantity:Math.min(quantity,MAX_COUNTABLE_UNITS));
}

// How a day's calories fall across the fixed meals. Two main meals and a lighter
// breakfast is how the plans are actually written; the snacks carry the rest.
export const MEAL_CALORIE_SHARE:Readonly<Record<string,number>>={
  "ארוחת בוקר":0.25,
  "ארוחת ביניים 1":0.10,
  "ארוחת צהריים":0.30,
  "ארוחת ביניים 2":0.10,
  "ארוחת ערב":0.25,
};

// And how one meal's calories fall across its groups. Vegetables are not given a
// share - they are an addition to the plate, not a portion measured against it.
export const GROUP_CALORIE_SHARE:Readonly<Record<string,number>>={
  protein:0.40,
  carbohydrate:0.45,
  fat:0.15,
  vegetables:0,
};
