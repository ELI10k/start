import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, ClipboardCheck, Dumbbell, LineChart, UtensilsCrossed } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import { MetricTile } from "@/components/client/PremiumUI";
import { getAuthContext, getClientOverview } from "@/lib/data/product-repository";
import DashboardWorkoutWidget from "@/components/workouts/client/DashboardWorkoutWidget";
import WeeklySummaryCard from "@/components/client/WeeklySummaryCard";
import { getWeeklySummaries } from "@/lib/coach-intelligence/summary-repository";
import { listContentCategories, listPublishedContent } from "@/lib/data/content-repository";
import { lessonForWeek } from "@/lib/content/weekly-lesson";
import WeeklyLessonCard from "@/components/client/WeeklyLessonCard";
import ProgressPulse from "@/components/client/ProgressPulse";
import { israelDateKey } from "@/lib/date-time";
import { addTotals, eatenFromMenu, isMealEaten } from "@/lib/nutrition/menu-intake";
import { listClientFoodLog } from "@/lib/data/product-repository";
import { sumLoggedFood } from "@/lib/nutrition/food-log";
import { trainingWeekStart } from "@/lib/workouts/progress";

export default async function Home() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");

  const today = israelDateKey();
  // The same three reads the nutrition screen makes, because this screen quotes
  // its figures back and the two disagreeing is worse than either being wrong.
  const [data, [latestSummary], logged, lessons, categories] = await Promise.all([
    getClientOverview(auth.id, today),
    // RLS returns sent summaries only, so the newest row is the newest release.
    getWeeklySummaries(auth.id, 1),
    listClientFoodLog(auth.id, today),
    listPublishedContent(auth.id),
    listContentCategories(),
  ]);
  // The library, in course order, advanced by one lesson a week.
  const weeklyLesson = lessonForWeek(lessons, categories.map((category) => category.id), today);
  const meals = data.menu?.meals ?? [];
  // Marked eaten, or every choice in it logged - the same test the nutrition
  // screen applies. `meal.completed` alone missed nothing today, but it is one
  // of two fields that can say "eaten" and reading only one is how the two
  // screens drifted apart the last three times.
  const completed = meals.filter(isMealEaten);
  // What was eaten, at the amount the client reported eating - plus anything
  // they logged beside the plan and the free-calorie windows they filled. This
  // tile used to read `meal.items`, which is every row the coach wrote at the
  // coach's portion, so it ignored "I only ate half" and every scanned item.
  // A free-calorie window marked eaten counts for what was left of it, so this
  // tile and the nutrition screen answer with the same number.
  const loggedCaloriesIn = (mealId: string | undefined) =>
    logged.filter((entry) => entry.mealId === mealId).reduce((sum, entry) => sum + (entry.calories ?? 0), 0);
  const totals = addTotals(eatenFromMenu(meals, loggedCaloriesIn), sumLoggedFood(logged));
  const calorieTarget = data.menu?.calorieTarget ?? data.clientProfile.calorie_target ?? null;
  const plannedWorkouts = data.workouts.planned;
  const completedWorkouts = data.workouts.completed;
  const eatenCalories = Math.round(totals.calories);
  const remainingCalories = calorieTarget ? Math.max(0, Math.round(calorieTarget - totals.calories)) : 0;
  const currentWeek = trainingWeekStart(today);
  const checkInDue = !data.checkIns.some((checkIn) =>
    trainingWeekStart(israelDateKey(new Date(checkIn.submitted_at))) === currentWeek
  );

  return (
    <ClientShell className="client-app-shell--home">
      {/* Three numbers and four destinations, and they have to land inside one
          phone viewport with nothing under the fold.
          
          What used to sit here - the greeting, the daily-tip card, the "היום
          שלך" bar, the next-workout card and the active-menu card - was five
          more blocks saying things these seven tiles already say, or say one tap
          later. The two that carried real information now say it from inside the
          tile the client was going to press anyway: the workout tile names the
          next training day, the menu tile names the active plan. Nothing was
          dropped, it was folded. */}
      <div className="home-screen">
        {/* The screen has no visible title any more - the tiles are the
            headline - but it still needs one to be announced by, and to be
            landed on when the back button returns here. */}
        <h1 className="sr-only">מה חשוב לך היום</h1>

        {/* Only ever renders in the days after the coach releases one, which is
            also the only time this screen is allowed to grow past the fold. */}
        <WeeklySummaryCard summary={latestSummary} />

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
          {/* What is left goes on its own line. It used to be appended to the
              label - "קלוריות · נותרו 2000" - which is wider than a third of a
              phone, so the tile clipped it to "קלוריות · נותרו 0…" and a client
              with 2000 calories still to eat read that as none left. */}
          <MetricTile
            label="קלוריות"
            value={calorieTarget ? `${eatenCalories} מתוך ${calorieTarget}` : `${eatenCalories}`}
            detail={calorieTarget ? `נותרו ${remainingCalories}` : undefined}
            accent="neutral"
            icon={<UtensilsCrossed aria-hidden="true" size={18} />}
          />
        </section>

        {/* Four tiles, two across, each twice the size it was.
            
            At four across they were about 80px wide - room for a label and
            nothing else, which is why the subtitle that names the active plan
            was arriving as "בדיקת יחידות 9…". Two across gives each tile a full
            line to say what is inside it, which is most of what a tile on this
            screen is for.
            
            The daily tip left. It opened the content library, and the library
            now has a lesson of its own further down this screen - a tile and a
            row, one under the other, leading to the same place. */}
        <nav className="quick-actions-grid" aria-label="פעולות מהירות">
          <Link href="/nutrition" className="quick-action-card">
            <span className="quick-action-card__icon"><UtensilsCrossed aria-hidden="true" size={22} /></span>
            <span className="quick-action-card__label">התפריט שלי</span>
            <span className="quick-action-card__meta">{data.menu?.title ?? "אין תפריט פעיל"}</span>
          </Link>
          {/* The only tile that has to be a client component: which day comes
              next is held by the workout provider, not by this request. */}
          <DashboardWorkoutWidget />
          <Link href="/check-in" className="quick-action-card">
            <span className="quick-action-card__icon"><ClipboardCheck aria-hidden="true" size={22} /></span>
            <span className="quick-action-card__label">צ׳ק אין</span>
            <span className={`quick-action-card__meta${checkInDue ? " quick-action-card__meta--error" : ""}`}>
              {checkInDue ? "הגיע זמן צ׳ק אין" : "דיווח שבועי"}
            </span>
          </Link>
          <Link href="/progress" className="quick-action-card">
            <span className="quick-action-card__icon"><LineChart aria-hidden="true" size={22} /></span>
            <span className="quick-action-card__label">התקדמות</span>
            <span className="quick-action-card__meta">משקל ומדידות</span>
          </Link>
        </nav>

        {/* One lesson from the library, changing every week in course order.
            
            The library was a tile and nothing more, so a client who never
            pressed it never met the content - and a course nobody opens is a
            course that was not written. This asks for one decision a week
            instead of thirty, and it is last on the screen because it is the
            one thing here that is not today's business. */}
        {weeklyLesson ? (
          <section aria-labelledby="weekly-lesson-heading">
            <h2 id="weekly-lesson-heading" className="section-heading section-heading--compact">
              השיעור שלך השבוע
            </h2>
            <WeeklyLessonCard lesson={weeklyLesson} />
          </section>
        ) : null}

        {/* Where they have got to, in the space the screen had left over.
            
            The measurements screen keeps these figures and the charts behind
            them; this is a reflection of them, on the screen a client actually
            opens - because somebody three kilos down who does not know it is
            somebody about to stop. */}
        <ProgressPulse entries={data.progress} />
      </div>
    </ClientShell>
  );
}
