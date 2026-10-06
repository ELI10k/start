import type { ClientWorkoutAssignment, CompletedWorkout, WorkoutPreferences, WorkoutProgram, WorkoutScheduleChange } from "./types.ts";
import { getTodayWorkoutDay, trainingWeekStart } from "./progress.ts";
import { weeklySchedule } from "./schedule.ts";
import { isProfessionalProgram } from "./professional.ts";
import { israelDateKey } from "../date-time.ts";

const addDays=(date:string,count:number)=>{const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+count);return d.toISOString().slice(0,10);};
export function workoutAvailability(program:WorkoutProgram,assignment:ClientWorkoutAssignment,history:readonly CompletedWorkout[],today:string,preferences?:WorkoutPreferences,changes:readonly WorkoutScheduleChange[]=[]){
 const skipped=changes.filter(c=>c.assignmentId===assignment.id&&c.status==="skipped").map(c=>({dayId:c.dayId,date:c.originalDate}));
 const day=getTodayWorkoutDay(program,history,assignment.clientId,today,skipped,assignment.weeklyFrequency,assignment.id,assignment.startDate,preferences?.preferredDays);
 if(!program.days.length)return {status:"empty" as const,message:"לתוכנית אין ימי אימון"};
 if(!isProfessionalProgram(program))return {status:day?"ready" as const:"complete" as const,day,message:day?"":"סיימת את כל האימונים השבוע"};
 if(today<assignment.startDate)return{status:"recovery" as const,nextDate:assignment.startDate,message:"התוכנית תיפתח בתאריך תחילת השיוך"};
 if(assignment.endDate&&today>assignment.endDate)return{status:"complete" as const,message:"תקופת התוכנית הסתיימה; יש לפנות למאמן"};
 if(program.programType==="FBW"&&assignment.weeklyFrequency>3||program.programType==="A-B"&&assignment.weeklyFrequency>4)return{status:"recovery" as const,message:"תדירות האימונים אינה מתאימה לפיצול; נדרשת בדיקת מאמן"};
 const schedule=weeklySchedule(program,assignment,history,assignment.clientId,today,preferences?.preferredDays);
 if(!schedule.length)return{status:"recovery" as const,message:"האימון הראשון יופיע בתחילת השבוע הבא"};
 if(!day)return {status:"complete" as const,message:"סיימת את כל האימונים השבוע"};
 const answered=new Map<string,number>();
 const week=trainingWeekStart(today);
 for(const w of history.filter(w=>w.assignmentId===assignment.id&&israelDateKey(new Date(w.completedAt))>=week&&israelDateKey(new Date(w.completedAt))<=today)){answered.set(w.dayId,(answered.get(w.dayId)??0)+1);}
 for(const s of skipped.filter(s=>s.date>=week&&s.date<=today))answered.set(s.dayId,(answered.get(s.dayId)??0)+1);
 const due=schedule.find(s=>s.day.id===day.id&&s.occurrence>=(answered.get(day.id)??0));
 let nextDate=due?.scheduledDate??today;
 const moved=changes.find(c=>c.assignmentId===assignment.id&&c.status==="planned"&&c.dayId===day.id&&c.originalDate===nextDate);
 if(moved)nextDate=moved.scheduledDate;
 const latest=[...history].filter(w=>w.clientId===assignment.clientId&&israelDateKey(new Date(w.completedAt))<=today).sort((a,b)=>b.completedAt.localeCompare(a.completedAt))[0];
 if(latest){const previousDate=israelDateKey(new Date(latest.completedAt));const gap=program.programType==="FBW"||assignment.weeklyFrequency<=3||latest.programId===program.id&&latest.dayId===day.id?2:1;nextDate=[nextDate,addDays(previousDate,gap)].sort().at(-1)!;}
 if(nextDate>today)return {status:"recovery" as const,day,nextDate,message:`יום התאוששות. האימון הבא זמין מ־${nextDate.split("-").reverse().join("/")}`};
 return{status:"ready" as const,day,nextDate,message:""};
}
