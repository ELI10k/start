import CircularProgress from "./CircularProgress";
import GlassCard from "./GlassCard";

type ProgressCardProps = {
  calories: number;
  caloriesGoal: number;
  protein: number;
  proteinGoal: number;
  steps: number;
  stepsGoal: number;
};

export default function ProgressCard({
  calories,
  caloriesGoal,
  protein,
  proteinGoal,
  steps,
  stepsGoal,
}: ProgressCardProps) {
  const progress = Math.round(
    ((calories / caloriesGoal +
      protein / proteinGoal +
      steps / stepsGoal) /
      3) *
      100
  );

  return (
    <GlassCard>

      <div className="flex items-center justify-between mb-8">

        <div>

          <h2 className="text-3xl font-bold text-white">
            ההתקדמות היומית
          </h2>

          <p className="text-gray-400 mt-2">
            ממשיכים ככה 💪
          </p>

        </div>

        <CircularProgress
          value={Math.min(progress,100)}
        />

      </div>

      <div className="space-y-6">

        <ProgressRow
          title="קלוריות"
          current={calories}
          goal={caloriesGoal}
        />

        <ProgressRow
          title="חלבון"
          current={protein}
          goal={proteinGoal}
        />

        <ProgressRow
          title="צעדים"
          current={steps}
          goal={stepsGoal}
        />

      </div>

    </GlassCard>
  );
}

function ProgressRow({
  title,
  current,
  goal,
}:{
  title:string;
  current:number;
  goal:number;
}){

  const percent=Math.min((current/goal)*100,100);

  return(

    <div>

      <div className="flex justify-between mb-2">

        <span className="text-white font-medium">
          {title}
        </span>

        <span className="text-[#D4AF37] font-bold">
          {current} / {goal}
        </span>

      </div>

      <div className="w-full h-3 rounded-full bg-[#2B2B2B] overflow-hidden">

        <div
          className="h-full rounded-full bg-gradient-to-r from-[#8B6B1F] via-[#D4AF37] to-[#FFF2C7]"
          style={{
            width:`${percent}%`
          }}
        />

      </div>

    </div>

  )

}