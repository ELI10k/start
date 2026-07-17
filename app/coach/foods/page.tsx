import { Database } from "lucide-react";
import FoodDatabase from "@/components/FoodDatabase";

export default function FoodsPage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0A0A0A] text-white"
    >
      <div className="mx-auto max-w-md px-4 pb-12 pt-8">
        <header className="mb-6">
          <p className="mb-2 text-sm font-bold tracking-[0.22em] text-[#D4AF37]">
            START COACH
          </p>

          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-black">
                מאגר המאכלים
              </h1>

              <p className="mt-2 text-sm text-zinc-400">
                ניהול הערכים שמהם נבנה תפריטים
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3A2E12] bg-[#161616] text-[#D4AF37]">
              <Database size={22} />
            </div>
          </div>
        </header>

        <FoodDatabase />
      </div>
    </main>
  );
}