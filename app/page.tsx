import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  ClipboardCheck,
  Dumbbell,
  Flame,
  LineChart,
  Salad,
  Scale,
  Target,
  Utensils,
} from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import {
  MetricTile,
  PremiumCard,
  ProgressBar,
  ProgressRing,
} from "@/components/client/PremiumUI";
import { getAuthContext, getClientOverview } from "@/lib/data/product-repository";
import DashboardWorkoutWidget from "@/components/workouts/client/DashboardWorkoutWidget";

export default async function Home() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");

  const today = new Date().toISOString().slice(0, 10);
  const data = await getClientOverview(auth.id, today);
  const completed = data.menu?.meals.filter((meal) => meal.completed) ?? [];
  const eatenItems = data.menu?.meals.flatMap((meal) => meal.items).filter((item) => item.eaten) ?? [];
  const totals = eatenItems.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      protein: sum.protein + item.protein,
    }),
    { calories: 0, protein: 0 },
  );
  const latest = data.progress[0];
  const totalMeals = data.menu?.meals.length ?? 0;
  const remainingMeals = Math.max(0, totalMeals - completed.length);
  const dailyPercent = totalMeals ? (completed.length / totalMeals) * 100 : 0;
  const calorieTarget = data.menu?.calorieTarget ?? data.clientProfile.calorie_target;
  const proteinTarget = data.menu?.proteinTarget ?? data.clientProfile.protein_target;

  return (
    <ClientShell>
      <header className="dashboard-greeting">
        <div>
          <p>START</p>
          <h1>שלום, {auth.fullName.split(" ")[0]} 👋</h1>
          <span>מוכן להמשיך לשבור שיאים?</span>
        </div>
        <time dateTime={today}>
          {new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
        </time>
      </header>

      <section className="dashboard-hero-grid" aria-label="סיכום יומי">
        <PremiumCard className="daily-progress-card">
          <ProgressRing value={dailyPercent} label="התקדמות יומית" detail={`${completed.length}/${totalMeals || "—"} ארוחות`} />
          <div className="daily-progress-card__copy">
            <span>התוכנית היומית שלך</span>
            <strong>{remainingMeals ? `עוד ${remainingMeals} ארוחות להשלמה` : "היום הושלם"}</strong>
            <p>{totalMeals ? "כל סימון מקרב אותך עוד צעד אל היעד." : "התפריט יופיע כאן לאחר שיוך המאמן."}</p>
          </div>
        </PremiumCard>
        <div className="dashboard-metrics">
          <MetricTile label="קלוריות" value={Math.round(totals.calories).toLocaleString("he-IL")} detail={`מתוך ${calorieTarget ?? "—"}`} icon={<Flame />} />
          <MetricTile label="חלבון" value={`${Math.round(totals.protein)} ג׳`} detail={`מתוך ${proteinTarget ?? "—"} ג׳`} icon={<Dumbbell />} accent="green" />
          <MetricTile label="משקל אחרון" value={latest ? `${latest.weight} ק״ג` : "אין נתון"} detail="המדידה האחרונה" icon={<Scale />} accent="neutral" />
          <MetricTile label="ארוחות" value={`${completed.length}/${totalMeals}`} detail="הושלמו היום" icon={<Utensils />} accent="neutral" />
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div><span>גישה מהירה</span><h2>פעולות מהירות</h2></div>
        </div>
        <div className="quick-actions-grid">
          <QuickAction href="/nutrition" icon={<Salad />} label="דיווח ארוחה" />
          <QuickAction href="/progress" icon={<Scale />} label="שקילה" />
          <QuickAction href="/workouts" icon={<Dumbbell />} label="אימון" />
          <QuickAction href="/check-in" icon={<ClipboardCheck />} label="צ׳ק־אין" />
        </div>
      </section>

      <section className="dashboard-content-grid">
        <PremiumCard>
          <div className="section-heading section-heading--compact">
            <div><span>המשימה המרכזית</span><h2>{remainingMeals ? "השלמת התזונה היומית" : "היום שלך מעודכן"}</h2></div>
            <Target aria-hidden="true" />
          </div>
          <p className="premium-card__description">
            {remainingMeals ? `נשארו ${remainingMeals} ארוחות לסימון בתפריט הפעיל.` : "כל הארוחות שסומנו להיום הושלמו."}
          </p>
          <ProgressBar value={completed.length} max={totalMeals} label="עמידה בתפריט" />
          <Link href="/nutrition" className="premium-primary-button">
            {remainingMeals ? "המשך לתפריט" : "צפייה בתפריט"} <ArrowLeft size={17} />
          </Link>
        </PremiumCard>

        <PremiumCard>
          <div className="section-heading section-heading--compact">
            <div><span>הנתונים שלך</span><h2>התקדמות אחרונה</h2></div>
            <LineChart aria-hidden="true" />
          </div>
          <div className="compact-data-list">
            <div><span>משקל</span><strong>{latest ? `${latest.weight} ק״ג` : "לא נמדד"}</strong></div>
            <div><span>היקף טבור</span><strong>{latest?.navel_circumference ? `${latest.navel_circumference} ס״מ` : "לא נמדד"}</strong></div>
            <div><span>צ׳ק־אין אחרון</span><strong>{data.checkIns[0]?.date ?? "אין עדכון"}</strong></div>
          </div>
          <Link href="/progress" className="premium-secondary-button premium-card__link">לכל המדידות</Link>
        </PremiumCard>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div><span>התוכנית שלך</span><h2>האימון הבא</h2></div>
          <CalendarCheck aria-hidden="true" />
        </div>
        <DashboardWorkoutWidget />
      </section>

      <PremiumCard className="active-menu-card">
        <div>
          <span>התפריט הפעיל</span>
          <h2>{data.menu?.title ?? "עדיין אין תפריט פעיל"}</h2>
          <p>{data.menu ? `${totalMeals} ארוחות · ${calorieTarget ?? "—"} קלוריות ליום` : "הוא יופיע כאן מיד לאחר שיוך המאמן."}</p>
        </div>
        <Link href="/nutrition" className="premium-primary-button" aria-disabled={!data.menu}>
          לתפריט היומי <ArrowLeft size={17} />
        </Link>
      </PremiumCard>
    </ClientShell>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="quick-action-card">
      <span>{icon}</span>
      <strong>{label}</strong>
      <ArrowLeft aria-hidden="true" size={16} />
    </Link>
  );
}
