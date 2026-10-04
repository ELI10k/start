import type { WorkoutProgram, WorkoutExercise } from "./types.ts";
import type { TraineeLevel } from "./trainee-level.ts";

export type Focus = "balanced" | "glutes" | "back";
export type Split = "FBW" | "A-B" | "PPL";
export type ProgramDefinition = { id: string; name: string; sex: "male" | "female" | "all"; focus: Focus; split: Split; trx: boolean; homeEquipment?: "bodyweight_station" | "dumbbells" | "dumbbells_bench"; level?: TraineeLevel; frequency: number };
const levels: TraineeLevel[] = ["beginner", "intermediate", "advanced"];
const male = ["מתאמן מתחיל", "מתאמן בינוני", "מתאמן מתקדם"];
const female = ["מתאמנת מתחילה", "מתאמנת בינונית", "מתאמנת מתקדמת"];
const focusLabel = (focus: Focus) => focus === "glutes" ? " דגש לישבן" : focus === "back" ? " דגש לגב" : "";
export const PROGRAM_DEFINITIONS: ProgramDefinition[] = [
  ...([['male', 'balanced'], ['female', 'balanced'], ['female', 'glutes'], ['female', 'back']] as const).map(([sex, focus]) => ({
    id: `lifefit-trx-${sex}-${focus}`, name: `אימון TRX FBW ל${sex === "male" ? "גברים" : "נשים"}${focusLabel(focus)}`,
    sex, focus, split: "FBW" as const, trx: true, frequency: 3,
  })),
  ...levels.map((level, i) => ({id: `lifefit-ppl-male-${level}`, name: `אימון Push Pull Legs משקולות ומכונות ${male[i]}`, sex: "male" as const, focus: "balanced" as const, split: "PPL" as const, trx: false, level, frequency: i === 0 ? 3 : i === 1 ? 4 : 6})),
  ...(["glutes", "back"] as const).map(focus => ({id: `lifefit-fbw-female-${focus}`, name: `אימון FBW לנשים${focusLabel(focus)}`, sex: "female" as const, focus, split: "FBW" as const, trx: false, frequency: 3})),
  ...(["PPL", "A-B"] as const).flatMap(split => (["glutes", "back"] as const).flatMap(focus => levels.map((level, i) => ({
    id: `lifefit-${split.toLowerCase()}-female-${focus}-${level}`, name: `אימון נשים ${split === "PPL" ? "Push Pull Legs" : split}${focusLabel(focus)} משקולות ומכונות ${female[i]}`,
    sex: "female" as const, focus, split, trx: false, level, frequency: split === "A-B" ? (i === 0 ? 2 : 4) : (i === 0 ? 3 : i === 1 ? 4 : 6),
  })))),
  ...levels.slice(1).map((level, i) => ({id:`lifefit-fbw-male-balanced-${level}`,name:`אימון FBW לגברים משקולות ומכונות ${male[i+1]}`,sex:"male" as const,focus:"balanced" as const,split:"FBW" as const,trx:false,level,frequency:3})),
  ...levels.map((level,i)=>({id:`lifefit-fbw-female-balanced-${level}`,name:`אימון FBW לנשים מאוזן משקולות ומכונות ${female[i]}`,sex:"female" as const,focus:"balanced" as const,split:"FBW" as const,trx:false,level,frequency:3})),
  ...levels.map((level,i)=>({id:`lifefit-a-b-male-balanced-${level}`,name:`אימון A-B לגברים משקולות ומכונות ${male[i]}`,sex:"male" as const,focus:"balanced" as const,split:"A-B" as const,trx:false,level,frequency:i===0?2:4})),
  ...levels.slice(1).map((level,i)=>({id:`lifefit-home-bodyweight-${level}`,name:`אימון FBW משקל גוף ${["בינוני","מתקדם"][i]} — מתח ומתקן חתירה`,sex:"all" as const,focus:"balanced" as const,split:"FBW" as const,trx:false,homeEquipment:"bodyweight_station" as const,level,frequency:3})),
  ...(["dumbbells","dumbbells_bench"] as const).flatMap(homeEquipment=>levels.map((level,i)=>({id:`lifefit-home-${homeEquipment}-${level}`,name:`אימון FBW ביתי ${homeEquipment==="dumbbells"?"משקולות יד בלבד":"משקולות יד וספסל"} — ${["מתחילים","בינוני","מתקדמים"][i]}`,sex:"all" as const,focus:"balanced" as const,split:"FBW" as const,trx:false,homeEquipment,level,frequency:3}))),
];

