"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/data/product-repository";
import {
  CHECK_IN_PHOTO_BUCKET,
  uploadCheckInPhotos,
  validateCheckInPhoto,
} from "@/lib/check-ins/photo-storage";
import { validateMealPlanPayload } from "@/lib/nutrition/menu-validation";
import { checkInPhotoCycle } from "@/lib/check-ins/photo-cycle";
import { calculateMacroTargetResult } from "@/lib/nutrition/macro-targets";

export type SaveState = Readonly<{ ok: boolean; message?: string }>;

const numberField = (form: FormData, key: string, required = false) => {
  const raw = String(form.get(key) ?? "").trim();
  if (!raw && !required) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : Number.NaN;
};

export async function saveProgress(
  _previous: SaveState,
  form: FormData,
): Promise<SaveState> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "client")
    return { ok: false, message: "אין הרשאה לשמירת מדידה." };
  const weight = numberField(form, "weight", true);
  const navelCircumference = numberField(form, "navelCircumference");
  const date = String(form.get("date") ?? "");
  if (
    ![weight, navelCircumference].every(
      (value) => value === null || Number.isFinite(value),
    ) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  )
    return {
      ok: false,
      message: "יש לבדוק את התאריך והמדידות. כל ערך חייב להיות מספר חיובי.",
    };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("progress_entries").upsert(
    {
      client_id: auth.id,
      date,
      weight,
      navel_circumference: navelCircumference,
      notes: String(form.get("notes") ?? "").trim() || null,
    },
    { onConflict: "client_id,date" },
  );
  if (error)
    return { ok: false, message: "המדידה לא נשמרה. אפשר לנסות שוב." };
  revalidatePath("/progress");
  revalidatePath("/");
  return { ok: true, message: "המדידה נשמרה." };
}

export async function saveCheckIn(
  _previous: SaveState,
  form: FormData,
): Promise<SaveState> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "client")
    return { ok: false, message: "אין הרשאה לשליחת הצ׳ק-אין." };
  const rating = (key: string) => Number(form.get(key));
  const values = ["adherence", "hunger", "energy", "sleep", "mood"].map(rating);
  if (
    !values.every(
      (value) => Number.isInteger(value) && value >= 1 && value <= 10,
    )
  )
    return {
      ok: false,
      message: "יש לבחור דירוג בין 1 ל־10 בכל השאלות.",
    };
  const supabase = await createSupabaseServerClient();
  const weight=numberField(form,"weight",true);
  const navelCircumference=numberField(form,"navelCircumference",true);
  if(!Number.isFinite(weight)||!Number.isFinite(navelCircumference))
    return {ok:false,message:"יש להזין משקל והיקף טבור כמספרים חיוביים."};
  const files=["front","side","back"].map((view)=>({view,file:form.get(`photo_${view}`)})).filter((item):item is {view:string;file:File}=>item.file instanceof File&&item.file.size>0);
  const {count,error:countError}=await supabase.from("check_ins").select("id",{count:"exact",head:true}).eq("client_id",auth.id);
  if(countError) return {ok:false,message:"לא ניתן לבדוק כעת אם נדרשות תמונות. אפשר לנסות שוב."};
  if(checkInPhotoCycle(count??0).photosRequired&&files.length!==3)
    return {ok:false,message:"בצ׳ק־אין הרביעי חובה לצרף תמונות קדימה, צד וגב."};
  const photoError = files.map(({ file }) => validateCheckInPhoto(file)).find(Boolean);
  if (photoError) return { ok: false, message: photoError };
  const { data:checkIn, error } = await supabase.from("check_ins").insert({
    client_id: auth.id,
    adherence: values[0],
    hunger: values[1],
    energy: values[2],
    sleep: values[3],
    mood: values[4],
    training: form.get("training") === "on",
    weight,
    navel_circumference: navelCircumference,
    workouts_completed: Number(form.get("workoutsCompleted")),
    meal_plan_days: Number(form.get("mealPlanDays")),
    notes: String(form.get("notes") ?? "").trim() || null,
    status: "submitted",
  }).select("id").single();
  if (error||!checkIn)
    return { ok: false, message: "הצ׳ק-אין לא נשמר. אפשר לנסות שוב." };
  const photoResult = await uploadCheckInPhotos({
    storage: supabase.storage.from(CHECK_IN_PHOTO_BUCKET),
    rows: { insert: (row) => supabase.from("check_in_photos").insert(row) },
    files,
    clientId: auth.id,
    checkInId: checkIn.id,
  });
  if (!photoResult.ok) {
    const { error: deleteError } = await supabase.from("check_ins").delete().eq("id", checkIn.id);
    if (!photoResult.cleanupOk || deleteError)
      return { ok: false, message: "השליחה נכשלה וגם הניקוי לא הושלם. יש לפנות לתמיכה." };
    return {
      ok: false,
      message:
        photoResult.reason === "upload"
          ? "העלאת התמונה נכשלה. הצ׳ק־אין לא נשמר."
          : "שמירת התמונה נכשלה. הצ׳ק־אין לא נשמר.",
    };
  }
  revalidatePath("/check-in");
  revalidatePath("/check-in/history");
  revalidatePath("/");
  return { ok: true, message: "הצ׳ק-אין נשמר ונשלח למאמן." };
}

