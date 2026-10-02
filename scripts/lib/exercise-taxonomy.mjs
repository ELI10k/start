export const EXERCISE_CATEGORIES = ["משקולות", "מכונות", "משקל גוף", "TRX"];

const MISSING_EQUIPMENT_BY_ID = new Map(Object.entries({
  "exercise-h4hp4e": "מוט",
  "exercise-19zx08z": "כבל פולי",
  "exercise-1urdov4": "משקל גוף",
  "exercise-lp8zrd": "משקולות יד",
  "exercise-126wehi": "מכונה ייעודית",
  "exercise-1h0qzj6": "משקולות יד",
  "exercise-1k0kcxw": "משקל גוף",
  "exercise-1nk9ffl": "מוט W",
  "exercise-1mo876e": "מכונה ייעודית",
  "exercise-1rpyv0f": "משקל גוף",
  "exercise-1oguz0o": "משקל גוף",
  "exercise-12xg42y": "מכונה ייעודית",
  "exercise-150kpke": "משקולות יד",
  "exercise-vba4vh": "משקולות יד",
  "exercise-1b7p0zl": "מוט",
  "exercise-yt2erg": "משקולות יד",
  "exercise-1actjvi": "כבל פולי",
}));

const EQUIPMENT_ALIASES = new Map(Object.entries({
  "כבל": "כבל פולי",
  "כבלים": "כבל פולי",
  "פולי": "כבל פולי",
  "מכונה": "מכונה ייעודית",
  "משקולת": "משקולות יד",
  "משקולות": "משקולות יד",
}));

export function canonicalizeEquipment(exercise) {
  const current = exercise.equipment?.trim();
  if (current) return EQUIPMENT_ALIASES.get(current) ?? current;

  const explicit = MISSING_EQUIPMENT_BY_ID.get(exercise.id);
  if (explicit) return explicit;

  const text = `${exercise.name ?? ""} ${exercise.category ?? ""}`;
  if (/משקל גוף/.test(text)) return "משקל גוף";
  if (/רצוע(?:ה|ות) תל(?:יה|ייה)|\btrx\b/i.test(text)) return "רצועות תלייה";
  if (/כבל|פולי/.test(text)) return "כבל פולי";
  if (/מכונ|המר/.test(text)) return "מכונה ייעודית";
  if (/קטלבל/.test(text)) return "קטלבל";
  if (/משקול/.test(text)) return "משקולות יד";
  if (/מוט/.test(text)) return "מוט";
  return current;
}

export function canonicalizeMuscle(muscle) {
  return muscle === "ליבה" ? "שרירי ליבה" : muscle;
}

export function categorizeExercise(exercise) {
  const equipment = canonicalizeEquipment(exercise) ?? "";
  const sourceText = (exercise.source_references ?? exercise.sourceReferences ?? [])
    .flatMap((reference) => [reference?.workbook, reference?.sheet])
    .filter(Boolean)
    .join(" ");
  const text = [exercise.id, exercise.name, exercise.category, equipment, sourceText]
    .filter(Boolean)
    .join(" ");

  if (/\btrx\b|רצוע(?:ה|ות) תל(?:יה|ייה)/i.test(text)) return "TRX";
  if (exercise.category === "משקל גוף" || equipment === "משקל גוף" || exercise.id?.startsWith("bodyweight-") || /משקל גוף/.test(sourceText)) {
    return "משקל גוף";
  }
  if (exercise.category === "מכונות" || /מכונ|כבל|פולי|סמית|המר/.test(`${exercise.name ?? ""} ${equipment}`)) {
    return "מכונות";
  }
  return "משקולות";
}
