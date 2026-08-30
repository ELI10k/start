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
    return { tone: "missing", title: "חסרים נתונים להמלצה יומית", summary: "START לא תנחש מה נכון עבורך בלי תפריט ויעדים מלאים.", action: "לבדיקת התפריט והיעדים", href: "/nutrition", evidence };
  }

  const remainingMeals = Math.max(0, input.mealsPlanned - input.mealsCompleted);

  // The gap is only named when the day's figures are complete. One sentence
  // logged without macros is enough to make "you are 70g of protein short"
  // a guess, and this message is written at 18:30 - late enough that a client
  // reads it as the verdict on the day.
  if (!unmeasured) {
    const proteinMissing = rounded(input.proteinTarget - input.protein);
    const caloriesOver = rounded(input.calories - input.calorieTarget);
    if (proteinMissing >= 20) return { tone: "focus", title: "הפוקוס שלך עכשיו: חלבון", summary: `חסרים לך ${proteinMissing} גרם חלבון כדי להגיע ליעד היומי.`, action: "לבחירת ארוחת החלבון הבאה", href: "/nutrition", evidence };
    if (caloriesOver >= Math.max(100, input.calorieTarget * 0.1)) return { tone: "focus", title: "הפוקוס שלך עכשיו: חזרה למסגרת", summary: `נרשמו היום ${caloriesOver} קלוריות מעל היעד. אין צורך לנחש שינוי בתוכנית.`, action: "לבדיקת מה שנרשם היום", href: "/nutrition", evidence };
  }

  if (remainingMeals > 0) return { tone: "focus", title: "נשאר לסמן את התפריט היומי", summary: `סומנו ${input.mealsCompleted} מתוך ${input.mealsPlanned} ארוחות. נשארו ${remainingMeals} לסיום היום.`, action: "לסימון הארוחות", href: "/nutrition", evidence };
  if (unmeasured) return { tone: "focus", title: "נשארו פריטים בלי ערכים", summary: `${unmeasured} פריטים נרשמו היום בלי ערכים תזונתיים, ולכן סיכום היום חלקי.`, action: "להשלמת הפריטים מהמאגר", href: "/nutrition", evidence };
  return { tone: "success", title: "התפריט היומי הושלם", summary: "כל הארוחות של היום סומנו. אין עוד פעולה תזונתית שמחכה לך היום.", action: "לצפייה בסיכום היום", href: "/nutrition", evidence };
}

export type PersistedRiskSignal = Readonly<{ clientId: string; clientName: string; weekEnd: string; risk: number; retentionRisk: number; health: number }>;
export type CoachAttentionItem = PersistedRiskSignal & Readonly<{ severity: "high" | "medium"; reason: string }>;

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