export async function reviewCheckIn(
  _previous: SaveState,
  form: FormData,
): Promise<SaveState> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "coach")
    return { ok: false, message: "אין הרשאה לתגובה לצ׳ק-אין." };
  const checkInId = String(form.get("checkInId") ?? "");
  const clientId = String(form.get("clientId") ?? "");
  const response = String(form.get("response") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(checkInId) || !/^[0-9a-f-]{36}$/i.test(clientId) || !response || response.length > 4000)
    return { ok: false, message: "יש להזין תגובה תקינה." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("review_check_in", {
    p_check_in_id: checkInId,
    p_coach_response: response,
  });
  if (error)
    return { ok: false, message: "התגובה לא נשמרה. אפשר לנסות שוב." };
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/coach/check-ins");
  revalidatePath("/coach");
  revalidatePath("/check-in/history");
  return { ok: true, message: "תגובת המאמן נשמרה." };
}

export async function setCheckInHandled(
  _previous: SaveState,
  form: FormData,
): Promise<SaveState> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "coach")
    return { ok: false, message: "אין הרשאה לעדכון הצ׳ק־אין." };
  const checkInId = String(form.get("checkInId") ?? "");
  const handled = form.get("handled") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(checkInId))
    return { ok: false, message: "צ׳ק־אין לא תקין." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_check_in_handled", {
    p_check_in_id: checkInId,
    p_handled: handled,
  });
  if (error)
    return { ok: false, message: "סטטוס הטיפול לא נשמר." };
  revalidatePath("/coach/check-ins");
  revalidatePath("/coach");
  return {
    ok: true,
    message: handled ? "הצ׳ק־אין סומן כטופל." : "הצ׳ק־אין הוחזר לטיפול.",
  };
}

function nutritionMutation(form: FormData) {
  const id = String(form.get("id") ?? "");
  const eaten = form.get("eaten") === "true";
  const date = String(form.get("date") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error("invalid_nutrition_log");
  return { id, eaten, date };
}

async function requireClient() {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "client") throw new Error("not_authorized");
  return createSupabaseServerClient();
}

function revalidateNutrition() {
  revalidatePath("/");
  revalidatePath("/nutrition");
}

export async function setMealCompletion(form: FormData): Promise<void> {
  const supabase = await requireClient();
  const { id, eaten, date } = nutritionMutation(form);
  const { error } = await supabase.rpc("set_meal_eaten", {
    p_meal_id: id,
    p_date: date,
    p_eaten: eaten,
  });
  if (error) throw error;
  revalidateNutrition();
}

export async function setMealItemCompletion(form: FormData): Promise<void> {
  const supabase = await requireClient();
  const { id, eaten, date } = nutritionMutation(form);
  const { error } = await supabase.rpc("set_meal_item_eaten", {
    p_meal_item_id: id,
    p_date: date,
    p_eaten: eaten,
  });
  if (error) throw error;
  revalidateNutrition();
}

