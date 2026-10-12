"use client";

import { useState } from "react";
import { Footprints, MoonStar, Ruler, Scale, Utensils } from "lucide-react";
import PersistedProgressHistory from "@/components/client/PersistedProgressHistory";
import HealthProgressPanel from "@/components/client/HealthProgressPanel";
import PersistedProgressForm from "@/components/client/PersistedProgressForm";
import ProgressPhotoGallery, { type ProgressPhotoSession } from "@/components/client/ProgressPhotoGallery";
import NutritionProgressPanel from "@/components/client/NutritionProgressPanel";
import type { DailyNutritionTotal, NutritionTargets } from "@/lib/nutrition/progress";

type ProgressEntry = Readonly<{
  id: string;
  date: string;
  weight: number | string;
  navel_circumference: number | string | null;
  notes: string | null;
}>;

type Metric = "weight" | "measurements" | "steps" | "sleep" | "nutrition";

const tabs = [
  { id: "weight", label: "משקל", description: "מגמה ויעד", icon: Scale },
  { id: "measurements", label: "היקפים", description: "שינוי בגוף", icon: Ruler },
  { id: "steps", label: "צעדים", description: "פעילות יומית", icon: Footprints },
  { id: "sleep", label: "שינה", description: "התאוששות", icon: MoonStar },
  { id: "nutrition", label: "תזונה", description: "קלוריות ומאקרו", icon: Utensils },
] as const;

export default function ProgressMetricsDashboard({
  entries,
  targetWeight,
  nutritionGoal,
  photoSessions,
  photoError,
  today,
  nutritionDays,
  nutritionTargets,
}: {
  entries: readonly ProgressEntry[];
  targetWeight?: number | string | null;
  nutritionGoal?: string | null;
  photoSessions: readonly ProgressPhotoSession[];
  photoError?: boolean;
  today: string;
  nutritionDays: readonly DailyNutritionTotal[];
  nutritionTargets: NutritionTargets;
}) {
  const [metric, setMetric] = useState<Metric>("weight");

  return (
    <section className="progress-metrics" aria-labelledby="progress-metrics-title">
      <h2 id="progress-metrics-title" className="sr-only">בחירת מדד התקדמות</h2>
      <div className="progress-metric-tabs" role="tablist" aria-label="בחירת מדד התקדמות">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = metric === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="progress-metric-panel"
              className="progress-metric-tab"
              data-selected={selected || undefined}
              onClick={() => setMetric(tab.id)}
            >
              <span className="progress-metric-tab__icon"><Icon aria-hidden="true" size={20} /></span>
              <strong>{tab.label}</strong>
              <small>{tab.description}</small>
            </button>
          );
        })}
      </div>

      <div id="progress-metric-panel" role="tabpanel" className="progress-metric-panel">
        {metric === "weight" || metric === "measurements" ? (
          <PersistedProgressHistory
            entries={entries}
            targetWeight={targetWeight}
            nutritionGoal={nutritionGoal}
            metric={metric}
          />
        ) : metric === "nutrition" ? (
          <NutritionProgressPanel days={nutritionDays} targets={nutritionTargets}/>
        ) : (
          <HealthProgressPanel metric={metric} />
        )}
      </div>
      {metric === "weight" || metric === "measurements" ? (
        <>
          <ProgressPhotoGallery sessions={photoSessions} error={photoError} />
          <PersistedProgressForm today={today} />
        </>
      ) : null}
    </section>
  );
}