// IDs reference the existing, video-backed exercise catalogue. No fabricated media.
export const MOVEMENTS = {
  squat: ["exercise-mhdxgx", "exercise-1w08fkm", "exercise-1fdd4gb"],
  hinge: ["resistance-dumbbell-stiff-legged-deadlift-copy", "resistance-dumbbell-stiff-legged-deadlift-copy", "resistance-bellbar-stiff-legged-deadlift"],
  chest: ["resistance-seated-machine-chest-press", "exercise-ptjiss", "exercise-rr4mtu"],
  incline: ["exercise-139gtlw", "exercise-139gtlw", "exercise-139gtlw"],
  row: ["resistance-lever-lying-t-bar-row", "exercise-1u5j1lv", "exercise-lp8zrd"],
  vertical: ["exercise-1ly3xqh", "exercise-1ly3xqh", "exercise-1ba2nb8"],
  shoulder: ["exercise-14tz34b", "exercise-14tz34b", "exercise-14tz34b"],
  lateral: ["exercise-mx59uy", "exercise-mx59uy", "exercise-mx59uy"],
  rear: ["resistance-lever-seated-reverse-flys", "exercise-yjtm56", "exercise-yjtm56"],
  curl: ["exercise-vba4vh", "exercise-f2juxe", "exercise-1nk9ffl"],
  triceps: ["exercise-yspcn", "exercise-yspcn", "exercise-cw8lzv"],
  hip: ["resistance-barbell-hip-thrust", "resistance-barbell-hip-thrust", "resistance-barbell-hip-thrust"],
  abduction: ["resistance-sitting-hip-abduction-machine", "exercise-1oc1t8h", "exercise-1oc1t8h"],
  lunge: ["resistance-lunges-with-dumbells", "resistance-lunges-with-dumbells", "resistance-lunges-with-dumbells"],
  legcurl: ["exercise-1mo876e", "exercise-1mo876e", "exercise-1lrrpsj"],
  legextension: ["exercise-igalw2", "exercise-igalw2", "exercise-igalw2"],
  calf: ["resistance-standing-calf-raise-smith-machine", "resistance-standing-calf-raise-smith-machine", "resistance-standing-calf-raise-smith-machine"],
  abs: ["exercise-pn4ire", "resistance-cable-kneeling-crunch", "exercise-1urdov4"],
  plank: ["bodyweight-front-plank", "bodyweight-front-plank", "bodyweight-front-plank"],
} satisfies Record<string, string[]>;
type Movement = keyof typeof MOVEMENTS;
export const HOME_MOVEMENTS: Record<NonNullable<ProgramDefinition["homeEquipment"]>, Partial<Record<Movement,string>>> = {
  dumbbells:{squat:"exercise-1w08fkm",hinge:"resistance-dumbbell-stiff-legged-deadlift-copy",lunge:"resistance-lunges-with-dumbells",chest:"exercise-hdg3yz",row:"resistance-dumbbell-bent-over-row",lateral:"exercise-mx59uy",rear:"exercise-1fr384u",curl:"exercise-vba4vh",triceps:"resistance-dumbbell-kickback",calf:"resistance-plantar-flexion-dumbbell",abs:"exercise-pn4ire",plank:"bodyweight-front-plank"},
  dumbbells_bench:{squat:"exercise-1w08fkm",hinge:"resistance-dumbbell-stiff-legged-deadlift-copy",lunge:"resistance-lunges-with-dumbells",chest:"resistance-dumbell-bench-press",row:"resistance-dumbbell-one-arm-bent-over-row",lateral:"exercise-mx59uy",rear:"exercise-1fr384u",curl:"exercise-vba4vh",triceps:"resistance-dumbbell-kickback",calf:"resistance-plantar-flexion-dumbbell",abs:"exercise-pn4ire",plank:"bodyweight-front-plank"},
  bodyweight_station:{squat:"exercise-n1izh5",lunge:"exercise-2ez0zf",legcurl:"bodyweight-sliding-leg-curl",chest:"exercise-hdg3yz",row:"bodyweight-inverted-row",vertical:"exercise-say88l",shoulder:"exercise-1rpyv0f",curl:"exercise-1fo5t9c",triceps:"bodyweight-kneeling-arm-extension",abs:"exercise-pn4ire",plank:"bodyweight-front-plank"},
};
const trx: Partial<Record<Movement, string>> = {squat: "resistance-suspenders-squat", hinge: "resistance-suspended-hip-thrust", hip: "resistance-suspended-hip-thrust", lunge: "resistance-straps-aided-lunges", chest: "resistance-suspender-chest-press", row: "resistance-suspended-row", rear: "resistance-suspender-reverse-flys", shoulder: "resistance-suspender-forward-y-raise", curl: "resistance-suspender-arm-curl", triceps: "resistance-suspender-arm-extension", abs: "exercise-pn4ire", plank: "bodyweight-front-plank"};
const compound = new Set<Movement>(["squat", "hinge", "hip", "lunge", "chest", "incline", "row", "vertical", "shoulder"]);
const progression = "כאשר כל הסטים וכל החזרות הושלמו בטכניקה יציבה ובעצימות היעד, מעלים את המשקל בצעד הקטן הזמין. ב־TRX מקשים מעט את זווית הגוף. אם הטכניקה נפגעת, מפחיתים עומס. אין חובה להגיע לכשל.";

