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

export function foodUnit(food:AlternativeFood):Readonly<{unit:string;gramsPerUnit:number}>{
  if(food.packageUnit==="יחידה"&&food.unitWeightGrams&&food.unitWeightGrams>0)
    return{unit:"יחידות",gramsPerUnit:food.unitWeightGrams};
  return{unit:"גרם",gramsPerUnit:1};
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
  groupType:"protein"|"carbohydrate",
):Portion|null{
  const primary=portionFor(primaryFood,primaryQuantity);
  if(!primary||alternativeFood.calories<=0)return null;
  const targetMacro=groupType==="protein"?primary.protein:primary.carbs;
  const alternativeMacroPer100=groupType==="protein"?(alternativeFood.protein??0):(alternativeFood.carbs??0);
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
  if(unit==="יחידות")return Math.max(1,Math.round(value*2)/2);
  return Math.max(1,Math.round(value/5)*5);
}
function round(value:number){return Math.round(value*10)/10}
