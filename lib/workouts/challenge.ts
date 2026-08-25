import type { ExerciseSetResult } from "./types.ts";

const heaviest=(sets:readonly ExerciseSetResult[])=>Math.max(0,...sets.filter((set)=>set.completed).map((set)=>set.weightKg??0));
const roundTo=(value:number,step:number)=>Math.max(step,Math.round(value/step)*step);

export function nextWorkoutChallenge(input:{sets:readonly ExerciseSetResult[];targetReps?:number;rpe?:number;difficulty?:"easy"|"hard";exerciseName?:string;equipment?:string}){
  const weight=heaviest(input.sets);
  if(!weight)return null;
  const allDone=input.sets.length>0&&input.sets.every((set)=>set.completed&&(input.targetReps===undefined||(set.repetitions??0)>=input.targetReps));
  const hard=input.difficulty==="hard"||input.rpe===10||!allDone;
  const easy=input.difficulty==="easy"||(allDone&&(input.rpe??8)<=7);
  const percent=hard?-7.5:easy?5:input.rpe===8?2.5:0;
  const lower=/לחיצ|חתיר|כתפ|חזה|יד|כפיפ|פשיט/.test(input.exerciseName??"")&&!/רגל|סקוואט|דדליפט/.test(input.exerciseName??"");
  const dumbbell=/משקולות יד|דאמבל|בודדות/.test(`${input.equipment??""} ${input.exerciseName??""}`);
  const step=dumbbell?1:lower?2.5:5;
  return{weightKg:roundTo(weight*(1+percent/100),step),percent,reason:hard?"היה קשה או שלא הושלמו כל החזרות":easy?"כל החזרות הושלמו ונשאר כוח":input.rpe===8?"הביצוע הושלם ב־RPE 8":"שומרים על המשקל ומשפרים ביצוע"};
}
