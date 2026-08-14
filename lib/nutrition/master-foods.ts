// Curated master foods live in the food catalog with a `master-<group>-<n>` id,
// inserted by supabase/migrations/202608020001_curated_master_foods.sql.
// Deriving the group from the id keeps the list maintainable and survives a
// catalog re-import, unlike the hardcoded numeric id list this replaced.
const MASTER_ID=/^master-(p|c|f)-\d+$/;

export function masterFoodGroup(id:string):"protein"|"carbohydrate"|"fat"|null{
  const match=MASTER_ID.exec(id);
  if(!match)return null;
  return match[1]==="p"?"protein":match[1]==="c"?"carbohydrate":"fat";
}

export function isMasterFood(id:string):boolean{return MASTER_ID.test(id)}
