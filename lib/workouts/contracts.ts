import type { ActiveWorkoutSession, ClientWorkoutAssignment, CoachWorkoutNote, CompletedWorkout, Exercise, ExercisePerformanceHistory, WorkoutNotification, WorkoutPreferences, WorkoutProgram, WorkoutRepositorySnapshot } from "./types.ts";
export interface ExerciseRepository { getAll():readonly Exercise[]; getById(id:string):Exercise|undefined; search(query:Readonly<{search?:string;muscleGroup?:string;equipment?:string;category?:string;difficulty?:string}>):readonly Exercise[]; }
export interface WorkoutProgramRepository { getAll():readonly WorkoutProgram[]; getById(id:string):WorkoutProgram|undefined; }
export interface WorkoutAssignmentRepository { getForClient(clientId:string):readonly ClientWorkoutAssignment[]; save(assignment:ClientWorkoutAssignment):void; }
export interface ActiveWorkoutSessionRepository { getForClient(clientId:string):ActiveWorkoutSession|undefined; save(session:ActiveWorkoutSession):void; cancel(clientId:string):void; }
export interface CompletedWorkoutRepository { getForClient(clientId:string):readonly CompletedWorkout[]; save(workout:CompletedWorkout):void; }
export interface ExercisePerformanceRepository { getForClient(clientId:string,exerciseId:string):ExercisePerformanceHistory; }
export interface CoachWorkoutNoteRepository { getForClient(clientId:string):readonly CoachWorkoutNote[]; save(note:CoachWorkoutNote):void; }
export interface WorkoutPreferencesRepository { getForClient(clientId:string):WorkoutPreferences|undefined; save(preferences:WorkoutPreferences):void; }
export interface WorkoutNotificationRepository { getForClient(clientId:string):readonly WorkoutNotification[]; save(notification:WorkoutNotification):void; }
export interface WorkoutPersistenceRepository { load():WorkoutRepositorySnapshot; save(snapshot:WorkoutRepositorySnapshot):void; reset():void; }
