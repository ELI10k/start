export type ExerciseVideo = Readonly<{ url: string; provider: "youtube"; title?: string }>;
export type ExerciseStatus = "active" | "archived";
export type ExerciseSourceReference = Readonly<{workbook:string;sheet:string;cell:string;name:string}>;
// Guidance is coach-authored and always optional. Nothing is generated: an
// exercise with no guidance renders as "not supplied", never as invented advice.
export type ExerciseGuidance = Readonly<{ imageUrl?: string; howTo?: string; cues: readonly string[]; commonMistakes: readonly string[] }>;
export type Exercise = Readonly<{ id: string; name: string; normalizedName: string; aliases:readonly string[]; category?: string; primaryMuscleGroup?: string; secondaryMuscleGroups: readonly string[]; equipment?: string; difficulty?: string; video?: ExerciseVideo; executionNotes?: string; imageUrl?: string; howTo?: string; cues: readonly string[]; commonMistakes: readonly string[]; sourceWorkbooks: readonly string[]; sourceReferences:readonly ExerciseSourceReference[]; status: ExerciseStatus }>;
export type WorkoutSetPrescription = Readonly<{ id: string; order: number; repetitions?: string }>;
export type WorkoutExercise = Readonly<{ id: string; exerciseId: string; order: number; sets?: string; reps?: string; rest?: string; notes?: string; sourceRow?:number; setPrescriptions?: readonly WorkoutSetPrescription[] }>;
export type WorkoutDay = Readonly<{ id: string; name: string; order: number; sourceSheet?:string; exercises: readonly WorkoutExercise[] }>;
export type WorkoutProgramStatus = "active" | "archived";
export type WorkoutProgram = Readonly<{ id: string; name: string; description?: string; programType?: string; difficulty?: string; trainingFrequency?: number; equipment: readonly string[]; sourceWorkbook: string; sourceSheet?:string; status: WorkoutProgramStatus; official: boolean; days: readonly WorkoutDay[]; duplicatedFromId?: string }>;
export type AssignmentStatus = "active" | "paused" | "completed" | "archived";
export type ClientWorkoutAssignment = Readonly<{ id: string; clientId: string; programId: string; assignedAt: string; startDate: string; endDate?: string; weeklyFrequency: number; coachNote?: string; status: AssignmentStatus }>;
export type ExerciseSetResult = Readonly<{ id: string; prescriptionId?: string; order: number; weightKg?: number; repetitions?: number; notes?: string; completed: boolean; completedAt?: string }>;
export type ActiveExerciseResult = Readonly<{ workoutExerciseId: string; exerciseId: string; skipped: boolean; completed: boolean; sets: readonly ExerciseSetResult[] }>;
export type ActiveWorkoutSession = Readonly<{ id: string; clientId: string; assignmentId: string; programId: string; dayId: string; startedAt: string; currentExerciseIndex: number; restEndsAt?: string; workoutNote?: string; perceivedDifficulty?:1|2|3|4|5; energy?:1|2|3|4|5; exerciseResults: readonly ActiveExerciseResult[] }>;
export type CompletedWorkout = Readonly<{ id: string; clientId: string; assignmentId: string; programId: string; dayId: string; startedAt: string; completedAt: string; durationSeconds: number; exerciseResults: readonly ActiveExerciseResult[]; workoutNote?: string; perceivedDifficulty?: 1|2|3|4|5; energy?: 1|2|3|4|5; totalVolume: number }>;
export type WorkoutHistoryEntry = CompletedWorkout;
export type ExercisePerformanceHistory = Readonly<{ exerciseId: string; sessions: readonly { workoutId: string; date: string; sets: readonly ExerciseSetResult[]; volume: number }[] }>;
export type CoachWorkoutNote = Readonly<{ id: string; coachId: string; clientId: string; exerciseId?: string; workoutId?: string; body: string; createdAt: string }>;
export type WorkoutNotification = Readonly<{ id: string; clientId: string; type: "assignment"|"completed-workout"|"missed-workout"; createdAt: string; read: boolean }>;
export type WorkoutPreferences = Readonly<{ clientId:string; trainingTypes:readonly string[]; equipment:readonly string[]; trainingLocation?:string; preferredDays:readonly number[] }>;
export type WorkoutClient = Readonly<{ id:string; fullName:string }>;
export type WorkoutScheduleChange = Readonly<{id:string;assignmentId:string;clientId:string;programId:string;dayId:string;originalDate:string;scheduledDate:string;movedAt:string;status:"planned"|"skipped";skippedAt?:string;skippedReason?:string}>;
export type WorkoutRepositorySnapshot = Readonly<{ exercises:readonly Exercise[]; programs: readonly WorkoutProgram[]; clients:readonly WorkoutClient[]; assignments: readonly ClientWorkoutAssignment[]; activeSessions: readonly ActiveWorkoutSession[]; completedWorkouts: readonly CompletedWorkout[]; coachNotes: readonly CoachWorkoutNote[]; notifications: readonly WorkoutNotification[]; workoutPreferences:readonly WorkoutPreferences[]; scheduleChanges:readonly WorkoutScheduleChange[] }>;
