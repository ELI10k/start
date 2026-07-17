type QuickActionProps = {
  title: string;
  subtitle: string;
  icon: string;
  onClick?: () => void;
};

export default function QuickAction({
  title,
  subtitle,
  icon,
  onClick,
}: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="
      w-full
      rounded-3xl
      border
      border-[#2B2B2B]
      bg-[#161616]
      p-6
      text-right
      transition-all
      duration-300
      hover:border-[#D4AF37]
      hover:-translate-y-1
      hover:shadow-[0_0_25px_rgba(212,175,55,.20)]
      active:scale-95"
    >
      <div className="flex flex-col items-center gap-4">

        <div
          className="
          w-16
          h-16
          rounded-2xl
          flex
          items-center
          justify-center
          bg-gradient-to-br
          from-[#8B6B1F]
          via-[#D4AF37]
          to-[#FFF2C7]
          text-black
          text-3xl"
        >
          {icon}
        </div>

        <div className="text-center">

          <h3 className="text-white text-xl font-bold">
            {title}
          </h3>

          <p className="text-gray-400 mt-2">
            {subtitle}
          </p>

        </div>

      </div>
    </button>
  );
}