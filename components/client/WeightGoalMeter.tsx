import { weightGoalEstimate, type WeightGoalProgress } from "@/lib/progress/weight-goal";

export default function WeightGoalMeter({ progress, weeklyKg, compact = false }: { progress: WeightGoalProgress; weeklyKg?: number | null; compact?: boolean }) {
  const reached = progress.remainingKg === 0;
  const label = reached ? "הגעת ליעד!" : `${progress.remainingKg} ק״ג נשארו ליעד`;
  const estimate = weightGoalEstimate(progress, weeklyKg);
  return (
    <div className={compact ? "weight-goal weight-goal--compact" : "weight-goal"}>
      <div className="weight-goal__meta">
        <strong><span aria-hidden="true">🎯</span> {label}</strong>
      </div>
      <div
        className="weight-goal__track"
        role="progressbar"
        aria-label={`התקדמות ליעד משקל ${progress.targetWeight} ק״ג`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
      >
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      {estimate ? <small className="weight-goal__estimate">בקצב השבועי הממוצע: כ־{estimate.weeks} שבועות ({estimate.months} חודשים)</small> : null}
      {!compact && <div className="weight-goal__scale"><span>התחלה {progress.startingWeight} ק״ג</span><span>{progress.percent}%</span><span>יעד {progress.targetWeight} ק״ג</span></div>}
    </div>
  );
}
