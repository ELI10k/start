export type DailyCoachInput = Readonly<{
  mealsCompleted: number;
  mealsPlanned: number;
  calories: number;
  calorieTarget?: number;
  protein: number;
  proteinTarget?: number;
  /**
   * Rows the client logged outside the menu with no figures attached - a
   * sentence or a photograph rather than a catalogue item. They are real food
   * and they are not in `calories` or `protein`, so while any exist the day's
   * totals are a floor, not a measurement, and nothing numeric is advised off
   * them.
   */
  unmeasuredItems?: number;
}>;

export type DailyCoachMessage = Readonly<{
  tone: "success" | "focus" | "missing";
  title: string;
  summary: string;
  action: string;
  href: "/nutrition" | "/workouts" | "/progress";
  evidence: readonly string[];
}>;

const rounded = (value: number) => Math.max(0, Math.round(value));

// One action, not a wall of analytics. Every number in the copy comes directly
// from today's persisted menu state; absent targets produce an honest missing-
// data message instead of an invented recommendation.
export function buildDailyCoachMessage(input: DailyCoachInput): DailyCoachMessage {
  // A slash says nothing about which side is which. "1688/2014 קלוריות" reads
  // as a fraction, a score or a ratio depending on the reader, and the one thing
  // it never says out loud is how much is left - which is the only part that
  // changes what the client does next. Both sides are named, and where the
  // figure is already past its target the sentence says that instead.
  const gap = (eaten: number, target: number, unit: string) => {
    const left = rounded(target - eaten);
    return left > 0
      ? `נאכלו ${rounded(eaten)} ${unit}, נותרו ${left}`
      : `נאכלו ${rounded(eaten)} ${unit} — היעד (${rounded(target)}) הושלם`;
  };
  const unmeasured = Math.max(0, Math.round(input.unmeasuredItems ?? 0));
  const evidence = [
    `סומנו ${input.mealsCompleted} ארוחות מתוך ${input.mealsPlanned}`,
    input.calorieTarget ? gap(input.calories, input.calorieTarget, "קלוריות") : "אין יעד קלורי",
    input.proteinTarget ? gap(input.protein, input.proteinTarget, "גרם חלבון") : "אין יעד חלבון",
    ...(unmeasured ? [`${unmeasured} פריטים נרשמו ללא ערכים ולכן אינם בסכום`] : []),
  ];

  if (!input.mealsPlanned || !input.calorieTarget || !input.proteinTarget) {
    return { tone: "missing", title: "חסרים נתונים להמלצה יומית", summary: "LIFE FIT לא תנחש מה נכון עבורך בלי תפריט ויעדים מלאים.", action: "לבדיקת התפריט והיעדים", href: "/nutrition", evidence };
  }

  const remainingMeals = Math.max(0, input.mealsPlanned - input.mealsCompleted);

  // The gap is only named when the day's figures are complete. One sentence
  // logged without macros is enough to make "you are 70g of protein short"
  // a guess, and this message is written at 18:30 - late enough that a client
  // reads it as the verdict on the day.
  if (!unmeasured) {
    const caloriesOver = rounded(input.calories - input.calorieTarget);
    if (caloriesOver >= Math.max(100, input.calorieTarget * 0.1)) return { tone: "focus", title: "הפוקוס שלך עכשיו: חזרה למסגרת", summary: `נרשמו היום ${caloriesOver} קלוריות מעל היעד. אין צורך לנחש שינוי בתוכנית.`, action: "לבדיקת מה שנרשם היום", href: "/nutrition", evidence };
  }

  if (remainingMeals > 0) return { tone: "focus", title: "נשאר לסמן את התפריט היומי", summary: `סומנו ${input.mealsCompleted} מתוך ${input.mealsPlanned} ארוחות. נשארו ${remainingMeals} לסיום היום.`, action: "לסימון הארוחות", href: "/nutrition", evidence };
  if (unmeasured) return { tone: "focus", title: "נשארו פריטים בלי ערכים", summary: `${unmeasured} פריטים נרשמו היום בלי ערכים תזונתיים, ולכן סיכום היום חלקי.`, action: "להשלמת הפריטים מהמאגר", href: "/nutrition", evidence };
  return { tone: "success", title: "התפריט היומי הושלם", summary: "כל הארוחות של היום סומנו. אין עוד פעולה תזונתית שמחכה לך היום.", action: "לצפייה בסיכום היום", href: "/nutrition", evidence };
}

