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
  const evidence = [
    `${input.mealsCompleted}/${input.mealsPlanned} ארוחות סומנו`,
    input.calorieTarget ? `${rounded(input.calories)}/${rounded(input.calorieTarget)} קלוריות` : "אין יעד קלורי",
    input.proteinTarget ? `${rounded(input.protein)}/${rounded(input.proteinTarget)} גרם חלבון` : "אין יעד חלבון",
  ];

  if (!input.mealsPlanned || !input.calorieTarget || !input.proteinTarget) {
    return { tone: "missing", title: "חסרים נתונים להמלצה יומית", summary: "START לא תנחש מה נכון עבורך בלי תפריט ויעדים מלאים.", action: "לבדיקת התפריט והיעדים", href: "/nutrition", evidence };
  }

  const proteinMissing = rounded(input.proteinTarget - input.protein);
  const caloriesOver = rounded(input.calories - input.calorieTarget);
  const remainingMeals = Math.max(0, input.mealsPlanned - input.mealsCompleted);

  if (proteinMissing >= 20) return { tone: "focus", title: "הפוקוס שלך עכשיו: חלבון", summary: `חסרים לך ${proteinMissing} גרם חלבון כדי להגיע ליעד היומי.`, action: "לבחירת ארוחת החלבון הבאה", href: "/nutrition", evidence };
  if (caloriesOver >= Math.max(100, input.calorieTarget * 0.1)) return { tone: "focus", title: "הפוקוס שלך עכשיו: חזרה למסגרת", summary: `נרשמו היום ${caloriesOver} קלוריות מעל היעד. אין צורך לנחש שינוי בתוכנית.`, action: "לבדיקת מה שנרשם היום", href: "/nutrition", evidence };
  if (remainingMeals > 0) return { tone: "focus", title: "הפעולה החשובה הבאה", summary: `נשארו ${remainingMeals} ארוחות לסימון היום.`, action: "להמשך היום התזונתי", href: "/nutrition", evidence };
  return { tone: "success", title: "סגרת את המשימה המרכזית להיום", summary: "הארוחות סומנו ויעד החלבון הושג. ממשיכים בעקביות, בלי שינוי מיותר.", action: "לסיכום היום", href: "/nutrition", evidence };
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
