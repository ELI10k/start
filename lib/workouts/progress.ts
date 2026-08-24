import type { ActiveExerciseResult, ClientWorkoutAssignment, CompletedWorkout, ExercisePerformanceHistory, ExerciseSetResult, WorkoutDay, WorkoutProgram } from "./types.ts";
/**
 * The training week starts on Sunday, and so does the programme.
 *
 * The week the client and the coach both mean when they say "this week".
 */
const dateOnly=(value:string)=>value.slice(0,10);

export function trainingWeekStart(dateKey: string): string {
  const day = new Date(`${dateKey}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - day.getUTCDay());
  return day.toISOString().slice(0, 10);
}

/**
 * Which day of the programme is due: the first one this week nobody has answered for.
 *
 * This was a count - `days[answered % days.length]` - and a count does not know
 * WHICH day was answered. A client who declared אימון 3 missed had the pointer
 * moved on by one and was offered אימון 2, a workout they had said nothing
 * about, because one thing had been answered and one step was taken.
 *
 * The week holds every day of the programme and the client may do all of them,
 * Sunday to Saturday. So the question is not how many are behind us; it is which
 * one is still unanswered. Completing a day answers it, and so does declaring it
 * missed - that is what declaring is for - and the days answer independently, in
 * whatever order the client gets to them.
 *
 * When they have all been answered the first is offered again rather than
 * nothing: doing one twice is the client's decision, running out of week is not.
 */
export function getTodayWorkoutDay(
  program:WorkoutProgram,
  completedWorkouts:readonly CompletedWorkout[],
  clientId:string,
  // Optional so every existing caller keeps working; when absent the week is
  // taken from the machine's own date, which is what all of them meant.
  today:string=new Date().toISOString().slice(0,10),
  // Days declared missed, as {dayId, date} - the date so the week can be
  // bounded, the day so the right one is crossed off.
  skipped:readonly {dayId:string;date:string}[]=[],
):WorkoutDay|undefined{
  if(!program.days.length)return undefined;
  const opened=trainingWeekStart(today);
  const inWeek=(date:string)=>date>=opened&&date<=today;
  const answered=new Set<string>([
    ...completedWorkouts
      .filter((item)=>item.clientId===clientId&&item.programId===program.id&&inWeek(dateOnly(item.completedAt)))
      .map((item)=>item.dayId),
    ...skipped.filter((item)=>inWeek(item.date)).map((item)=>item.dayId),
  ]);
  const ordered=[...program.days].sort((a,b)=>a.order-b.order);
  return ordered.find((day)=>!answered.has(day.id))??ordered[0];
}

export function workoutCompletionPercent(total:number,completed:number):number{return total<=0?0:Math.min(100,Math.max(0,Math.round(completed/total*100)))}
export function workoutVolume(workout:Pick<CompletedWorkout,"exerciseResults">|readonly ActiveExerciseResult[]):number{const results:readonly ActiveExerciseResult[]=Array.isArray(workout)?workout:(workout as Pick<CompletedWorkout,"exerciseResults">).exerciseResults;return results.flatMap((exercise)=>exercise.sets).filter((set)=>set.completed).reduce((sum,set)=>sum+(set.weightKg??0)*(set.repetitions??0),0)}
export function exercisePerformance(workouts:readonly CompletedWorkout[],clientId:string,exerciseId:string):ExercisePerformanceHistory{const sessions=workouts.filter((workout)=>workout.clientId===clientId&&workout.exerciseResults.some((entry)=>entry.exerciseId===exerciseId)).map((workout)=>{const sets=workout.exerciseResults.find((entry)=>entry.exerciseId===exerciseId)?.sets??[];return{workoutId:workout.id,date:workout.completedAt,sets,volume:sets.reduce((sum,set)=>sum+(set.weightKg??0)*(set.repetitions??0),0)}}).sort((a,b)=>b.date.localeCompare(a.date));return{exerciseId,sessions}}
export function activeAssignmentFor(assignments:readonly ClientWorkoutAssignment[],clientId:string,date:string):ClientWorkoutAssignment|undefined{return[...assignments].reverse().find((item)=>item.clientId===clientId&&item.status==="active"&&item.startDate<=date&&(!item.endDate||item.endDate>=date))}
// Every programme the client is running right now, newest first. A client may
// hold more than one active assignment since the coach can add a programme
// instead of replacing the running one.
export function activeAssignmentsFor(assignments:readonly ClientWorkoutAssignment[],clientId:string,date:string):ClientWorkoutAssignment[]{return[...assignments].reverse().filter((item)=>item.clientId===clientId&&item.status==="active"&&item.startDate<=date&&(!item.endDate||item.endDate>=date))}
export function assignmentState(assignment:ClientWorkoutAssignment,date:string):"not-started"|"expired"|"paused"|"completed"|"active"{if(assignment.status==="paused")return"paused";if(assignment.status==="completed"||assignment.status==="archived")return"completed";if(assignment.startDate>date)return"not-started";if(assignment.endDate&&assignment.endDate<date)return"expired";return"active"}
export function adherenceSummary(assignmentOrWorkouts:ClientWorkoutAssignment|readonly CompletedWorkout[],workoutsOrAssignment:readonly CompletedWorkout[]|ClientWorkoutAssignment|undefined,todayValue:string|Date){const legacy=Array.isArray(assignmentOrWorkouts);const assignment=(legacy?workoutsOrAssignment:assignmentOrWorkouts) as ClientWorkoutAssignment|undefined;const workouts=(legacy?assignmentOrWorkouts:workoutsOrAssignment) as readonly CompletedWorkout[];if(!assignment)return{completed:0,expected:0,missed:0,percent:0};const today=typeof todayValue==="string"?todayValue:todayValue.toISOString().slice(0,10);const start=new Date(`${assignment.startDate}T00:00:00Z`);const end=new Date(`${today}T00:00:00Z`);const elapsedDays=Math.max(1,Math.floor((end.getTime()-start.getTime())/86400000)+1);const expected=Math.max(1,Math.ceil(elapsedDays/7*assignment.weeklyFrequency));const completed=workouts.filter((item)=>item.assignmentId===assignment.id&&dateOnly(item.completedAt)>=assignment.startDate&&dateOnly(item.completedAt)<=today).length;return{completed,expected,missed:Math.max(0,expected-completed),percent:Math.min(100,Math.round(completed/expected*100))}}
export function workoutStreak(workouts:readonly CompletedWorkout[],clientId:string):number{const dates=[...new Set(workouts.filter((item)=>item.clientId===clientId).map((item)=>dateOnly(item.completedAt)))].sort((a,b)=>b.localeCompare(a));if(!dates.length)return 0;let streak=1;for(let i=1;i<dates.length;i++){const previous=new Date(`${dates[i-1]}T00:00:00Z`);const current=new Date(`${dates[i]}T00:00:00Z`);if((previous.getTime()-current.getTime())/86400000>7)break;streak++}return streak}
export function trend(current?:number,previous?:number):"up"|"down"|"stable"|"insufficient-data"{if(current===undefined||previous===undefined)return"insufficient-data";if(current>previous)return"up";if(current<previous)return"down";return"stable"}

// The best set that is actually comparable to what is being lifted today.
//
// "שיא 60 ק״ג" was the heaviest weight ever moved on the exercise, whatever the
// rep count. A 12-rep back-off set and a 10-rep working set are not the same
// effort, so a client working at 10 was being shown a number from a different
// job and told it was their benchmark. Comparing within a rep window fixes that;
// with no comparable set the honest answer is none, not the heaviest available.
export function bestComparableSet(
  sessions:readonly {sets:readonly ExerciseSetResult[]}[],
  targetReps:number|undefined,
  // One rep either way. Two was too generous to fix the reported problem: with a
  // target of 10 it still admitted the 12-rep set that started this, which is the
  // comparison a client called wrong.
  tolerance=1,
):{weightKg:number;repetitions:number}|null{
  const done=sessions.flatMap((session)=>session.sets).filter((set)=>
    set.completed&&typeof set.weightKg==="number"&&set.weightKg>0);
  if(!done.length)return null;
  const comparable=Number.isFinite(targetReps)&&targetReps
    ?done.filter((set)=>typeof set.repetitions==="number"&&Math.abs(set.repetitions-targetReps)<=tolerance)
    :done;
  if(!comparable.length)return null;
  // Heaviest first; among equal weights the one that got more reps out of it.
  const best=[...comparable].sort((a,b)=>
    (b.weightKg??0)-(a.weightKg??0)||(b.repetitions??0)-(a.repetitions??0))[0];
  return{weightKg:best.weightKg as number,repetitions:best.repetitions??0};
}

// "10", "8-12" and "10 חזרות" all have to yield a number to compare against.
export function targetRepetitions(reps?:string):number|undefined{
  if(!reps)return undefined;
  const numbers=[...reps.matchAll(/\d+/g)].map((match)=>Number(match[0])).filter(Number.isFinite);
  if(!numbers.length)return undefined;
  // A range is represented by its midpoint - the middle of "8-12" is the work.
  return Math.round(numbers.reduce((sum,value)=>sum+value,0)/numbers.length);
}