export async function selectMealGroupAlternative(form:FormData):Promise<void>{
  const supabase=await requireClient();
  const groupId=String(form.get("groupId")??"");
  const itemId=String(form.get("itemId")??"");
  const date=String(form.get("date")??"");
  if(!/^[0-9a-f-]{36}$/i.test(groupId)||!/^[0-9a-f-]{36}$/i.test(itemId)||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error("invalid_alternative");
  const{error}=await supabase.rpc("select_meal_group_alternative",{p_group_id:groupId,p_meal_item_id:itemId,p_date:date});
  if(error)throw error;
  revalidateNutrition();
}

export async function resetClientDevice(form: FormData): Promise<void> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "coach") throw new Error("not_authorized");
  const clientId = String(form.get("clientId") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reset_client_device", {
    p_client_id: clientId,
  });
  if (error) throw error;
  revalidatePath(`/coach/clients/${clientId}`);
}

export async function saveMenuTree(
  payload: unknown,
): Promise<SaveState & { id?: string }> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "coach")
    return { ok: false, message: "אין הרשאה לשמירת תפריט." };
  const supabase = await createSupabaseServerClient();
  const plan=structuredClone(payload) as {
    clientId?:string;calorieTarget?:string;proteinTarget?:string;carbohydrateTarget?:string;fatTarget?:string;
    proteinTargetSource?:string;carbohydrateTargetSource?:string;fatTargetSource?:string;
    days?:Array<{meals?:Array<{sortOrder?:number;groups?:Array<{sortOrder?:number;items?:Array<{sortOrder?:number;displayQuantity?:number;measurementUnit?:string;amountSource?:string;itemRole?:string}>}>}>}>;
  };
  const validation = validateMealPlanPayload(plan);
  if (!validation.ok) return validation;
  if(plan.clientId&&Number(plan.calorieTarget)>0){
    const{data:weightRow,error:weightError}=await supabase.from("progress_entries").select("weight").eq("client_id",plan.clientId).order("date",{ascending:false}).limit(1).maybeSingle();
    if(weightError)return{ok:false,message:"לא ניתן לטעון את משקל הלקוח."};
    const needsAutomatic=plan.proteinTargetSource==="auto"||plan.carbohydrateTargetSource==="auto"||plan.fatTargetSource==="auto";
    if(needsAutomatic){
      if(!weightRow?.weight)return{ok:false,message:"לא ניתן לחשב מאקרו אוטומטית ללא משקל לקוח."};
      const calculation=calculateMacroTargetResult(Number(weightRow.weight),Number(plan.calorieTarget));
      if(!calculation.ok)return{ok:false,message:calculation.reason==="negative_carbohydrates"?"יעד הקלוריות נמוך מדי ביחס למשקל: חישוב הפחמימות שלילי.":"לא ניתן לחשב מאקרו אוטומטית ללא משקל לקוח."};
      if(plan.proteinTargetSource==="auto")plan.proteinTarget=String(calculation.targets.protein);
      if(plan.carbohydrateTargetSource==="auto")plan.carbohydrateTarget=String(calculation.targets.carbohydrates);
      if(plan.fatTargetSource==="auto")plan.fatTarget=String(calculation.targets.fat);
    }
  }
  const { data, error } = await supabase.rpc("save_meal_plan_tree", {
    p_plan: plan,
  });
  if (error)
    return {
      ok: false,
      message: error.message.includes("active_menu_requires_client")
        ? "תפריט פעיל חייב להיות משויך ללקוח."
        : "התפריט לא נשמר. יש לבדוק את כל הכמויות והשדות.",
    };
  revalidatePath("/coach/menus");
  revalidatePath(`/coach/menus/${data}`);
  revalidatePath("/nutrition");
  return {
    ok: true,
    id: String(data),
    message: "התפריט נשמר במסד הנתונים.",
  };
}

export async function deleteCoachMealPlan(mealPlanId: string): Promise<SaveState> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "coach") return { ok: false, message: "אין הרשאה למחיקת תפריט." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("delete_meal_plan", { p_meal_plan_id: mealPlanId });
  if (error) return { ok: false, message: "לא ניתן למחוק תפריט משויך או שאינו בבעלותך." };
  revalidatePath("/coach/menus");
  revalidatePath("/nutrition");
  return { ok: true, message: "התפריט נמחק." };
}

