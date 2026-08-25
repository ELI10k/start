import type { SupabaseClient } from "@supabase/supabase-js";

type Row=Record<string,unknown>;
const rows=(value:unknown)=>Array.isArray(value)?value as Row[]:[];
const nextReps=(value:string)=>{
  const normalized=value.replace(/\s/g,"").toLowerCase();
  if(normalized==="8-10")return"10-12";
  if(normalized==="10-12"||normalized==="12")return"8-10";
  if(normalized==="12-15"||normalized==="15-12"||normalized==="12-10")return"10-12";
  if(normalized==="15-20")return"12-15";
  if(normalized==="max")return"8-12";
  return value;
};

/** Creates coach-only drafts. It never changes an assignment or exposes a programme to a client. */
export async function generateWorkoutCycleProposals(supabase:SupabaseClient,today:string){
  const cutoff=new Date(`${today}T12:00:00Z`);cutoff.setUTCDate(cutoff.getUTCDate()-27);const oldestEligible=cutoff.toISOString().slice(0,10);
  const{data:assignments,error}=await supabase.from("workout_assignments").select("id,client_id,program_id,assigned_by,start_date,weekly_frequency,status").eq("status","active").lte("start_date",oldestEligible);
  if(error)throw error;let created=0;
  for(const assignment of rows(assignments)){
    const assignmentId=String(assignment.id),clientId=String(assignment.client_id),programId=String(assignment.program_id),coachId=String(assignment.assigned_by);
    const assignmentStart=new Date(`${String(assignment.start_date)}T12:00:00Z`),now=new Date(`${today}T12:00:00Z`);const elapsed=Math.floor((now.getTime()-assignmentStart.getTime())/86400000)+1,completedCycles=Math.floor(elapsed/28);if(completedCycles<1)continue;const start=new Date(assignmentStart);start.setUTCDate(start.getUTCDate()+(completedCycles-1)*28);const end=new Date(start);end.setUTCDate(end.getUTCDate()+27);const cycleStart=start.toISOString().slice(0,10),cycleEnd=end.toISOString().slice(0,10);
    const expected=Math.max(4,Number(assignment.weekly_frequency)*4);
    const{count,error:countError}=await supabase.from("workout_sessions").select("id",{count:"exact",head:true}).eq("assignment_id",assignmentId).eq("status","completed").gte("completed_at",`${cycleStart}T00:00:00+03:00`).lte("completed_at",`${cycleEnd}T23:59:59+03:00`);
    if(countError)throw countError;const completed=count??0,percent=Math.min(100,Math.round(completed/expected*100));if(percent<80)continue;
    const[{data:program},{data:days},{data:entries},{data:sets}]=await Promise.all([
      supabase.from("workout_programs").select("*").eq("id",programId).single(),
      supabase.from("workout_program_days").select("*").eq("program_id",programId).order("sort_order"),
      supabase.from("workout_program_exercises").select("*").order("sort_order"),
      supabase.from("workout_set_prescriptions").select("*").order("sort_order")]);
    if(!program)continue;const changes:Row[]=[];
    const proposedDays=rows(days).map(day=>({name:String(day.name),order:Number(day.sort_order),exercises:rows(entries).filter(entry=>entry.day_id===day.id).map(entry=>{
      const before=String(entry.reps_text??"");const after=nextReps(before);if(before&&after!==before)changes.push({type:"reps",exerciseId:entry.exercise_id,from:before,to:after,reason:"מחזור חזרות חדש לאחר ארבעה שבועות"});
      return{exerciseId:String(entry.exercise_id),order:Number(entry.sort_order),sets:String(entry.sets_text??""),reps:after,rest:String(entry.rest_text??""),notes:String(entry.notes??""),setPrescriptions:rows(sets).filter(set=>set.program_exercise_id===entry.id).map(set=>({order:Number(set.sort_order),repetitions:nextReps(String(set.repetitions??before))}))};
    })}));
    const proposed={name:`${String(program.name)} — מחזור הבא`,description:String(program.description??""),programType:String(program.program_type??""),difficulty:String(program.difficulty??""),equipment:program.equipment??[],days:proposedDays};
    const{data:inserted,error:insertError}=await supabase.from("workout_cycle_proposals").upsert({coach_id:coachId,client_id:clientId,assignment_id:assignmentId,current_program_id:programId,cycle_start:cycleStart,cycle_end:cycleEnd,completed_workouts:completed,expected_workouts:expected,completion_percent:percent,proposed_program:proposed,changes},{onConflict:"assignment_id,cycle_start",ignoreDuplicates:true}).select("id").maybeSingle();
    if(insertError)throw insertError;if(!inserted)continue;created++;
    await supabase.rpc("create_in_app_notification",{p_recipient_id:coachId,p_actor_id:clientId,p_category:"workouts",p_type:"coach_message",p_title:"הצעה לתוכנית האימון הבאה",p_body:`הלקוח השלים ${completed} מתוך ${expected} אימונים. ההצעה ממתינה לאישור שלך.`,p_href:"/coach/workouts/cycles",p_source_table:"workout_cycle_proposals",p_source_id:String(inserted.id),p_dedupe_key:`workout-cycle-${inserted.id}`});
  }
  return created;
}
