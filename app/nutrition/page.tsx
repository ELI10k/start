"use client";

import { useMemo, useState } from "react";
import { Flame, Plus, Utensils } from "lucide-react";
import MealCard, {
  MealData,
  MealStatus,
} from "@/components/MealCard";
import BottomNav from "@/components/BottomNav";

const initialMeals: MealData[] = [
  {
    id: 1,
    title: "ארוחת בוקר",
    time: "09:00",
    description:
      "2 ביצים, 2 פרוסות לחם מלא וגבינה לבנה 5%",
    calories: 430,
    protein: 32,
    status: "pending",
  },
  {
    id: 2,
    title: "ארוחת צהריים",
    time: "14:00",
    description:
      "200 גרם פרגית, בורגול וסלט עם שמן זית",
    calories: 680,
    protein: 52,
    status: "pending",
  },
  {
    id: 3,
    title: "ארוחת ביניים",
    time: "17:30",
    description:
      "יוגורט חלבון, פירות יער ושיבולת שועל",
    calories: 310,
    protein: 28,
    status: "pending",
  },
  {
    id: 4,
    title: "ארוחת ערב",
    time: "21:00",
    description:
      "כריך טונה עם מיונז לייט וירקות",
    calories: 480,
    protein: 38,
    status: "pending",
  },
];

const calorieGoal = 2200;
const proteinGoal = 180;

export default function NutritionPage() {
  const [meals, setMeals] = useState(initialMeals);

  function updateMealStatus(
    mealId: number,
    status: MealStatus
  ) {
    setMeals((currentMeals) =>
      currentMeals.map((meal) =>
        meal.id === mealId
          ? {
              ...meal,
              status:
                meal.status === status ? "pending" : status,
            }
          : meal
      )
    );
  }

  const totals = useMemo(() => {
    return meals
      .filter((meal) => meal.status === "eaten")
      .reduce(
        (result, meal) => ({
          calories: result.calories + meal.calories,
          protein: result.protein + meal.protein,
        }),
        {
          calories: 0,
          protein: 0,
        }
      );
  }, [meals]);

  const completedMeals = meals.filter(
    (meal) => meal.status !== "pending"
  ).length;

  const caloriesPercentage = Math.min(
    (totals.calories / calorieGoal) * 100,
    100
  );

  const proteinPercentage = Math.min(
    (totals.protein / proteinGoal) * 100,
    100
  );

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0A0A0A] pb-28 text-white"
    >
      <div className="mx-auto max-w-md px-4 pb-8 pt-8">
        <header className="mb-6">
          <p className="mb-2 text-sm font-bold tracking-[0.22em] text-[#D4AF37]">
            START
          </p>

          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black">
                התזונה שלי
              </h1>

              <p className="mt-2 text-sm text-zinc-400">
                יום שישי, 17 ביולי
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3A2E12] bg-[#161616] text-[#D4AF37]">
              <Utensils size={22} />
            </div>
          </div>
        </header>

        <section className="mb-6 rounded-[28px] border border-[#3A2E12] bg-[#161616] p-5 shadow-[0_0_45px_rgba(212,175,55,0.08)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">
                הסיכום היומי
              </p>

              <p className="mt-1 text-xl font-bold text-white">
                {completedMeals} מתוך {meals.length} ארוחות דווחו
              </p>
            </div>

            <Flame className="text-[#D4AF37]" size={28} />
          </div>

          <ProgressLine
            title="קלוריות"
            current={totals.calories}
            goal={calorieGoal}
            percentage={caloriesPercentage}
          />

          <div className="mt-5">
            <ProgressLine
              title="חלבון"
              current={totals.protein}
              goal={proteinGoal}
              percentage={proteinPercentage}
              suffix="גרם"
            />
          </div>
        </section>

        <section className="space-y-4">
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onStatusChange={updateMealStatus}
            />
          ))}
        </section>

        <button
          type="button"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#6F5720] bg-[#161616] px-4 py-4 font-bold text-[#F3D27A] transition hover:border-[#D4AF37]"
        >
          <Plus size={20} />
          הוסף ארוחה חריגה
        </button>
      </div>

      <BottomNav />
    </main>
  );
}

type ProgressLineProps = {
  title: string;
  current: number;
  goal: number;
  percentage: number;
  suffix?: string;
};

function ProgressLine({
  title,
  current,
  goal,
  percentage,
  suffix = "קל׳",
}: ProgressLineProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-zinc-300">
          {title}
        </span>

        <span className="font-bold text-[#D4AF37]">
          {current} / {goal} {suffix}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-[#2B2B2B]">
        <div
          className="h-full rounded-full bg-gradient-to-l from-[#8B6B1F] via-[#D4AF37] to-[#FFF2C7] transition-all duration-500"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}