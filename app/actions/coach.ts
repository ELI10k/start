"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/data/product-repository";

type Result={ok:boolean;message:string};
const validUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value);
async function coachFor(clientId:string){const auth=await getAuthContext();if(!auth||auth.role!=="coach"||!validUuid(clientId))return null;const supabase=await createSupabaseServerClient();const {data}=await supabase.from("coach_client_relationships").select("client_id").eq("coach_id",auth.id).eq("client_id",clientId).eq("status","active").maybeSingle();return data?{auth,supabase}:null}
const revalidate=(clientId:string)=>{revalidatePath(`/coach/clients/${clientId}`);revalidatePath("/content");revalidatePath("/notifications")};

export async function setClientContentAssignment(clientId:string,contentItemId:string,assigned:boolean):Promise<Result>{const context=await coachFor(clientId);if(!context||!validUuid(contentItemId))return{ok:false,message:"אין הרשאה לשיוך תוכן."};const {auth,supabase}=context;const result=assigned?await supabase.from("client_content_assignments").upsert({client_id:clientId,content_item_id:contentItemId,assigned_by:auth.id},{onConflict:"client_id,content_item_id"}):await supabase.from("client_content_assignments").delete().eq("client_id",clientId).eq("content_item_id",contentItemId);if(result.error)return{ok:false,message:"שיוך התוכן לא נשמר."};revalidate(clientId);return{ok:true,message:assigned?"התוכן שויך ללקוח.":"שיוך התוכן הוסר."}}

export async function createCoachNotification(clientId:string,title:string,body:string,href:string):Promise<Result>{const context=await coachFor(clientId);if(!context||!title.trim()||!href.startsWith("/"))return{ok:false,message:"יש למלא כותרת וקישור תקינים."};const {supabase}=context;const {error}=await supabase.rpc("create_coach_notification",{p_client_id:clientId,p_title:title.trim(),p_body:body.trim(),p_href:href,p_scheduled_at:null});if(error)return{ok:false,message:"ההתראה לא נשמרה."};revalidate(clientId);return{ok:true,message:"ההתראה נשלחה ונשמרה."}}

export async function saveCoachClientNote(clientId:string,noteId:string|undefined,body:string):Promise<Result & {id?:string}>{const context=await coachFor(clientId);if(!context||!body.trim()||body.trim().length>4000)return{ok:false,message:"יש להזין הערה עד 4,000 תווים."};const {auth,supabase}=context;const payload={coach_id:auth.id,client_id:clientId,body:body.trim()};const result=noteId?await supabase.from("coach_client_notes").update({body:payload.body}).eq("id",noteId).eq("coach_id",auth.id).select("id").maybeSingle():await supabase.from("coach_client_notes").insert(payload).select("id").single();if(result.error||!result.data)return{ok:false,message:"ההערה לא נשמרה."};revalidate(clientId);return{ok:true,id:String(result.data.id),message:"ההערה נשמרה."}}

export async function deleteCoachClientNote(clientId:string,noteId:string):Promise<Result>{const context=await coachFor(clientId);if(!context||!validUuid(noteId))return{ok:false,message:"אין הרשאה למחיקת ההערה."};const {auth,supabase}=context;const {error}=await supabase.from("coach_client_notes").delete().eq("id",noteId).eq("coach_id",auth.id);if(error)return{ok:false,message:"לא ניתן למחוק את ההערה."};revalidate(clientId);return{ok:true,message:"ההערה נמחקה."}}
