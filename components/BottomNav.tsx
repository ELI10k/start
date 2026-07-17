"use client";

type BottomNavProps = {
  active?: "home" | "nutrition" | "workouts" | "progress" | "profile";
};

export default function BottomNav({
  active = "home",
}: BottomNavProps) {
  const items = [
    {
      key: "home",
      icon: "⌂",
      label: "בית",
    },
    {
      key: "nutrition",
      icon: "🍽",
      label: "תזונה",
    },
    {
      key: "workouts",
      icon: "🏋",
      label: "אימונים",
    },
    {
      key: "progress",
      icon: "📈",
      label: "התקדמות",
    },
    {
      key: "profile",
      icon: "👤",
      label: "פרופיל",
    },
  ];

  return (
    <nav
      className="
      fixed
      bottom-0
      left-0
      right-0
      bg-[#0A0A0A]
      border-t
      border-[#2B2B2B]
      px-3
      py-3"
    >
      <div className="max-w-xl mx-auto flex justify-between">

        {items.map((item) => {

          const isActive = item.key === active;

          return (
            <button
              key={item.key}
              className="
              flex
              flex-col
              items-center
              gap-2
              transition-all"
            >
              <span
                className={`text-2xl ${
                  isActive
                    ? "text-[#D4AF37]"
                    : "text-gray-500"
                }`}
              >
                {item.icon}
              </span>

              <span
                className={`text-xs font-medium ${
                  isActive
                    ? "text-[#D4AF37]"
                    : "text-gray-500"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

      </div>
    </nav>
  );
}