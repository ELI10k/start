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
import { israelDateKey } from "@/lib/date-time";

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

// Zero is a real answer to "how many workouts did you do", and a blank field is
// "did not say" rather than zero. Number("") is 0 and Number("x") is NaN, and
// both used to reach the insert.
const wholeCount = (form: FormData, key: string) => {
  const raw = String(form.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
};

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
    return {ok:false,message:"בצ׳ק־אין הראשון ובכל צ׳ק־אין רביעי חובה לצרף תמונות קדימה, צד וגב."};
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
    workouts_completed: wholeCount(form, "workoutsCompleted"),
    meal_plan_days: wholeCount(form, "mealPlanDays"),
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
  // The same weight, in the one place the graph reads.
  //
  // The check-in asks for weight and navel circumference, and the progress screen
  // asks for the same two numbers in a separate form. Only the second fed
  // progress_entries - so a client who did their weekly check-in faithfully and
  // never opened the progress screen had a flat, empty graph, and the coach's
  // "משקל אחרון" said "אין מדידה" about someone who had just reported it.
  //
  // A failure here does not undo the check-in: the coach has the numbers either
  // way, and throwing away a submitted check-in over a chart row would be the
  // worse trade. It is reported rather than swallowed.
  const { error: progressError } = await supabase.from("progress_entries").upsert(
    {
      client_id: auth.id,
      date: israelDateKey(),
      weight,
      navel_circumference: navelCircumference,
    },
    { onConflict: "client_id,date" },
  );
  revalidatePath("/check-in");
  revalidatePath("/check-in/history");
  revalidatePath("/progress");
  revalidatePath("/");
  return {
    ok: true,
    message: progressError
      ? "הצ׳ק-אין נשמר ונשלח למאמן, אך המשקל לא נוסף לגרף ההתקדמות. אפשר להזין אותו במסך ההתקדמות."
      : "הצ׳ק-אין נשמר ונשלח למאמן. המשקל והמדידה נוספו גם לגרף ההתקדמות.",
  };
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

async function requireClient() {
  const auth = await getAuthContext();
  if (!auth || auth.role !== "client") throw new Error("not_authorized");
  return createSupabaseServerClient();
}

function revalidateNutrition() {
  revalidatePath("/");
  revalidatePath("/nutrition");
}

// The nutrition rules live in the database and are raised as named exceptions.
// Rethrowing the raw Postgres object put a client on the generic error screen
// with no idea what was wrong; the rule is unchanged, only how it reads.
const NUTRITION_RULES: Record<string, string> = {
  select_one_alternative_per_group: "יש לבחור חלופה אחת בכל קבוצה לפני סימון הארוחה.",
  invalid_quantity: "הכמות חייבת להיות מספר גדול מאפס.",
};

function nutritionRule(error: { message?: string } | null): Error | null {
  if (!error) return null;
  const known = error.message ? NUTRITION_RULES[error.message] : undefined;
  return known ? new Error(known) : null;
}

const MEAL_STATUSES = new Set(["eaten", "not_eaten", "other", "none"]);

// One tap sets any of the four states. "not_eaten" and "other" both clear any
// recorded intake for that meal, so neither can contribute calories - the
// planned foods were not what was eaten.
export async function setMealStatus(form: FormData): Promise<void> {
  const supabase = await requireClient();
  const id = String(form.get("id") ?? "");
  const date = String(form.get("date") ?? "");
  const status = String(form.get("status") ?? "");
  // Only "other" carries one, and the database enforces the same pairing.
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  if (!id || !date) throw new Error("meal_and_date_required");
  if (!MEAL_STATUSES.has(status)) throw new Error("invalid_meal_status");
  if (status === "other" && !note) throw new Error("substitution_requires_note");

  const { error } = await supabase.rpc("set_meal_day_status", {
    p_meal_id: id,
    p_date: date,
    p_status: status,
    p_note: status === "other" ? note : null,
  });
  if (error) throw nutritionRule(error) ?? error;
  revalidateNutrition();
}

/**
 * Fills today's empty groups with yesterday's choices.
 *
 * Choosing an alternative in every group is the most repeated action in the
 * product - it is stored per day, so it resets at midnight and is made again
 * every morning, usually to the same answer. Groups already chosen today are
 * left alone by the database, so this fills the gaps rather than replacing a
 * decision the client has already made.
 */
export async function repeatYesterdaySelections(form: FormData): Promise<void> {
  const supabase = await requireClient();
  const date = String(form.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("invalid_date");
  const yesterday = new Date(`${date}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const { error } = await supabase.rpc("repeat_meal_group_selections", {
    p_from: yesterday.toISOString().slice(0, 10),
    p_to: date,
  });
  if (error) throw nutritionRule(error) ?? error;
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

/**
 * How much of the chosen portion the client actually ate.
 *
 * A plan prescribes a portion and a person eats what a person eats. The only two
 * answers were "eaten" and "not eaten", so half a portion had to be reported as
 * one of them - and the day's totals were wrong by the difference, five times a
 * day. The plan is untouched: the coach's portion stays exactly as written and
 * this records what happened to it. An empty value clears the override and the
 * row goes back to reading as prescribed.
 */
export async function setMealGroupAmount(form: FormData): Promise<void> {
  const supabase = await requireClient();
  const groupId = String(form.get("groupId") ?? "");
  const date = String(form.get("date") ?? "");
  const raw = String(form.get("quantity") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(groupId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("invalid_amount");
  const quantity = raw === "" ? null : Number(raw);
  // Zero is a real answer - the portion was served and left. Empty clears the
  // override; below zero is not a portion.
  if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0)) throw new Error("invalid_amount");
  const { error } = await supabase.rpc("set_meal_group_amount", {
    p_group_id: groupId,
    p_date: date,
    p_quantity: quantity,
  });
  if (error) throw nutritionRule(error) ?? error;
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

/**
 * Copies a menu, optionally straight onto a client and scaled to their target.
 *
 * Without a client this is the plain duplicate it always was. With one, it does
 * in a single step what used to take four: copy, open the copy, pick the client,
 * then work every quantity over by hand against their calorie target. The
 * portions are scaled by the ratio between the client's target and the source
 * menu's, so the copy lands near the right size and the coach adjusts rather
 * than rebuilds.
 *
 * The copy is still a draft. Scaling gets a menu close, not correct, and putting
 * a machine-scaled menu straight in front of a client is not something this
 * should decide on the coach's behalf.
 */
export async function duplicateCoachMealPlan(mealPlanId: string, clientId?: string): Promise<SaveState & { id?: string }> {
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
  // With a client named, the copy is titled for them and sized against their own
  // calorie target rather than the source menu's.
  let target: { clientId: string; name: string; calories: number | null } | null = null;
  if (clientId) {
    const [{ data: profile }, { data: intake }] = await Promise.all([
      supabase.from("profiles").select("id,full_name").eq("id", clientId).maybeSingle(),
      supabase.from("client_profiles").select("calorie_target").eq("user_id", clientId).maybeSingle(),
    ]);
    // RLS only returns a client this coach actually holds, so a missing row is a
    // refusal rather than a lookup failure.
    if (!profile) return { ok: false, message: "הלקוח לא נמצא, או שאינו משויך אליך." };
    target = { clientId, name: profile.full_name, calories: intake?.calorie_target ?? null };
  }

  const sourceCalories = Number(source.calorie_target ?? 0);
  // Only scale when both figures are real. Otherwise the copy keeps the source's
  // quantities, which is the honest fallback.
  //
  // Whether the two targets were known is a separate fact from whether the ratio
  // came out at 1. A client whose target happens to equal the source menu's
  // produces a ratio of exactly 1, and the message read off the ratio alone -
  // so the one case where the sizing is already perfect was reported as "no
  // calorie target was found for either", which is the opposite of the truth.
  const scalable = Boolean(target?.calories && sourceCalories > 0);
  const ratio = scalable ? target!.calories! / sourceCalories : 1;
  const scaled = ratio === 1 ? [...days.values()] : [...days.values()].map((day) => ({
    ...day,
    meals: day.meals.map((meal) => ({
      ...meal,
      freeCalorieTarget: meal.freeCalorieTarget ? String(Math.round(Number(meal.freeCalorieTarget) * ratio)) : meal.freeCalorieTarget,
      groups: meal.groups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          amount: Math.round(item.amount * ratio * 10) / 10,
          displayQuantity: Math.round(item.displayQuantity * ratio * 10) / 10,
          // The quantity is now derived rather than typed, and the editor's
          // "recalculate" should feel free to move it.
          amountSource: "auto",
        })),
      })),
    })),
  }));

  const { data, error } = await supabase.rpc("save_meal_plan_tree", { p_plan: {
    title: target ? `${source.title} — ${target.name}` : `${source.title} — עותק`,
    description: source.description ?? "",
    clientId: target?.clientId ?? "",
    status: "draft",
    calorieTarget: target?.calories ?? source.calorie_target ?? "",
    proteinTarget: target ? "" : source.protein_target ?? "",
    carbohydrateTarget: target ? "" : source.carbohydrate_target ?? "",
    fatTarget: target ? "" : source.fat_target ?? "",
    proteinTargetSource:"auto",carbohydrateTargetSource:"auto",fatTargetSource:"auto",
    days: scaled,
  } });
  if (error) return { ok:false,message:"שכפול התפריט נכשל." };
  revalidatePath("/coach/menus");
  return { ok:true,id:String(data),message: target
    ? !scalable
      ? `נוצר עותק עבור ${target.name}. לא נמצא יעד קלורי לאחד מהשניים, ולכן הכמויות הועתקו כפי שהן.`
      : ratio === 1
        ? `נוצר עותק עבור ${target.name}. יעד הקלוריות שלו זהה לזה של תפריט המקור (${Math.round(target.calories!)} קל׳), ולכן הכמויות נשארו כפי שהן.`
        : `נוצר עותק עבור ${target.name}, מכוונן ל־${Math.round(target.calories!)} קלוריות. כדאי לעבור על הכמויות לפני הפעלה.`
    : "נוצר עותק טיוטה." };
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
