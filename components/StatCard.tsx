type StatCardProps = {
  title: string;
  value: string;
  unit: string;
  icon: string;
  progress?: number;
  color?: string;
};

export default function StatCard({
  title,
  value,
  unit,
  icon,
  progress = 100,
  color = "#D4AF37",
}: StatCardProps) {
  return (
    <div className="bg-[#161616] border border-[#2B2B2B] rounded-3xl p-5 transition-all duration-300 hover:border-[#D4AF37] hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <span className="text-3xl">{icon}</span>

        <span className="text-sm text-gray-400">
          {progress}%
        </span>
      </div>

      <h3 className="mt-6 text-gray-400 text-sm">
        {title}
      </h3>

      <div className="mt-2 flex items-end gap-2">
        <span className="text-white text-4xl font-black">
          {value}
        </span>

        <span className="text-gray-400 pb-1">
          {unit}
        </span>
      </div>

      <div className="mt-5 h-2 rounded-full bg-[#2B2B2B] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}