import type { ActiveExerciseResult } from "./types.ts";

/** Preserve recorded work; never mix different exercise loads in one result. */
export function substituteExercise(result:ActiveExerciseResult,performedId:string):ActiveExerciseResult{
 if(result.completed||result.sets.some(set=>set.completed))throw new Error("Recorded sets must be preserved; substitute before starting this exercise");
 return {...result,performedExerciseId:performedId===result.exerciseId?undefined:performedId,completed:false,skipped:false,difficulty:undefined,warmupCompletedPercents:[],sets:result.sets.map(set=>({...set,weightKg:undefined,repetitions:undefined,notes:undefined,completed:false,completedAt:undefined}))};
}
