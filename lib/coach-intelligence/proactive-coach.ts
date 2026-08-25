export type DailyCoachInput = Readonly<{
  mealsCompleted: number;
  mealsPlanned: number;
  calories: number;
  calorieTarget?: number;
  protein: number;
  proteinTarget?: number;
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
  const evidence = [
    `סומנו ${input.mealsCompleted} ארוחות מתוך ${input.mealsPlanned}`,
    input.calorieTarget ? gap(input.calories, input.calorieTarget, "קלוריות") : "אין יעד קלורי",
    input.proteinTarget ? gap(input.protein, input.proteinTarget, "גרם חלבון") : "אין יעד חלבון",
  ];

  if (!input.mealsPlanned || !input.calorieTarget || !input.proteinTarget) {
    return { tone: "missing", title: "חסרים נתונים להמלצה יומית", summary: "START לא תנחש מה נכון עבורך בלי תפריט ויעדים מלאים.", action: "לבדיקת התפריט והיעדים", href: "/nutrition", evidence };
  }

  const remainingMeals = Math.max(0, input.mealsPlanned - input.mealsCompleted);

  if (remainingMeals > 0) return { tone: "focus", title: "נשאר לסמן את התפריט היומי", summary: `סומנו ${input.mealsCompleted} מתוך ${input.mealsPlanned} ארוחות. נשארו ${remainingMeals} לסיום היום.`, action: "לסימון הארוחות", href: "/nutrition", evidence };
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
