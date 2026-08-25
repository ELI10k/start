"use server";
import {revalidatePath}from"next/cache";
import{getAuthContext}from"@/lib/data/product-repository";
import{createSupabaseServerClient}from"@/lib/supabase/server";
export async function reviewWorkoutCycle(form:FormData){const auth=await getAuthContext();if(!auth||auth.role!=="coach")return;const id=String(form.get("id")??"");const decision=String(form.get("decision")??"");if(!/^[0-9a-f-]{36}$/i.test(id)||!['approve','reject'].includes(decision))return;const s=await createSupabaseServerClient();const{data}=await s.from("workout_cycle_proposals").select("proposed_program").eq("id",id).maybeSingle();if(!data)return;await s.rpc("review_workout_cycle_proposal",{p_id:id,p_decision:decision,p_program:data.proposed_program,p_note:String(form.get("note")??"")});revalidatePath("/coach/workouts/cycles");revalidatePath("/coach/workouts");}
