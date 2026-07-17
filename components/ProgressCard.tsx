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
  const percent = Math.min(
    Math.round(
      ((calories / caloriesGoal +
        protein / proteinGoal +
        steps / stepsGoal) /
        3) *
        100
    ),
    100
  );

  return (
    <div className="bg-[#161616] border border-[#2B2B2B] rounded-3xl p-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-white text-2xl font-bold">
          ההתקדמות היומית
        </h2>

        <span className="text-gray-400">
          עודכן לפני דקה
        </span>
      </div>

      <div className="flex gap-8 items-center">

        <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-[10px] border-[#D4AF37]">
          <span className="text-white text-5xl font-black">
            {percent}%
          </span>
        </div>

        <div className="flex-1 space-y-6">

          <ProgressRow
            title="קלוריות"
            value={calories}
            goal={caloriesGoal}
          />

          <ProgressRow
            title="חלבון"
            value={protein}
            goal={proteinGoal}
          />

          <ProgressRow
            title="צעדים"
            value={steps}
            goal={stepsGoal}
          />

        </div>

      </div>
    </div>
  );
}

function ProgressRow({
  title,
  value,
  goal,
}: {
  title: string;
  value: number;
  goal: number;
}) {
  const width = Math.min((value / goal) * 100, 100);

  return (
    <div>

      <div className="flex justify-between text-white mb-2">

        <span>{title}</span>

        <span>
          {value} / {goal}
        </span>

      </div>

      <div className="h-3 rounded-full bg-[#2B2B2B] overflow-hidden">

        <div
          className="h-full rounded-full bg-gradient-to-r from-[#8B6B1F] via-[#D4AF37] to-[#FFF2C7]"
          style={{
            width: `${width}%`,
          }}
        />

      </div>

    </div>
  );
}