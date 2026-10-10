import type { Exercise } from "./types.ts";
import { normalizeExerciseName } from "./normalization.ts";

export const MUSCLE_FOLDERS=["חזה","גב","רגליים","כתפיים","יד אחורית","יד קדמית","בטן"] as const;
export type MuscleFolder=typeof MUSCLE_FOLDERS[number]|"חימום"|"לבדיקת מאמן";
export const EQUIPMENT_TAGS=["משקולות יד","מוט","מכונות","פולי","גומיות","TRX","קטלבל","משקל גוף","ספסל","כדור פיזיו","בוסו","מתקן מתח","מקבילים","גלגל בטן","מגבת","גליל עיסוי","חבל קרב","סטיל מייס"] as const;
export const HOME_EQUIPMENT=new Set<string>(["משקולות יד","גומיות","TRX","קטלבל","משקל גוף","ספסל","כדור פיזיו","בוסו","גלגל בטן","מגבת","גליל עיסוי","סטיל מייס"]);

// Presentation only: IDs, original anatomical/equipment data and prescriptions
// remain unchanged. These values must never authorize a self-service swap.
export function exerciseTaxonomy(exercise:Exercise){
 const text=`${exercise.name} ${exercise.id}`;
 const primary=exercise.primaryMuscleGroup??"";
 let folder:MuscleFolder=/חימום/.test(primary)?"חימום":/יד אחורית/.test(primary)?"יד אחורית":/יד קדמית|אמות/.test(primary)?"יד קדמית":/כתפ|כתף/.test(primary)?"כתפיים":/חזה/.test(primary)?"חזה":/גב|שכמ|טרפז/.test(primary)?"גב":/רגל|ישבן|תאומ|ירך|ראשי|המסטרינג/.test(primary)?"רגליים":/בטן|ליבה/.test(primary)?"בטן":"לבדיקת מאמן";
 if(exercise.id==="bodyweight-floor-hyperextension")folder="גב";
 if(exercise.id==="resistance-machine-shoulder-press"||exercise.id==="resistance-dumbbell-cuban-press"||exercise.id==="resistance-smith-machine-row")folder="כתפיים";
 if(exercise.id==="resistance-hang-clean")folder="רגליים";
 let focus:string=folder;
 if(folder==="רגליים")focus=/הרחקת ירך|abduction|lateral-walk|רגל לאחור|hip-thrust|hip-extension|הרמת אגן|בעיטות סוס/.test(text)?(/הרחקת ירך|abduction|lateral-walk/.test(text)?"ישבן צידי":"ישבן וירך אחורית"):/קירוב ירך|adduction/.test(text)?"ירך פנימית (מקרבים)":/עקב|calf|plantar/.test(text)?"תאומים":/כפיפת (?:ברכ|רגל)|leg-curl|leg-curls|nordic|hamstring/.test(text)?"ירך אחורית (המסטרינג)":/פשיטת (?:ברכ|ברך|רגל)|leg-extension|quad-stretch/.test(text)?"ירך קדמית (ארבע־ראשי)":/deadlift|דדליפט|דד ליפט|good-morning/.test(text)?"ירך אחורית וישבן":/כפיפת ירך|hip-flexion/.test(text)?"מכופפי הירך":/squat|סקוואט|שפיפה|מכרע|lunge|לחיצת רגל/.test(text)?"ירך קדמית וישבן":"רגליים וייצוב הגוף — תרגיל משולב";
 if(folder==="כתפיים")focus=/אחורית|הרחקה אופקית|reverse-fly|face-pull|הפנים/.test(text)?"כתף אחורית ושרירי השכמה":/forward-y|כפיפה והרחקה/.test(text)?"כתף קדמית ואמצעית ושרירי השכמה":/הרחקת כתפ|הרחקת כתף|lateral-raise|abduction|upright-row|חתירה אנכית/.test(text)?"כתף אמצעית":/כפיפת כתף|forward-raise/.test(text)?"כתף קדמית":/cuban/.test(text)?"מסובבי הכתף וכתף אמצעית":/snatch/.test(text)?"כתפיים, רגליים וייצוב הגוף — תרגיל משולב":"כתף קדמית ואמצעית";
 if(folder==="גב")focus=/hyperextension|פשיטת גו/.test(text)?"גב תחתון (זוקפי הגב)":/שכמ|shrug|scapula/.test(text)?"גב עליון ושרירי השכמה":/מתח|pullup|pull-up|משיכ|pulldown|pull-down|פולאובר|פול אובר/.test(text)?"רחב גבי":"גב עליון ורחב גבי";
 if(folder==="חזה")focus=/שיפוע שלילי|חזה תחתון|decline/.test(text)?"חזה — דגש תחתון":/שיפוע חיובי|חזה עליון|(?:30|45) מעלות|incline/.test(text)?"חזה — דגש עליון":"חזה";
 if(folder==="בטן")focus=/צדי|צדית|אלכסונ|פיתול|מותן|russian|waist|side-plank|side-bend|windmill/.test(text)?"בטן צידית (אלכסונים)":/bird-dog|ציפור/.test(text)?"בטן וזוקפי הגב — ייצוב":/reverse-plank|star-pushup|barbarian|figure-eight|resistance-360/.test(text)?"בטן וייצוב הגוף — תרגיל משולב":/הרמת רגל|הרמת אגן|leg-raise|hip-lift/.test(text)?"בטן ומכופפי הירך":"בטן";
 let name=exercise.name.split(" | ")[0].split(" — ")[0].trim().replace(/משקולות בודדות/g,"משקולות יד").replace(/מכונה ייעודית/g,"מכונה").replace(/כסא/g,"כיסא").replace(/פיזו/g,"פיזיו").replace(/הריצפה/g,"הרצפה").replace(/סופינציה/g,"אחיזה תחתית").replace(/שפיפה\s*[–—-]\s*/g,"").replace(/\s+,/g,",").replace(/\s+/g," ");
 const names:Record<string,string>={"exercise-p2ohuv":"אופניים","bodyweight-curl-up":"כפיפות בטן (קראנץ׳)","bodyweight-wall-pushup":"שכיבות סמיכה מול קיר","bodyweight-bird-dog":"הרמת יד ורגל נגדית (בירד דוג)","bodyweight-straight-leg-bird-dog":"הרמת יד ורגל נגדית ברגל ישרה (בירד דוג)","bodyweight-wall-bird-dog":"הרמת יד ורגל נגדית מול קיר (בירד דוג)","exercise-1k0kcxw":"פשיטת מרפקים — וריאציה לפי סרטון המקור","exercise-2ez0zf":"מכרעים — וריאציה לפי סרטון המקור","resistance-good-morning":"הטיית גו עם מוט (גוד מורנינג)","resistance-band-lateral-walk":"הליכה צידית עם גומייה","resistance-360":"סיבוב 360 עם סטיל מייס","resistance-dumbbell-incline-arm-extension":"פשיטת מרפקים במכונה","resistance-barbell-upright-row":"חתירה אנכית עם מוט","resistance-hang-clean":"הנפת קטלבל לעמדת כתף (קלין)","resistance-farmer-walk":"הליכה עם משקולות (הליכת האיכר)","resistance-barbarian-squat":"סקוואט והנפת סטיל מייס (ברברי)"};
 name=names[exercise.id]??name;
 const label=focus.startsWith("בטן צידית")?"בטן צידית":focus.startsWith("ישבן")?"ישבן":focus==="תאומים"?"תאומים":folder;
 if(!name.endsWith(` — ${label}`))name=`${name} — ${label}`;
 const equipment=equipmentTags(exercise);
 return {folder,focus,name,equipment,home:equipment.length>0&&equipment.every(tag=>HOME_EQUIPMENT.has(tag))};
}

