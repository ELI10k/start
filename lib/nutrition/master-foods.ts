// Curated master foods live in the food catalog with a `master-<group>-<n>` id,
// inserted by supabase/migrations/202608020001_curated_master_foods.sql.
// Deriving the group from the id keeps the list maintainable and survives a
// catalog re-import, unlike the hardcoded numeric id list this replaced.
const MASTER_ID=/^master-(p|c|f)-\d+$/;

// Existing catalogue products that are deliberately promoted to the protein
// master group. Keep their original ids: meal logs, barcode scans and client
// favorites already reference these rows, so duplicating them as master-p ids
// would split history and show the same product twice.
const FEATURED_PROTEIN_MASTER_IDS = new Set([
  "31", // Yoplait GO natural, 20 g protein
  "32", // Yoplait GO natural, 25 g protein
  "barcode-7290119387472", // Yotvata protein coffee drink
  "restored-scan-986cf4684dea4782ab5adb29cdaf9ba0", // Yotvata 40 g salted-caramel protein drink
]);

export function masterFoodGroup(id:string):"protein"|"carbohydrate"|"fat"|null{
  if (FEATURED_PROTEIN_MASTER_IDS.has(id)) return "protein";
  const match=MASTER_ID.exec(id);
  if(!match)return null;
  return match[1]==="p"?"protein":match[1]==="c"?"carbohydrate":"fat";
}

export function isMasterFood(id:string):boolean{return masterFoodGroup(id)!==null}

/** Products promoted by the coach should start starred for every client. */
export function isDefaultFavoriteFood(id:string):boolean{
  return FEATURED_PROTEIN_MASTER_IDS.has(id);
}
