import type { Exercise, ExerciseGuidance } from "./types";

// What the "דגשים לתרגיל" panel renders, section by section. Every section is
// either present with real content or absent - there is no filler. The panel is
// allowed to say "לא סופק מידע"; it is never allowed to make something up.
export type GuidanceSection = Readonly<{ key: GuidanceSectionKey; title: string; kind: "text" | "list"; text?: string; items?: readonly string[] }>;
export type GuidanceSectionKey = "how-to" | "cues" | "mistakes" | "muscles" | "assisting-muscles" | "equipment";
export type ExerciseGuidanceView = Readonly<{
  exerciseId: string;
  name: string;
  imageUrl?: string;
  sections: readonly GuidanceSection[];
  missing: readonly GuidanceSectionKey[];
  hasAnyContent: boolean;
  videoUrl?: string;
}>;

const MAX_POINTS = 6;
const MAX_HOW_TO = 2000;
const MAX_IMAGE_URL = 500;

const clean = (value?: string) => {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : undefined;
};

const cleanList = (values: readonly string[] | undefined) =>
  [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].slice(0, MAX_POINTS);

// An image is only rendered when it is an https URL. A http or data URL from a
// stale import would either be blocked by the browser or be unverifiable, and a
// broken image reads worse than an honest placeholder.
export const isRenderableImageUrl = (value?: string) => {
  const url = clean(value);
  if (!url || url.length > MAX_IMAGE_URL) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

// The catalogue already links to Eli's approved YouTube demonstrations. When a
// separate still image was not uploaded, the video's own thumbnail is the most
// faithful image available: it depicts the exact exercise and does not invent
// new coaching content.
export const youtubeThumbnailUrl = (value?: string) => {
  const raw = clean(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLocaleLowerCase();
    let videoId: string | undefined;
    if (host === "youtu.be" || host === "www.youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0];
    if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
      videoId = url.pathname === "/watch" ? url.searchParams.get("v") ?? undefined : url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];
    }
    if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return undefined;
    // hqdefault, not maxresdefault.
    //
    // YouTube generates maxresdefault only for videos uploaded at HD, so for
    // most of this catalogue it does not exist - every exercise card fired a
    // request that 404ed, showed a placeholder, then swapped to hqdefault and
    // loaded it. Two requests and a visible flicker per card, on a screen that
    // shows a list of them. hqdefault exists for every video that exists, and
    // at 480x360 it is larger than the 80x64 the card draws.
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  } catch {
    return undefined;
  }
};

// The imported spreadsheets did not carry secondary-muscle columns. These are
// deliberately conservative, exercise-specific coaching labels: a muscle is
// shown only when the movement pattern makes it a meaningful assistant. This
// is preferable to copying the primary body-part label into both sections.
export function curatedAssistingMuscles(exercise: Exercise): readonly string[] {
  const name = exercise.normalizedName || exercise.name;
  const matches = (pattern: RegExp) => pattern.test(name);
  if (matches(/חימום/)) return [];
  if (matches(/לחיצת חזה|שכיבות סמיכה/)) return ["יד אחורית", "כתף קדמית"];
  if (matches(/פרפר/)) return ["כתף קדמית"];
  if (matches(/לחיצ.*כתפ/)) return ["יד אחורית", "חזה עליון"];
  if (matches(/הרחקה אופקית|כתף אחורית/)) return ["גב עליון", "טרפז"];
  if (matches(/הרחקת כתפיים/)) return ["טרפז"];
  if (matches(/חתירה/)) return ["יד קדמית", "כתף אחורית"];
  if (matches(/פולי עליון|מתח|פול אובר/)) return ["יד קדמית", "כתף אחורית"];
  if (matches(/דד ליפט/)) return ["ישבן", "המסטרינג", "גב תחתון"];
  if (matches(/סומו/)) return ["ישבן", "מקרבי הירך", "המסטרינג"];
  if (matches(/סקוואט|לחיצת רגליים|לאנג/)) return ["ישבן", "המסטרינג"];
  if (matches(/כפיפת רגליים/)) return ["תאומים"];
  if (matches(/פשיטת רגליים/)) return [];
  if (matches(/הרחקת ירך|רגל לאחור/)) return ["ישבן"];
  if (matches(/כפיפ(?:ה|ת) מרפקים|פטישים/)) return ["אמות"];
  if (matches(/פשיטת מרפקים|לחיצה צרפתית|קיק בק|יד אחורית/)) return [];
  if (matches(/כפיפות בטן|הרמת רגליים|אופניים/)) return ["מכופפי הירך"];
  return [];
}