export function buildProgram(def: ProgramDefinition, level: TraineeLevel = def.level ?? "beginner"): WorkoutProgram {
  const index = levels.indexOf(level);
  let days: [string, Movement[]][];
  if (def.homeEquipment === "bodyweight_station") {
    days=[["FBW A",["squat","legcurl","chest","row","shoulder","curl","triceps","abs"]],["FBW B",["lunge","legcurl","chest","vertical","shoulder","curl","triceps","plank"]]];
  } else if (def.homeEquipment) {
    days=[["FBW A",["squat","hinge","chest","row","lateral","curl","triceps","abs"]],["FBW B",["lunge","hinge","chest","row","rear","curl","triceps","plank"]]];
  } else if (def.trx) {
    const base: Movement[] = ["squat", "hinge", "chest", "row", "shoulder", "curl", "triceps", "abs"];
    const second: Movement[] = ["lunge", "hip", "chest", "row", "rear", "curl", "triceps", "plank"];
    days = [["FBW A", base], ["FBW B", second]];
  } else if (def.split === "A-B" && def.sex === "male") {
    days=[["A — פלג גוף עליון",["chest","row","vertical","shoulder","lateral","curl","triceps","abs"]],["B — רגליים וישבן",["squat","hinge","lunge","legcurl","legextension","calf","plank"]]];
  } else if (def.split === "FBW" || def.split === "A-B") {
    days = [[`${def.split} A`, ["squat", "hinge", "chest", "row", "lateral", "curl", "triceps", "abs"]], [`${def.split} B`, ["lunge", "legcurl", "incline", "vertical", "shoulder", "curl", "triceps", "plank"]]];
  } else {
    days = [["Push — חזה, כתפיים ויד אחורית", ["chest", "incline", "shoulder", "lateral", "triceps", "abs"]], ["Pull — גב ויד קדמית", ["vertical", "row", "rear", "curl", "plank"]], ["Legs — רגליים וישבן", ["squat", "hinge", "legcurl", "legextension", "calf", "abs"]]];
  }
  if (def.focus === "glutes") {
    days = days.map(([name, moves]) => {
      if (def.split !== "PPL") return [name, ["hip", ...moves.filter(m => m !== "hip" && m !== "hinge"), ...(def.trx ? [] : ["abduction" as const])]];
      if (name.startsWith("Legs")) return [name, ["hip", "squat", "hinge", "legcurl", "abduction", "calf", "abs"]];
      if (name.startsWith("Push")) return [name, ["hip", ...moves]];
      return [name, moves];
    });
  }
  if (def.focus === "back") {
    days = days.map(([name, moves]) => {
      if (def.split !== "PPL") return [name, ["row", ...(def.trx ? ["rear" as const] : ["vertical" as const]), ...moves.filter(m => !["row", "rear", "vertical"].includes(m))]];
      if (name.startsWith("Push")) return [name, ["row", ...moves]];
      if (name.startsWith("Pull")) return [name, ["vertical", "row", "rear", "curl", "abs"]];
      return [name, moves];
    });
  }
  const rir = index === 0 ? 3 : index === 1 ? 2 : 1;
  const frequency = def.frequency;
  const notes = `${progression} מנוחה של לפחות יום בין אימוני גוף מלא. ב־PPL מתחלפים Push/Pull/Legs ברצף גם בין שבועות; ב־A-B מתחלפים A/B. ${def.level === "advanced" ? "בהצטברות עייפות: שבוע עם מחצית מהסטים ועומס קל יותר." : ""}`;
  const equipment=def.homeEquipment === "bodyweight_station"?["משקל גוף","מתח / מתקן חתירה","מגבת"]:def.homeEquipment?["משקולות יד","משקל גוף",...(def.homeEquipment === "dumbbells_bench"?["ספסל"]:[])]:def.trx?["TRX","משקל גוף"]:["משקולות","מכונות","כבל פולי"];
  const homeNotes=def.homeEquipment === "bodyweight_station"?"נדרש מתח ומתקן חתירה מעוגנים ויציבים, ומגבת על משטח מתאים לכפיפת ברכיים; לא להשתמש ברהיט מאולתר. אין קפיצות או החזקות סטטיות מחוץ לבטן.":def.homeEquipment === "dumbbells_bench"?"נדרש ספסל אימון שטוח, יציב ותקין. אין צורך בספסל מתכוונן או במכונות.":def.homeEquipment === "dumbbells"?"ללא ספסל או מכונות: תרגילי משקולות בעמידה/הטיית גו ושכיבות סמיכה על הרצפה.":"";
  return {id: def.id, name: def.name, description: `כיסוי חזה, גב, רגליים, ישבן, כתפיים, יד קדמית, יד אחורית ובטן. ${frequency} אימונים בשבוע; רמת ${["מתחיל", "בינוני", "מתקדם"][index]}. ${notes} ${homeNotes}`, programType: def.split === "PPL" ? "Push Pull Legs" : def.split, difficulty: ["מתחילים", "בינוני", "מתקדמים"][index], trainingFrequency: frequency, equipment, sourceWorkbook: "LIFE FIT — תוכניות לפי אפיון לקוח", status: "active", official: true,
    days: days.map(([name, movements], order) => {
      const id = `${def.id}-day-${order}`;
      const warmup: WorkoutExercise = {id: `${id}-warmup`, exerciseId: "exercise-155pu7s", order: 0, notes: "חימום דינמי לפי אימון, ולאחריו סטי הכנה לתרגיל העמוס הראשון. החימום אינו סט עבודה."};
      return {id, name, order, exercises: [warmup, ...movements.map((m, position): WorkoutExercise => {
        const entryId = `${id}-ex-${position}`;
        const target = m === "plank" ? `${[20, 30, 40][index]} שניות` : String(m === "calf" || m === "abduction" || m === "lateral" || m === "rear" ? 15 : compound.has(m) ? [10, 10, 8][index] : 12);
        const emphasis = (def.focus === "glutes" && ["hip", "abduction"].includes(m)) || (def.focus === "back" && ["row", "vertical"].includes(m));
        const sets = m === "plank" || (!compound.has(m) && !emphasis) ? 2 : index === 0 ? 2 : def.frequency >= 5 ? 3 : emphasis && index === 2 ? 4 : 3;
        return {id: entryId, exerciseId: def.homeEquipment ? HOME_MOVEMENTS[def.homeEquipment][m]! : def.trx ? trx[m]! : MOVEMENTS[m][index], order: position + 1, sets: String(sets), reps: target, rest: compound.has(m) ? "120 שניות" : "60 שניות", effort: String(10 - rir), notes: `להשאיר כ־${rir} חזרות במיכל.${m === "lunge" ? " מספר החזרות לכל רגל; לבצע חזרות בתנועה ללא החזקה סטטית." : ""}${m === "plank" ? " הזמן לכל סט; להפסיק אם מנח הגוף נפגע." : ""}${def.trx ? " להתאים זווית גוף ואורך רצועות ליכולת; לוודא עיגון יציב." : ""}${def.homeEquipment==="dumbbells_bench"&&m==="row"?" תמיכה על ספסל יציב; מספר החזרות לכל יד.":""}${def.homeEquipment==="bodyweight_station"&&m==="legcurl"?" מגבת ומשטח החלקה מתאים; אם אין, לבקש החלפה מהמאמן.":""}`, setPrescriptions: Array.from({length: sets}, (_, n) => ({id: `${entryId}-set-${n}`, order: n, repetitions: target}))};
      })]};
    }),
  };
}

export const BUILT_IN_PROGRAMS = PROGRAM_DEFINITIONS.map(def => buildProgram(def));
