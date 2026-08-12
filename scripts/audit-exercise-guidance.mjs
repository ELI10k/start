// Checks the guidance content, then writes a Hebrew audit sheet for a human to
// read before any of it reaches a client.
//
// The checks are the ones that can be decided mechanically. Whether a cue is
// good coaching is not one of them - that is what the audit file is for.
//
//   node scripts/audit-exercise-guidance.mjs <inventory.json> <audit.md>
import { readFileSync, writeFileSync } from "node:fs";
import { GUIDANCE } from "./data/exercise-guidance.mjs";

const [inventoryPath, auditPath] = process.argv.slice(2);
if (!inventoryPath || !auditPath) throw new Error("usage: <inventory.json> <audit.md>");

const raw = JSON.parse(readFileSync(inventoryPath, "utf8"));
const catalogue = raw.rows ? raw.rows[0].exercises : raw.exercises;
const byId = new Map(catalogue.map((item) => [item.id, item]));

const failures = [];
const flagged = [];
const fail = (id, why) => failures.push(`${id}: ${why}`);

// Anything that reads as unfinished rather than as coaching.
const PLACEHOLDER = /(TODO|TBD|FIXME|placeholder|לורם|איפסום|xxx|\?\?\?|\.\.\.$|תוכן זמני|למלא)/i;

// Words that would turn technique into a medical claim. The content is allowed
// to say "stop if it hurts"; it is not allowed to name a condition, promise a
// cure, or diagnose.
const MEDICAL = /(אבחנה|מאבחן|מחלה|פתולוג|דלקת|פריצת דיסק|בקע|תרופ|מרשם רפואי|לרפא|ריפוי|טיפול רפואי|פיזיותרפ|כאב כרוני|נזק בלתי הפיך|מונע פציעות|בטוח לחלוטין)/;

// Equipment has to agree with what the exercise is called - the commonest way a
// block of content ends up attached to the wrong movement.
const EQUIPMENT_RULES = [
  { when: /מכונה/, expect: "מכונה" },
  { when: /פולי/, expect: /פולי|כבלים/ },
  { when: /כבלים/, expect: /כבלים|פולי/ },
  { when: /משקולות בודדות|משקולות|פטישים/, expect: /משקולות יד|מוט W/ },
  { when: /מתח/, expect: "מתקן מתח" },
  { when: /משקל גוף|שכיבות סמיכה/, expect: "משקל גוף" },
];

const normalise = (value) => value.replace(/[\s.,־–—]+/g, " ").trim();

// ---- per-entry checks
for (const [id, entry] of Object.entries(GUIDANCE)) {
  const catalogueEntry = byId.get(id);
  if (!catalogueEntry) { fail(id, "מזהה שאינו קיים בשבע התוכניות"); continue; }
  const name = catalogueEntry.name;

  const all = [entry.howTo, ...entry.cues, ...entry.commonMistakes, entry.equipment ?? ""];
  for (const text of all) {
    if (!text.trim()) fail(id, "שדה ריק");
    if (PLACEHOLDER.test(text)) fail(id, `placeholder בטקסט: "${text.slice(0, 40)}"`);
    if (MEDICAL.test(text)) fail(id, `טענה רפואית אפשרית: "${text.slice(0, 60)}"`);
  }

  // A line that appears both as a cue and as a mistake contradicts itself.
  for (const cue of entry.cues) {
    for (const mistake of entry.commonMistakes) {
      if (normalise(cue) === normalise(mistake)) fail(id, `אותו משפט גם כדגש וגם כטעות: "${cue}"`);
    }
  }

  // Duplicates inside one entry.
  if (new Set(entry.cues.map(normalise)).size !== entry.cues.length) fail(id, "דגשים כפולים בתוך אותו תרגיל");
  if (new Set(entry.commonMistakes.map(normalise)).size !== entry.commonMistakes.length) fail(id, "טעויות כפולות בתוך אותו תרגיל");

  // Equipment against the name.
  for (const rule of EQUIPMENT_RULES) {
    if (!rule.when.test(name)) continue;
    const equipment = entry.equipment ?? "";
    const ok = typeof rule.expect === "string" ? equipment === rule.expect : rule.expect.test(equipment);
    if (!ok) flagged.push(`${id} (${name}): ציוד "${equipment}" מול שם שמרמז על ${rule.when}`);
    break;
  }
}

// ---- cross-entry duplication: the "same paragraph everywhere" failure
const seenHowTo = new Map();
const seenCue = new Map();
const seenMistake = new Map();
for (const [id, entry] of Object.entries(GUIDANCE)) {
  const howTo = normalise(entry.howTo);
  if (seenHowTo.has(howTo)) fail(id, `"איך מבצעים" זהה ל-${seenHowTo.get(howTo)}`);
  seenHowTo.set(howTo, id);
  for (const cue of entry.cues) {
    const key = normalise(cue);
    if (seenCue.has(key)) flagged.push(`דגש זהה ב-${id} וב-${seenCue.get(key)}: "${cue}"`);
    else seenCue.set(key, id);
  }
  for (const mistake of entry.commonMistakes) {
    const key = normalise(mistake);
    if (seenMistake.has(key)) flagged.push(`טעות זהה ב-${id} וב-${seenMistake.get(key)}: "${mistake}"`);
    else seenMistake.set(key, id);
  }
}

// ---- coverage
const missing = catalogue.filter((item) => !GUIDANCE[item.id]);
for (const item of missing) fail(item.id, `אין תוכן (${item.name})`);

// ---- the audit sheet
const lines = [
  "# דגשים לתרגיל — גיליון ביקורת",
  "",
  `נכתב עבור ${Object.keys(GUIDANCE).length} התרגילים שבשבע התוכניות המאושרות.`,
  "",
  "התוכן הוא טכניקת אימון כללית. הוא אינו אבחנה, אינו הבטחה ואינו תחליף לייעוץ מקצועי.",
  "**דורש אישור מקצועי לפני פרסום ללקוחות.**",
  "",
  "---",
  "",
];

const groups = new Map();
for (const id of Object.keys(GUIDANCE)) {
  const item = byId.get(id);
  const group = item?.primary ?? "ללא סיווג";
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group).push(id);
}

for (const [group, ids] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "he"))) {
  lines.push(`## ${group}`, "");
  for (const id of ids) {
    const entry = GUIDANCE[id];
    const item = byId.get(id);
    lines.push(`### ${item.name}`, "");
    lines.push(`\`${id}\` · ציוד: **${entry.equipment ?? "לא צוין"}**`, "");
    lines.push(`**איך מבצעים**  `, entry.howTo, "");
    lines.push("**דגשים חשובים**");
    for (const cue of entry.cues) lines.push(`- ${cue}`);
    lines.push("");
    lines.push("**טעויות נפוצות**");
    for (const mistake of entry.commonMistakes) lines.push(`- ${mistake}`);
    lines.push("", "---", "");
  }
}

writeFileSync(auditPath, lines.join("\n"));

console.log(JSON.stringify({
  exercises: Object.keys(GUIDANCE).length,
  inSevenProgrammes: catalogue.length,
  withoutContent: missing.length,
  totalCues: Object.values(GUIDANCE).reduce((sum, entry) => sum + entry.cues.length, 0),
  totalMistakes: Object.values(GUIDANCE).reduce((sum, entry) => sum + entry.commonMistakes.length, 0),
  distinctCues: seenCue.size,
  distinctMistakes: seenMistake.size,
  failures,
  flaggedForReview: flagged,
  audit: auditPath,
}, null, 2));

if (failures.length) process.exitCode = 1;