export type PersistedRiskSignal = Readonly<{ clientId: string; clientName: string; weekEnd: string; risk: number; retentionRisk: number; health: number }>;
export type CoachAttentionItem = PersistedRiskSignal & Readonly<{ severity: "high" | "medium"; reason: string }>;

export type CoachedClientActivity = Readonly<{
  clientId: string;
  clientName: string;
  periodEnd: string;
  eligibleDays: number;
  hasActiveMenu: boolean;
  plannedMeals: number;
  markedMeals: number;
  nutritionDays: number;
  workoutsCompleted: number;
  workoutsPlanned: number;
  checkIns: number;
  weighIns: number;
}>;

/**
 * Turn a live seven-day roster snapshot into the coach's action queue.
 * Five eligible days are required before nutrition adherence is judged. This
 * keeps a new client out of trouble on day two while ensuring an established
 * coached client cannot disappear merely because the weekly batch has not run.
 */
export function buildCoachAttention(clients: readonly CoachedClientActivity[]): readonly CoachAttentionItem[] {
  return clients.flatMap((client) => {
    const signals: string[] = [];
    if (!client.hasActiveMenu) signals.push("אין תפריט פעיל");
    else if (client.eligibleDays >= 5) {
      // Completion alone is not enough: one fully answered day is 100% of that
      // day's rows, but it still leaves six silent days. Require the five-day
      // evidence floor first, then judge meal completion across the period.
      if (client.nutritionDays < 5) signals.push(`דווחה תזונה ב־${client.nutritionDays} מתוך 7 ימים`);
      else if (client.plannedMeals > 0) {
        const completion = Math.round(client.markedMeals / client.plannedMeals * 100);
        if (completion < 50) signals.push(`סומנו ${client.markedMeals} מתוך ${client.plannedMeals} ארוחות (${completion}%)`);
      }
    }

    if (client.eligibleDays >= 7 && client.workoutsPlanned > 0 && client.workoutsCompleted / client.workoutsPlanned < .5) {
      signals.push(`הושלמו ${client.workoutsCompleted} מתוך ${client.workoutsPlanned} אימונים`);
    }
    if (client.eligibleDays >= 7 && client.checkIns === 0) signals.push("לא הוגש צ׳ק־אין ב־7 הימים האחרונים");
    if (!signals.length) return [];

    const evidence = [
      client.workoutsCompleted ? `${client.workoutsCompleted} אימונים הושלמו` : "",
      client.checkIns ? "צ׳ק־אין הוגש" : "",
      client.weighIns ? "שקילה עודכנה" : "",
    ].filter(Boolean).join(" · ");
    const high = signals.length >= 2;
    const risk = high ? 75 : 55;
    return [{
      clientId: client.clientId,
      clientName: client.clientName,
      weekEnd: client.periodEnd,
      risk,
      retentionRisk: 0,
      health: high ? 35 : 55,
      severity: high ? "high" as const : "medium" as const,
      reason: `${signals.join(" · ")}${evidence ? ` · ${evidence}` : ""}`,
    }];
  }).sort((a, b) => Number(b.severity === "high") - Number(a.severity === "high") || b.risk - a.risk || a.clientName.localeCompare(b.clientName, "he"));
}

export function prioritiseCoachAttention(signals: readonly PersistedRiskSignal[]): readonly CoachAttentionItem[] {
  const latest = new Map<string, PersistedRiskSignal>();
  [...signals].sort((a, b) => b.weekEnd.localeCompare(a.weekEnd)).forEach((signal) => { if (!latest.has(signal.clientId)) latest.set(signal.clientId, signal); });
  return [...latest.values()]
    .filter((signal) => signal.risk >= 50 || signal.retentionRisk >= 50 || signal.health < 60)
    .map((signal) => {
      const reason = signal.retentionRisk >= signal.risk && signal.retentionRisk >= 50 ? `סיכון נשירה ${rounded(signal.retentionRisk)}/100` : signal.risk >= 50 ? `מדד סיכון ${rounded(signal.risk)}/100` : `בריאות לקוח ${rounded(signal.health)}/100`;
      return { ...signal, severity: Math.max(signal.risk, signal.retentionRisk) >= 70 || signal.health < 40 ? "high" as const : "medium" as const, reason };
    })
    .sort((a, b) => Number(b.severity === "high") - Number(a.severity === "high") || b.risk - a.risk);
}
