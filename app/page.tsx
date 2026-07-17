import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import ProgressCard from "@/components/ProgressCard";
import BottomNav from "@/components/BottomNav";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white pb-28">
      <Header />

      <div className="max-w-md mx-auto px-4 space-y-6">

        <ProgressCard
          calories={1650}
          caloriesGoal={2200}
          protein={145}
          proteinGoal={180}
          steps={8400}
          stepsGoal={10000}
        />

        <div className="grid grid-cols-2 gap-4">

          <StatCard
            title="משקל"
            value="82.4 ק״ג"
            subtitle="-0.8 השבוע"
          />

          <StatCard
            title="שתייה"
            value="2.6 ל׳"
            subtitle="יעד 3.5"
          />

          <StatCard
            title="שינה"
            value="7:48"
            subtitle="מצוין"
          />

          <StatCard
            title="אימון"
            value="בוצע"
            subtitle="גב + יד קדמית"
          />

        </div>

      </div>

      <BottomNav />
    </main>
  );
}