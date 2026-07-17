import { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
};

export default function GlassCard({
  children,
  className = "",
}: GlassCardProps) {
  return (
    <div
      className={`
        rounded-3xl
        border
        border-[#3A2E12]
        bg-[#161616]/95
        backdrop-blur-xl
        shadow-[0_0_40px_rgba(212,175,55,0.08)]
        p-6
        transition-all
        duration-300
        hover:border-[#D4AF37]
        hover:shadow-[0_0_50px_rgba(212,175,55,0.18)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}