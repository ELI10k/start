import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, ClipboardCheck, Dumbbell, Lightbulb, UtensilsCrossed } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import { MetricTile, PremiumCard } from "@/components/client/PremiumUI";
import { getAuthContext, getClientOverview } from "@/lib/data/product-repository";
import DashboardWorkoutWidget from "@/components/workouts/client/DashboardWorkoutWidget";
import WeeklySummaryCard from "@/components/client/WeeklySummaryCard";
import { getWeeklySummaries } from "@/lib/coach-intelligence/summary-repository";
import { buildDailyCoachMessage } from "@/lib/coach-intelligence/proactive-coach";
import DailyCoachCard from "@/components/client/DailyCoachCard";
import { israelDateKey } from "@/lib/date-time";

export default async function Home() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");

  const today = israelDateKey();
  const data = await getClientOverview(auth.id, today);
  // RLS returns sent summaries only, so the newest row is the newest release.
  const [latestSummary] = await getWeeklySummaries(auth.id, 1);
  const meals = data.menu?.meals ?? [];
  const completed = meals.filter((meal) => meal.completed);
  const eaten = meals.flatMap((meal) => meal.items).filter((item) => item.eaten);
  const totals = eaten.reduce(
    (sum, item) => ({ calories: sum.calories + item.calories, protein: sum.protein + item.protein }),
    { calories: 0, protein: 0 },
  );
  const remainingMeals = Math.max(0, meals.length - completed.length);
  const calorieTarget = data.menu?.calorieTarget ?? data.clientProfile.calorie_target ?? null;
  const proteinTarget = data.menu?.proteinTarget ?? data.clientProfile.protein_target ?? null;
  const dayPercent = meals.length ? Math.round((completed.length / meals.length) * 100) : 0;
  // The tile beside this one spells its pair out - "3 מתוך 5" - and this one did
  // not: it printed eaten/remaining as a bare "800/1200", which every reader
  // takes for eaten-out-of-target. The target here was 2000. Same wording as its
  // neighbour now, against the target, with what is left said underneath in
  // words rather than implied by a slash.
  const plannedWorkouts = data.workouts.planned;
  const completedWorkouts = data.workouts.completed;
  const eatenCalories = Math.round(totals.calories);
  const remainingCalories = calorieTarget ? Math.max(0, Math.round(calorieTarget - totals.calories)) : 0;
  const dailyCoachMessage = buildDailyCoachMessage({
    mealsCompleted: completed.length,
    mealsPlanned: meals.length,
    calories: totals.calories,
    calorieTarget: calorieTarget ?? undefined,
    protein: totals.protein,
    proteinTarget: proteinTarget ?? undefined,
  });

  return (
    <ClientShell>
      <header className="dashboard-greeting">
        <p>שלום, {auth.fullName.split(" ")[0]}</p>
        <h1>מה חשוב לך היום</h1>
      </header>

      <DailyCoachCard message={dailyCoachMessage}/>

      <WeeklySummaryCard summary={latestSummary}/>

      {meals.length ? (
        <section className="daily-progress-card" aria-labelledby="daily-progress">
          <div className="daily-progress-card__copy">
            <h2 id="daily-progress">היום שלך</h2>
            <p>
              {remainingMeals
                ? `נשארו ${remainingMeals} ארוחות לסמן`
                : "סגרת את כל משימות התזונה להיום"}
            </p>
          </div>
          <div className="premium-progress" role="img" aria-label={`${dayPercent} אחוז מהיום הושלם`}>
            <div className="premium-progress__meta">
              <span>{dayPercent}%</span>
              <span>
                {completed.length}/{meals.length}
              </span>
            </div>
            <div className="premium-progress__track">
              <span style={{ width: `${dayPercent}%` }} />
            </div>
          </div>
        </section>
      ) : null}

      {/* Three numbers, and only three: what is left to eat today, how the
          training week stands, and where the calories are. Protein and the last
          weigh-in live on their own screens - they were noise here. */}
      <section className="dashboard-metrics dashboard-metrics--fit" aria-label="מדדים להיום">
        <MetricTile
          label="ארוחות היום"
          value={`${completed.length} מתוך ${meals.length}`}
          icon={<CalendarCheck aria-hidden="true" size={18} />}
        />
        <MetricTile
          label="אימונים השבוע"
          value={`${completedWorkouts} מתוך ${plannedWorkouts}`}
          accent="green"
          icon={<Dumbbell aria-hidden="true" size={18} />}
        />
        <MetricTile
          label={calorieTarget ? `קלוריות · נותרו ${remainingCalories}` : "קלוריות"}
          value={calorieTarget ? `${eatenCalories} מתוך ${calorieTarget}` : `${eatenCalories}`}
          accent="neutral"
          icon={<UtensilsCrossed aria-hidden="true" size={18} />}
        />
      </section>

      <h2 className="section-heading section-heading--compact">פעולות מהירות</h2>
      <nav className="quick-actions-grid" aria-label="פעולות מהירות">
        <Link href="/nutrition" className="quick-action-card">
          <UtensilsCrossed aria-hidden="true" size={20} />
          <span>התפריט שלי</span>
        </Link>
        <Link href="/workouts" className="quick-action-card">
          <Dumbbell aria-hidden="true" size={20} />
          <span>אימון</span>
        </Link>
        <a href="#daily-coach" className="quick-action-card">
          <Lightbulb aria-hidden="true" size={20} />
          <span>טיפ יומי</span>
        </a>
        <Link href="/check-in" className="quick-action-card">
          <ClipboardCheck aria-hidden="true" size={20} />
          <span>צ׳ק אין שבועי</span>
        </Link>
      </nav>

      <DashboardWorkoutWidget />

      <PremiumCard className="dashboard-section">
        <h2 className="section-heading section-heading--compact">התפריט הפעיל</h2>
        {data.menu ? (
          <>
            <p className="premium-card__description">{data.menu.title}</p>
            <Link href="/nutrition" className="premium-primary-button premium-card__link">
              לארוחות היום
            </Link>
          </>
        ) : (
          <p className="premium-card__description">
            המאמן עדיין לא שייך תפריט פעיל. הוא יופיע כאן מיד כשהוא מוכן.
          </p>
        )}
      </PremiumCard>
    </ClientShell>
  );
}