export function equipmentTags(exercise:Exercise):string[]{
 const raw=exercise.equipment??"";const text=`${raw} ${exercise.name} ${exercise.id}`;
 const tags:string[]=[];const add=(s:string)=>{if(!tags.includes(s))tags.push(s);};
 if(/משקולות יד|משקולת|משקולות בודדות|dumbbell|dumbell/.test(text)&&!(/מכונה/.test(raw)&&exercise.id==="resistance-dumbbell-incline-arm-extension"))add("משקולות יד");
 if(/מוט|barbell|bellbar/.test(text)&&!/מתקן מתח|מתח מצב|מתח רחב|פולי.*מוט/.test(text)&&!(/מכונ|פולי/.test(raw)))add("מוט");
 if(/מכונ|סמית|גרביטון|בהמר/.test(text))add("מכונות");
 if(/פולי|כבל|cable/.test(text))add("פולי");
 if(/גומי|גומי|רצועה אלסטית|band/.test(text))add("גומיות");
 if(/רצועות תל|רצועת תל|\bTRX\b|suspend/.test(text))add("TRX");
 if(/קטלבל|kettlebell/.test(text))add("קטלבל");
 if(/כדור פיז|stability-ball|ball-dips/.test(text))add("כדור פיזיו");
 if(/בוסו|bosu/.test(text))add("בוסו");
 if((/ספסל|bench|כומר|(?:30|45) מעלות/.test(text)||exercise.id==="exercise-1h0qzj6"||(/לחיצת חזה/.test(text)&&tags.some(t=>t==="משקולות יד"||t==="מוט"||t==="קטלבל")))&&!tags.includes("מכונות"))add("ספסל");
 if(/גלגלת|ab-wheel/.test(text))add("גלגל בטן");
 if(/מגבת|sliding-leg-curl/.test(text))add("מגבת");
 if(/גליל|foam-roller/.test(text))add("גליל עיסוי");
 if(/סטיל מייס|resistance-360|barbarian/.test(text))add("סטיל מייס");
 if(/חבל קרב|rope-climbing|battling-rope/.test(text))add("חבל קרב");
 if(/מתח|pullup|pull-up|muscle-up|inverted-row/.test(text)&&!tags.includes("TRX")&&!tags.includes("מכונות"))add("מתקן מתח");
 if(/מקבילים|captain-chair/.test(text)&&!tags.includes("מכונות"))add("מקבילים");
 if(/משקל גוף/.test(raw)||exercise.id.startsWith("bodyweight-")||exercise.category==="משקל גוף")add("משקל גוף");
 return tags;
}

export function presentExercise(exercise:Exercise):Exercise{
 const {name}=exerciseTaxonomy(exercise);
 return {...exercise,name,normalizedName:normalizeExerciseName(name),aliases:[...new Set([...exercise.aliases,exercise.name])]};
}
