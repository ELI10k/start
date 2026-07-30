export type MacroTargets=Readonly<{protein:number;fat:number;carbohydrates:number}>;
export type MacroTargetCalculation =
  | {ok:true;targets:MacroTargets}
  | {ok:false;reason:"missing_input"|"negative_carbohydrates"};

export function calculateMacroTargetResult(weightKg:number,calorieTarget:number):MacroTargetCalculation{
  if(!Number.isFinite(weightKg)||weightKg<=0||!Number.isFinite(calorieTarget)||calorieTarget<=0)return{ok:false,reason:"missing_input"};
  const proteinGrams=weightKg*1.8;
  const fatCalories=calorieTarget*0.25;
  const carbohydrateGrams=(calorieTarget-proteinGrams*4-fatCalories)/4;
  if(carbohydrateGrams<0)return{ok:false,reason:"negative_carbohydrates"};
  return{ok:true,targets:{
    protein:Math.round(proteinGrams),
    fat:Math.round(fatCalories/9),
    carbohydrates:Math.round(carbohydrateGrams),
  }};
}

export function calculateMacroTargets(weightKg:number,calorieTarget:number):MacroTargets|null{
  const result=calculateMacroTargetResult(weightKg,calorieTarget);
  return result.ok?result.targets:null;
}
