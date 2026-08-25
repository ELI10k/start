import type { ClientWorkoutAssignment, CompletedWorkout, WorkoutDay, WorkoutProgram } from "./types.ts";
import { trainingWeekStart } from "./progress.ts";
import { israelDateKey } from "../date-time.ts";
export function currentTrainingWeek(startDate:string,today:string):number{const start=new Date(`${startDate}T00:00:00Z`);const end=new Date(`${today}T00:00:00Z`);return Math.max(1,Math.floor((end.getTime()-start.getTime())/(7*86400000))+1)}

export type ScheduledSession = Readonly<{ day: WorkoutDay; occurrence: number; completed: boolean }>;

// The week has as many sessions as the assignment says, not as many as the
// programme has distinct workouts. FBW is one workout trained three times a
// week and A-B is two workouts trained four times, so the days cycle to fill the
// frequency. Truncating to the number of days - which is what this used to do -
// showed a single row under a heading that said three.
export function weeklySchedule(program:WorkoutProgram,assignment:ClientWorkoutAssignment,completedWorkouts:readonly CompletedWorkout[],clientId:string,todayValue:string|Date=new Date()):readonly ScheduledSession[]{
  const days=[...program.days].sort((a,b)=>a.order-b.order);
  if(!days.length)return[];
  const sessions=Math.max(1,Math.min(14,assignment.weeklyFrequency||days.length));
  const start=weekStart(todayValue);
  // How many times each workout has already been finished this week. The second
  // FBW of the week ticks the second row, not the first one over again.
  const completedByDay=new Map<string,number>();
  for(const workout of completedWorkouts){
    // The Israeli calendar day, not the UTC one: a workout finished at 01:00
    // on Sunday is stored as Saturday 22:00Z and would be read into the week
    // that had already closed.
    if(workout.clientId!==clientId||israelDateKey(new Date(workout.completedAt))<start)continue;
    completedByDay.set(workout.dayId,(completedByDay.get(workout.dayId)??0)+1);
  }
  const seen=new Map<string,number>();
  return Array.from({length:sessions},(_,index)=>{
    const day=days[index%days.length];
    const occurrence=seen.get(day.id)??0;
    seen.set(day.id,occurrence+1);
    return{day,occurrence,completed:occurrence<(completedByDay.get(day.id)??0)};
  });
}

function weekStart(todayValue:string|Date):string{
  const dateKey=typeof todayValue==="string"?todayValue:israelDateKey(todayValue);
  return trainingWeekStart(dateKey);
}
