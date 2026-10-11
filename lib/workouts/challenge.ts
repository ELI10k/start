import type { ExerciseSetResult } from "./types.ts";

const heaviest=(sets:readonly ExerciseSetResult[])=>Math.max(0,...sets.filter((set)=>set.completed).map((set)=>set.weightKg??0));
const roundTo=(value:number,step:number)=>Math.max(step,Math.round(value/step)*step);

export type ProgressionDecision="increase"|"hold"|"reduce";

export function progressionDecision(input:{allDone:boolean;difficulty?:"easy"|"medium"|"hard";successfulExposures?:number;deload?:boolean;fatigued?:boolean}):ProgressionDecision{
  if(input.difficulty==="hard"||!input.allDone)return"reduce";
  if(input.deload||input.fatigued)return"hold";
  return input.difficulty==="easy"&&(input.successfulExposures??0)>=2?"increase":"hold";
}

export function nextWorkoutChallenge(input:{sets:readonly ExerciseSetResult[];targetReps?:number;rpe?:number;difficulty?:"easy"|"medium"|"hard";exerciseName?:string;equipment?:string;professional?:boolean;successfulExposures?:number;deload?:boolean;fatigued?:boolean}){
  const weight=heaviest(input.sets);
  if(!weight)return null;
  const allDone=input.sets.length>0&&input.sets.every((set)=>set.completed&&(input.targetReps===undefined||(set.repetitions??0)>=input.targetReps));
  const decision=progressionDecision({allDone,difficulty:input.difficulty,successfulExposures:input.successfulExposures,deload:input.deload,fatigued:input.fatigued});
  const percent=decision==="reduce"?-5:decision==="increase"?2.5:0;
  if(input.professional)return{weightKg:Math.round(weight*(1+percent/100)*100)/100,percent,reason:decision==="reduce"?"להפחית לעומס זמין קל יותר ולבדוק טכניקה":decision==="increase"?"שתי חשיפות קלות ומוצלחות: אפשר לנסות תוספת קטנה":"שומרים על המשקל עד שתי חשיפות קלות ומוצלחות"};
  const lower=/לחיצ|חתיר|כתפ|חזה|יד|כפיפ|פשיט/.test(input.exerciseName??"")&&!/רגל|סקוואט|דדליפט/.test(input.exerciseName??"");
  const dumbbell=/משקולות יד|דאמבל|בודדות/.test(`${input.equipment??""} ${input.exerciseName??""}`);
  const step=dumbbell?1:lower?2.5:5;
  return{weightKg:roundTo(weight*(1+percent/100),step),percent,reason:decision==="reduce"?"היה קשה או שלא הושלמו כל החזרות":decision==="increase"?"שתי חשיפות קלות ומוצלחות: אפשר לנסות תוספת קטנה":"שומרים על המשקל עד שתי חשיפות קלות ומוצלחות"};
}
