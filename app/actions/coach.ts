"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/data/product-repository";
import { israelDateKey } from "@/lib/progress/measurements";

type Result={ok:boolean;message:string};
const validUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value);
async function coachFor(clientId:string){const auth=await getAuthContext();if(!auth||auth.role!=="coach"||!validUuid(clientId))return null;const supabase=await createSupabaseServerClient();const {data}=await supabase.from("coach_client_relationships").select("client_id").eq("coach_id",auth.id).eq("client_id",clientId).eq("status","active").maybeSingle();return data?{auth,supabase}:null}
const revalidate=(clientId:string)=>{revalidatePath(`/coach/clients/${clientId}`);revalidatePath("/content");revalidatePath("/notifications")};

/**
 * Archiving is a status change on one row, and nothing else.
 *
 * coach_client_relationships.status is what listCoachClients filters on, so
 * ending the relationship is enough to take the client off the active list. Not
 * one menu, workout, measurement, check-in or auth user is touched - which is the
 * whole reason this is offered instead of a delete.
 *
 * profiles.status is deliberately left alone: it describes the person's account,
 * not this coach's working relationship with them, and a second coach must not
 * inherit a disabled account because the first one tidied up.
 *
 * The write goes through the service role because the table has a select policy
 * and no write policy. Ownership is checked first through the coach's own
 * session, and the update is scoped to their coach_id as well, so the key cannot
 * reach another coach's row.
 */
async function relationshipFor(clientId:string,expected:"active"|"ended"){
  const auth=await getAuthContext();
  if(!auth||auth.role!=="coach"||!validUuid(clientId))return null;
  const supabase=await createSupabaseServerClient();
  const {data}=await supabase.from("coach_client_relationships")
    .select("client_id,status,start_date,end_date")
    .eq("coach_id",auth.id).eq("client_id",clientId).maybeSingle();
  if(!data||data.status!==expected)return null;
  return {auth,relationship:data};
}

export async function archiveClient(clientId:string):Promise<Result>{
  const context=await relationshipFor(clientId,"active");
  if(!context)return{ok:false,message:"אין הרשאה להעביר את הלקוח לארכיון."};
  const {error}=await createSupabaseAdminClient()
    .from("coach_client_relationships")
    .update({status:"ended",end_date:israelDateKey()})
    .eq("coach_id",context.auth.id).eq("client_id",clientId).eq("status","active");
  if(error)return{ok:false,message:"ההעברה לארכיון נכשלה. אפשר לנסות שוב."};
  revalidatePath("/coach/clients");revalidate(clientId);
  return{ok:true,message:"הלקוח הועבר לארכיון. התפריטים, האימונים, המדידות וההיסטוריה נשמרו במלואם."};
}

export async function restoreClient(clientId:string):Promise<Result>{
  const context=await relationshipFor(clientId,"ended");
  if(!context)return{ok:false,message:"אין הרשאה לשחזר את הלקוח."};
  const {error}=await createSupabaseAdminClient()
    .from("coach_client_relationships")
    .update({status:"active",end_date:null})
    .eq("coach_id",context.auth.id).eq("client_id",clientId).eq("status","ended");
  if(error)return{ok:false,message:"השחזור נכשל. אפשר לנסות שוב."};
  revalidatePath("/coach/clients");revalidate(clientId);
  return{ok:true,message:"הלקוח שוחזר וחזר לרשימת הלקוחות הפעילים."};
}

export async function setClientContentAssignment(clientId:string,contentItemId:string,assigned:boolean):Promise<Result>{const context=await coachFor(clientId);if(!context||!validUuid(contentItemId))return{ok:false,message:"אין הרשאה לשיוך תוכן."};const {auth,supabase}=context;const result=assigned?await supabase.from("client_content_assignments").upsert({client_id:clientId,content_item_id:contentItemId,assigned_by:auth.id},{onConflict:"client_id,content_item_id"}):await supabase.from("client_content_assignments").delete().eq("client_id",clientId).eq("content_item_id",contentItemId);if(result.error)return{ok:false,message:"שיוך התוכן לא נשמר."};revalidate(clientId);return{ok:true,message:assigned?"התוכן שויך ללקוח.":"שיוך התוכן הוסר."}}

export async function createCoachNotification(clientId:string,title:string,body:string,href:string):Promise<Result>{const context=await coachFor(clientId);if(!context||!title.trim()||!href.startsWith("/"))return{ok:false,message:"יש למלא כותרת וקישור תקינים."};const {supabase}=context;const {error}=await supabase.rpc("create_coach_notification",{p_client_id:clientId,p_title:title.trim(),p_body:body.trim(),p_href:href,p_scheduled_at:null});if(error)return{ok:false,message:"ההתראה לא נשמרה."};revalidate(clientId);return{ok:true,message:"ההתראה נשלחה ונשמרה."}}

export async function saveCoachClientNote(clientId:string,noteId:string|undefined,body:string):Promise<Result & {id?:string}>{const context=await coachFor(clientId);if(!context||!body.trim()||body.trim().length>4000)return{ok:false,message:"יש להזין הערה עד 4,000 תווים."};const {auth,supabase}=context;const payload={coach_id:auth.id,client_id:clientId,body:body.trim()};const result=noteId?await supabase.from("coach_client_notes").update({body:payload.body}).eq("id",noteId).eq("coach_id",auth.id).select("id").maybeSingle():await supabase.from("coach_client_notes").insert(payload).select("id").single();if(result.error||!result.data)return{ok:false,message:"ההערה לא נשמרה."};revalidate(clientId);return{ok:true,id:String(result.data.id),message:"ההערה נשמרה."}}

export async function deleteCoachClientNote(clientId:string,noteId:string):Promise<Result>{const context=await coachFor(clientId);if(!context||!validUuid(noteId))return{ok:false,message:"אין הרשאה למחיקת ההערה."};const {auth,supabase}=context;const {error}=await supabase.from("coach_client_notes").delete().eq("id",noteId).eq("coach_id",auth.id);if(error)return{ok:false,message:"לא ניתן למחוק את ההערה."};revalidate(clientId);return{ok:true,message:"ההערה נמחקה."}}
