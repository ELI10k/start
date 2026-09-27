import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { progressChanges, type ProgressReading } from "@/lib/progress/changes";
import { weightGoalProgress } from "@/lib/progress/weight-goal";
import WeightGoalMeter from "@/components/client/WeightGoalMeter";

// The two numbers off the measurements screen, on the screen the client opens
// every day - and a sentence that says what they mean.
//
// Not a move: the measurements screen keeps them, along with the charts and the
// history that give them context. This is the reflection. A client who is three
// kilos down and does not know it is a client who is about to stop.
export default function ProgressPulse({ entries, targetWeight }: { entries: readonly ProgressReading[]; targetWeight?: number | string | null }) {
  const changes = progressChanges(entries);
  const goalProgress = weightGoalProgress(entries, targetWeight);
  const { weightChange, navelChange } = changes;
  const compliment = changes.readings > 1 ? "זה בדיוק מה שקורה כשלא מוותרים 🔥" : changes.readings === 1 ? "יצאנו לדרך — עכשיו מתחילים להזיז מספרים 🔥" : "הכול מתחיל מהמדידה הראשונה — יוצאים לדרך 🔥";

  return (
    <Link href="/progress" className="progress-pulse">
      <span className="progress-pulse__line"><strong>מדדי התקדמות <span aria-hidden="true">📈</span></strong><span>{compliment}</span></span>
      {weightChange !== null || navelChange !== null ? (
        <span className="progress-pulse__figures">
          {weightChange !== null ? (
            <Figure text={weightChange < 0 ? `ירדת במשקל ${Math.abs(weightChange)} ק״ג` : weightChange > 0 ? `עלית במשקל ${weightChange} ק״ג` : "המשקל נשאר יציב"} direction={weightChange > 0 ? "up" : weightChange < 0 ? "down" : "flat"} />
          ) : null}
          {navelChange !== null ? (
            <Figure text={navelChange < 0 ? `ירדת ${Math.abs(navelChange)} ס״מ בהיקף הטבור` : navelChange > 0 ? `עלית ${navelChange} ס״מ בהיקף הטבור` : "היקף הטבור נשאר יציב"} direction={navelChange > 0 ? "up" : navelChange < 0 ? "down" : "flat"} />
          ) : null}
        </span>
      ) : null}
      {goalProgress ? <WeightGoalMeter progress={goalProgress} compact /> : null}
    </Link>
  );
}

// Down is green and up is red for both of these, which is the direction the
// measurements screen already reads them in.
function Figure({ text, direction }: { text: string; direction: "up" | "down" | "flat" }) {
  return (
    <span className="progress-pulse__figure" data-rising={direction === "up" || undefined}>
      {direction === "up" ? <TrendingUp aria-hidden="true" size={14} /> : direction === "down" ? <TrendingDown aria-hidden="true" size={14} /> : <Minus aria-hidden="true" size={14} />}
      <strong>{text}</strong>
    </span>
  );
}
