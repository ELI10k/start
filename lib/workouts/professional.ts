import type { WorkoutProgram } from "./types.ts";
export const isProfessionalProgram=(program:WorkoutProgram)=>/^LIFE FIT — מקצועי v\d+/.test(program.sourceWorkbook);

export function trainingSlots(frequency:number,fbw:boolean,preferred:readonly number[]=[]):number[]{
 if(fbw&&frequency>3)return [];
 const defaults:Record<number,number[]>={1:[0],2:[0,3],3:[0,2,4],4:[0,1,3,4],5:[0,1,2,4,5],6:[0,1,2,3,4,5]};
 const days=[...new Set(preferred)].filter(d=>Number.isInteger(d)&&d>=0&&d<7).sort((a,b)=>a-b);
 const spaced=!fbw&&frequency>3||days.every((d,i)=>((days[(i+1)%days.length]+(i===days.length-1?7:0))-d)>=2);
 return days.length===frequency&&spaced?days:defaults[frequency]??[];
}
export function professionalWeekLayout(program:WorkoutProgram,startDate:string,frequency:number,weekStart:string,preferred:readonly number[]=[]){
 const slots=trainingSlots(frequency,program.programType==="FBW",preferred);
 const startDay=new Date(`${startDate}T00:00:00Z`).getUTCDay();
 const startWeek=new Date(`${startDate}T00:00:00Z`);startWeek.setUTCDate(startWeek.getUTCDate()-startDay);
 const weeks=Math.max(0,Math.floor((Date.parse(weekStart)-startWeek.getTime())/(7*86400000)));
 const first=slots.filter(d=>d>=startDay);
 return {slots:weeks===0?first:slots,offset:weeks===0?0:first.length+(weeks-1)*frequency};
}
