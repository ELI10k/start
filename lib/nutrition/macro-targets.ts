export type MacroTargets=Readonly<{protein:number;fat:number;carbohydrates:number}>;

export function calculateMacroTargets(weightKg:number,calorieTarget:number):MacroTargets|null{
  if(!Number.isFinite(weightKg)||weightKg<=0||!Number.isFinite(calorieTarget)||calorieTarget<=0)return null;
  const proteinGrams=weightKg*1.8;
  const fatCalories=calorieTarget*0.25;
  const carbohydrateGrams=Math.max(0,(calorieTarget-proteinGrams*4-fatCalories)/4);
  return{
    protein:Math.round(proteinGrams),
    fat:Math.round(fatCalories/9),
    carbohydrates:Math.round(carbohydrateGrams),
  };
}
