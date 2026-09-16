// Curated master foods normally use a `master-<group>-<n>` id. Branded catalog
// products can also be promoted explicitly without duplicating the food row.
const MASTER_ID=/^master-(p|c|f)-\d+$/;
const PROMOTED_MASTER_FOODS:Readonly<Record<string,"protein"|"carbohydrate"|"fat">>={
  "31":"protein",
  "32":"protein",
  "340":"protein",
  "341":"protein",
  "342":"protein",
  "343":"protein",
  "344":"protein",
  "345":"protein",
  "346":"protein",
  "347":"protein",
  "348":"protein",
  "349":"protein",
  "350":"protein",
  "351":"protein",
  "352":"protein",
  "353":"protein",
  "354":"protein",
  "355":"protein",
  "356":"protein",
  "357":"protein",
  "358":"protein",
};

export function masterFoodGroup(id:string):"protein"|"carbohydrate"|"fat"|null{
  const promoted=PROMOTED_MASTER_FOODS[id];
  if(promoted)return promoted;
  const match=MASTER_ID.exec(id);
  if(!match)return null;
  return match[1]==="p"?"protein":match[1]==="c"?"carbohydrate":"fat";
}

export function isMasterFood(id:string):boolean{return masterFoodGroup(id)!==null}
