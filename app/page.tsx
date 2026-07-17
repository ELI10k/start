import Header from "@/components/Header";
import ProgressCard from "@/components/ProgressCard";
import QuickAction from "@/components/QuickAction";
import StatCard from "@/components/StatCard";
import BottomNav from "@/components/BottomNav";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white pb-32">

      <div className="max-w-6xl mx-auto px-6 py-8">

        <Header name="אלי" />

        <div className="mt-10">

          <ProgressCard
            calories={1620}
            caloriesGoal={2100}
            protein={142}
            proteinGoal={170}
            steps={8420}
            stepsGoal={10000}
          />

        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-8">

          <StatCard
            title="משקל"
            value="83.6"
            unit='ק"ג'
            icon="⚖"
            progress={82}
          />

          <StatCard
            title="קלוריות"
            value="1620"
            unit='קק"ל'
            icon="🔥"
            progress={77}
          />

          <StatCard
            title="חלבון"
            value="142"
            unit="גרם"
            icon="💪"
            progress={84}
          />

          <StatCard
            title="צעדים"
            value="8420"
            unit="צעדים"
            icon="👟"
            progress={84}
          />

        </div>

        <h2 className="mt-12 mb-5 text-2xl font-bold text-[#D4AF37]">
          פעולות מהירות
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          <QuickAction
            title="דיווח ארוחה"
            subtitle="הוסף ארוחה"
            icon="🍽"
          />

          <QuickAction
            title="שקילה"
            subtitle="עדכן משקל"
            icon="⚖"
          />

          <QuickAction
            title="אימון"
            subtitle="התחל אימון"
            icon="🏋"
          />

        </div>

      </div>

      <BottomNav active="home" />

    </main>
  );
}