export async function duplicateCoachMealPlan(mealPlanId: string): Promise<SaveState & { id?: string }> {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "coach") return { ok: false, message: "אין הרשאה לשכפול תפריט." };
  const supabase = await createSupabaseServerClient();
  const { data: source, error: sourceError } = await supabase.from("meal_plans").select("*").eq("id", mealPlanId).eq("coach_id", auth.id).maybeSingle();
  if (sourceError || !source) return { ok: false, message: "התפריט לא נמצא." };
  const { data: meals, error: mealsError } = await supabase.from("meals").select("id,title,notes,free_calorie_target,day_index,sort_order").eq("meal_plan_id", mealPlanId).order("day_index").order("sort_order");
  if (mealsError) return { ok: false, message: "לא ניתן לקרוא את התפריט לשכפול." };
  const mealIds=(meals??[]).map((meal)=>meal.id);
  const [{data:groups,error:groupsError},{ data: items, error: itemsError }]=mealIds.length?await Promise.all([
    supabase.from("meal_food_groups").select("id,meal_id,group_type,sort_order").in("meal_id",mealIds).order("sort_order"),
    supabase.from("meal_items").select("meal_id,group_id,food_id,amount,display_quantity,measurement_unit,amount_source,item_role,sort_order").in("meal_id",mealIds).order("sort_order"),
  ]):[{data:[],error:null},{data:[],error:null}];
  if(groupsError)return{ok:false,message:"לא ניתן לקרוא קבוצות מזון לשכפול."};
  if (itemsError) return { ok:false,message:"לא ניתן לקרוא פריטי תפריט לשכפול." };
  type DuplicateDay={dayIndex:number;title:string;sortOrder:number;meals:{title:string;notes:string;freeCalorieTarget:string;sortOrder:number;groups:{type:string;sortOrder:number;items:{foodId:string;amount:number;displayQuantity:number;measurementUnit:string;amountSource:string;itemRole:string;sortOrder:number}[]}[]}[]};
  const days=new Map<number,DuplicateDay>();
  for(const meal of meals??[]){const day:DuplicateDay=days.get(meal.day_index)??{dayIndex:meal.day_index,title:"יום רגיל",sortOrder:meal.day_index,meals:[]};day.meals.push({title:meal.title,notes:meal.notes??"",freeCalorieTarget:String(meal.free_calorie_target??""),sortOrder:meal.sort_order,groups:(groups??[]).filter(group=>group.meal_id===meal.id).map(group=>({type:group.group_type,sortOrder:group.sort_order,items:(items??[]).filter(item=>item.group_id===group.id).map(item=>({foodId:item.food_id,amount:Number(item.amount),displayQuantity:Number(item.display_quantity??item.amount),measurementUnit:item.measurement_unit??"גרם",amountSource:item.amount_source??"manual",itemRole:item.item_role??"alternative",sortOrder:item.sort_order}))}))});days.set(meal.day_index,day)}
  const { data, error } = await supabase.rpc("save_meal_plan_tree", { p_plan: { title: `${source.title} — עותק`, description: source.description ?? "", clientId: "", status: "draft", calorieTarget: source.calorie_target ?? "", proteinTarget: source.protein_target ?? "", carbohydrateTarget: source.carbohydrate_target ?? "", fatTarget: source.fat_target ?? "", proteinTargetSource:"auto",carbohydrateTargetSource:"auto",fatTargetSource:"auto",days: [...days.values()] } });
  if (error) return { ok:false,message:"שכפול התפריט נכשל." };
  revalidatePath("/coach/menus");
  return { ok:true,id:String(data),message:"נוצר עותק טיוטה." };
}

export async function recordCoachFoodSelection(foodId:string):Promise<void>{
  const auth=await getAuthContext();
  if(!auth||auth.role!=="coach"||!foodId)return;
  const supabase=await createSupabaseServerClient();
  await supabase.rpc("record_coach_food_selection",{p_food_id:foodId});
}

export async function setCoachFoodFavorite(foodId:string,favorite:boolean):Promise<SaveState>{
  const auth=await getAuthContext();
  if(!auth||auth.role!=="coach")return{ok:false,message:"אין הרשאה."};
  const supabase=await createSupabaseServerClient();
  const{error}=await supabase.rpc("set_coach_food_favorite",{p_food_id:foodId,p_favorite:favorite});
  return error?{ok:false,message:"המועדף לא נשמר."}:{ok:true,message:favorite?"נוסף למועדפים.":"הוסר מהמועדפים."};
}
