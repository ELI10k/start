import { composeWeeklySummary, type WeeklySummary } from "./weekly-summary.ts";
import type { WeeklyFacts } from "./weekly-facts.ts";

// Two writers behind one contract.
//
// The rules provider is deterministic and always available; it is what actually
// ships tonight. The model provider is the same pipeline with a language model
// in the middle, and it is written so that the model can only rephrase facts it
// was handed - it is never the source of a number.
//
// If the model is unreachable, refuses, or returns anything that does not match
// the facts, the rules output stands. A weekly summary that quietly invents a
// figure is worse than a plainly-worded one.

export type SummaryProvider = Readonly<{
  name: string;
  isConfigured: () => boolean;
  summarize: (facts: WeeklyFacts) => Promise<WeeklySummary>;
}>;

export const rulesProvider: SummaryProvider = {
  name: "rules",
  isConfigured: () => true,
  summarize: async (facts) => composeWeeklySummary(facts, "rules"),
};

// Every number the model is allowed to use, extracted from the facts. Anything
// the model writes that contains a number not in this set is rejected.
export function allowedNumbers(facts: WeeklyFacts): ReadonlySet<string> {
  const values = new Set<string>();
  const add = (value: number | undefined) => {
    if (value === undefined || !Number.isFinite(value)) return;
    values.add(String(Math.round(value)));
    values.add(Math.abs(value).toFixed(1));
    values.add(String(Math.abs(Math.round(value))));
  };
  const { workouts, nutrition, steps, weight, measurements, checkIns } = facts;
  if (workouts) { add(workouts.completed); add(workouts.planned); add(workouts.skipped); add(workouts.volumeKg); add(workouts.previousCompleted); add(Math.round((workouts.completed / Math.max(1, workouts.planned)) * 100)); }
  if (nutrition) { add(nutrition.daysReported); add(nutrition.mealsEaten); add(nutrition.mealsPlanned); add(nutrition.freeCalorieDays); add(Math.round((nutrition.mealsEaten / Math.max(1, nutrition.mealsPlanned)) * 100)); }
  if (steps) { add(steps.daysReported); add(steps.average); add(steps.goal); add(steps.daysMetGoal); add(steps.previousAverage); }
  if (weight) { add(weight.entries); add(weight.latestKg); add(weight.changeKg); }
  if (measurements) add(measurements.entries);
  if (checkIns) { add(checkIns.submitted); add(checkIns.reviewed); }
  values.add("7");
  return values;
}

// A number in the text that is not in the facts means the model made it up.
export function citesOnlyKnownNumbers(text: string, allowed: ReadonlySet<string>): boolean {
  const numbers = text.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) ?? [];
  return numbers.every((value) => allowed.has(value) || allowed.has(String(Math.round(Number(value)))));
}

// Diagnosing, prescribing or attributing a symptom is out of scope for a fitness
// summary, whoever wrote it.
const MEDICAL = /(אבחנ|מחל|תסמונת|סוכרת|בלוטת|הורמונ|תרופ|דיכאון|הפרעת אכילה|אנמי|לחץ דם|כולסטרול)/;
export const isFreeOfMedicalClaims = (text: string) => !MEDICAL.test(text);

export type ModelClient = Readonly<{ complete: (prompt: string) => Promise<string> }>;

// The model provider. It is handed the composed summary and the facts, and asked
// only to improve the wording. Its output has to survive three checks - shape,
// numbers, and medical language - or the rules output is returned untouched.
export function createModelProvider(name: string, client: ModelClient | undefined): SummaryProvider {
  return {
    name,
    isConfigured: () => Boolean(client),
    summarize: async (facts) => {
      const baseline = composeWeeklySummary(facts, "rules");
      if (!client || baseline.status !== "ready") return baseline;
      try {
        const raw = await client.complete(buildPrompt(baseline));
        const parsed = parseModelSummary(raw);
        if (!parsed) return baseline;
        const allowed = allowedNumbers(facts);
        const lines = [...parsed.wentWell, ...parsed.needsWork, ...parsed.actions];
        if (!lines.length) return baseline;
        if (!lines.every((line) => citesOnlyKnownNumbers(line, allowed) && isFreeOfMedicalClaims(line))) return baseline;
        return { ...baseline, provider: name, wentWell: parsed.wentWell, needsWork: parsed.needsWork, actions: parsed.actions.slice(0, 3) };
      } catch {
        // Unreachable, rate limited, or malformed - the deterministic summary is
        // already correct, so nothing is lost by using it.
        return baseline;
      }
    },
  };
}

export function buildPrompt(baseline: WeeklySummary): string {
  return [
    "אתה עוזר של מאמן כושר. לפניך סיכום שבועי שנכתב מנתונים אמיתיים של מתאמן.",
    "נסח אותו מחדש בעברית טבעית וישירה. אל תוסיף, אל תשנה ואל תמציא אף מספר או עובדה.",
    "אסור לכתוב אבחנות רפואיות, סיבות רפואיות או המלצות תרופתיות.",
    "החזר JSON בלבד במבנה: {\"wentWell\":[],\"needsWork\":[],\"actions\":[]} עם עד 3 פעולות.",
    "",
    JSON.stringify({ wentWell: baseline.wentWell, needsWork: baseline.needsWork, actions: baseline.actions, facts: baseline.facts }),
  ].join("\n");
}

export function parseModelSummary(raw: string): Readonly<{ wentWell: string[]; needsWork: string[]; actions: string[] }> | undefined {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return undefined;
    const value = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const list = (key: string) => (Array.isArray(value[key]) ? (value[key] as unknown[]).filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : []);
    return { wentWell: list("wentWell"), needsWork: list("needsWork"), actions: list("actions") };
  } catch {
    return undefined;
  }
}

// BLOCKED-EXTERNAL: no model credential is configured, so this resolves to the
// rules provider. Wiring a client here is the only change needed to switch over.
export function resolveSummaryProvider(client?: ModelClient): SummaryProvider {
  return client ? createModelProvider("model", client) : rulesProvider;
}