export function normalizeGuidance(input: Partial<ExerciseGuidance>): ExerciseGuidance {
  const imageUrl = clean(input.imageUrl);
  return {
    imageUrl: isRenderableImageUrl(imageUrl) ? imageUrl : undefined,
    howTo: clean(input.howTo)?.slice(0, MAX_HOW_TO),
    cues: cleanList(input.cues),
    commonMistakes: cleanList(input.commonMistakes),
  };
}

export type GuidanceValidation = Readonly<{ valid: boolean; message?: string; guidance: ExerciseGuidance }>;

export function validateGuidance(input: Partial<ExerciseGuidance>): GuidanceValidation {
  const guidance = normalizeGuidance(input);
  const rawImage = clean(input.imageUrl);
  if (rawImage && !guidance.imageUrl) return { valid: false, message: "כתובת התמונה חייבת להתחיל ב-https ולהיות קצרה מ-500 תווים.", guidance };
  if ((input.cues ?? []).filter((value) => value.trim()).length > MAX_POINTS) return { valid: false, message: `עד ${MAX_POINTS} דגשים.`, guidance };
  if ((input.commonMistakes ?? []).filter((value) => value.trim()).length > MAX_POINTS) return { valid: false, message: `עד ${MAX_POINTS} טעויות נפוצות.`, guidance };
  if ((clean(input.howTo)?.length ?? 0) > MAX_HOW_TO) return { valid: false, message: "הסבר הביצוע ארוך מדי.", guidance };
  return { valid: true, guidance };
}

// The catalogue import already carries execution notes copied verbatim from the
// source workbooks. Those are real coach words, so they stand in for "how to
// perform" until the coach writes a dedicated explanation.
export function buildGuidanceView(exercise: Exercise): ExerciseGuidanceView {
  const guidance = normalizeGuidance(exercise);
  const howTo = guidance.howTo ?? clean(exercise.executionNotes);
  const primaryMuscles = cleanList(exercise.primaryMuscleGroup ? [exercise.primaryMuscleGroup] : []);
  const assistingMuscles = cleanList(exercise.secondaryMuscleGroups.length ? exercise.secondaryMuscleGroups : primaryMuscles.length ? curatedAssistingMuscles(exercise) : []).filter((muscle) => !primaryMuscles.includes(muscle));
  const equipment = clean(exercise.equipment);

  const sections: GuidanceSection[] = [];
  const missing: GuidanceSectionKey[] = [];

  if (howTo) sections.push({ key: "how-to", title: "איך מבצעים", kind: "text", text: howTo });
  else missing.push("how-to");

  if (guidance.cues.length) sections.push({ key: "cues", title: "דגשים חשובים", kind: "list", items: guidance.cues });
  else missing.push("cues");

  if (guidance.commonMistakes.length) sections.push({ key: "mistakes", title: "טעויות נפוצות", kind: "list", items: guidance.commonMistakes });
  else missing.push("mistakes");

  if (primaryMuscles.length) sections.push({ key: "muscles", title: "שריר עיקרי", kind: "list", items: primaryMuscles });
  else missing.push("muscles");

  if (assistingMuscles.length) sections.push({ key: "assisting-muscles", title: "שרירים מסייעים", kind: "list", items: assistingMuscles });
  else missing.push("assisting-muscles");

  if (equipment) sections.push({ key: "equipment", title: "ציוד", kind: "text", text: equipment });
  else missing.push("equipment");

  return {
    exerciseId: exercise.id,
    name: exercise.name,
    imageUrl: guidance.imageUrl ?? youtubeThumbnailUrl(exercise.video?.url),
    sections,
    missing,
    hasAnyContent: sections.length > 0,
    videoUrl: exercise.video?.url,
  };
}
