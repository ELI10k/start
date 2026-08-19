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
  return quantity===1?UNIT_SINGULARS.get(unit)??unit:unit;
}

// A mass or volume is already the measurement - it is never a countable unit.
// Catalog rows carry things like package_unit "גרם" alongside a unit weight,
// and treating those as countable multiplies every value by that weight.
const MEASURE_UNITS=new Set(["גרם","גר","ג","גרמים","מ\"ל","מל","מיליליטר","ליטר","ק\"ג","קג","קילו","קילוגרם","g","gr","gram","grams","ml","l","kg"]);

export function foodUnit(food:AlternativeFood):Readonly<{unit:string;gramsPerUnit:number}>{
  const source=food.packageUnit?.trim();
  if(source&&!MEASURE_UNITS.has(source.toLowerCase())&&food.unitWeightGrams&&food.unitWeightGrams>0)
    return{unit:UNIT_PLURALS.get(source)??source,gramsPerUnit:food.unitWeightGrams};
  return{unit:GRAM_UNIT,gramsPerUnit:1};
}

export function portionFor(food:AlternativeFood,quantity:number):Portion|null{
  const unit=foodUnit(food);
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

export function calculateAlternativePortion(
  primaryFood:AlternativeFood,
  primaryQuantity:number,
  alternativeFood:AlternativeFood,
  groupType:"protein"|"carbohydrate"|"fat"|"vegetables",
):Portion|null{
  const primary=portionFor(primaryFood,primaryQuantity);
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
export function portionForCalories(food:AlternativeFood,targetCalories:number):Portion|null{
  if(!Number.isFinite(targetCalories)||targetCalories<=0||food.calories<=0)return null;
  const unit=foodUnit(food);
  const grams=targetCalories/food.calories*100;
  return portionFor(food,roundQuantity(grams/unit.gramsPerUnit,unit.unit));
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
