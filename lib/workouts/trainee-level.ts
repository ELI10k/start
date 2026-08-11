// Which programmes a trainee level starts with.
//
// The names are matched against programmes that already exist in the catalogue -
// nothing here imports or creates a programme. If a name is not in the database
// the mapping simply yields fewer assignments, which is visible to the coach,
// rather than conjuring a programme that was never approved.

export type TraineeLevel = "beginner" | "intermediate" | "advanced";

export const TRAINEE_LEVELS: readonly TraineeLevel[] = ["beginner", "intermediate", "advanced"];

export const TRAINEE_LEVEL_LABELS: Record<TraineeLevel, string> = {
  beginner: "מתחיל",
  intermediate: "בינוני",
  advanced: "מתקדם",
};

export const isTraineeLevel = (value: unknown): value is TraineeLevel =>
  typeof value === "string" && (TRAINEE_LEVELS as readonly string[]).includes(value);

// Exact programme names as they exist in the catalogue.
export const PROGRAMMES_BY_LEVEL: Record<TraineeLevel, readonly string[]> = {
  beginner: ["FBW משקולות חופשי מתחילים", "משקל גוף מתחילים"],
  intermediate: ["אימון FBW מלא לחדר כושר", "משקל גוף מתקדמים"],
  advanced: ["A-B קצר", "A-B", "A-B-C"],
};

export type NamedProgramme = Readonly<{ id: string; name: string; trainingFrequency?: number }>;

/**
 * The programmes to assign for a level, resolved against the real catalogue.
 *
 * Matching is exact on the trimmed name. The catalogue holds names like "A-B"
 * and "A-B קצר" that are prefixes of one another, so a loose match would assign
 * the wrong programme - and a coach discovering that is a worse outcome than
 * assigning nothing.
 */
export function programmesForLevel<T extends NamedProgramme>(level: TraineeLevel, catalogue: readonly T[]): readonly T[] {
  const wanted = PROGRAMMES_BY_LEVEL[level];
  return wanted
    .map((name) => catalogue.find((programme) => programme.name.trim() === name))
    .filter((programme): programme is T => Boolean(programme));
}

/** Names the level expects that the catalogue does not have, for an honest message. */
export function missingProgrammes(level: TraineeLevel, catalogue: readonly NamedProgramme[]): readonly string[] {
  return PROGRAMMES_BY_LEVEL[level].filter((name) => !catalogue.some((programme) => programme.name.trim() === name));
}

/**
 * What changes when a client moves between levels.
 *
 * Only additions. Nothing is removed, because a completed workout belongs to the
 * assignment it was performed under: dropping the old assignment would orphan
 * that history. The coach removes a programme deliberately if they want it gone.
 */
export function assignmentsToAdd<T extends NamedProgramme>(
  level: TraineeLevel,
  catalogue: readonly T[],
  alreadyAssignedProgrammeIds: readonly string[],
): readonly T[] {
  const assigned = new Set(alreadyAssignedProgrammeIds);
  return programmesForLevel(level, catalogue).filter((programme) => !assigned.has(programme.id));
}
