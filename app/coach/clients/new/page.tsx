"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Calculator,
  Dumbbell,
  Flame,
  Footprints,
  Ruler,
  Scale,
  Target,
  UserRound,
} from "lucide-react";

import {
  ClientNutritionInput,
  Gender,
  Goal,
  calculateNutritionTargets,
} from "@/lib/nutrition/calculations";

const goalOptions: Array<{
  value: Goal;
  label: string;
}> = [
  {
    value: "aggressive_cut",
    label: "חיטוב אגרסיבי",
  },
  {
    value: "cut",
    label: "חיטוב",
  },
  {
    value: "maintenance",
    label: "שמירה",
  },
  {
    value: "lean_bulk",
    label: "עלייה נקייה במסה",
  },
];

const initialForm: ClientNutritionInput = {
  gender: "male",
  age: 35,
  heightCm: 175,
  weightKg: 85,
  weeklyWorkouts: 3,
  averageDailySteps: 8000,
  goal: "cut",
};

export default function NewClientPage() {
  const [clientName, setClientName] = useState("");
  const [form, setForm] =
    useState<ClientNutritionInput>(initialForm);

  const targets = useMemo(() => {
    return calculateNutritionTargets(form);
  }, [form]);

  function updateNumberField(
    field:
      | "age"
      | "heightCm"
      | "weightKg"
      | "weeklyWorkouts"
      | "averageDailySteps",
    value: string
  ) {
    const parsedValue = Number(value);

    setForm((current) => ({
      ...current,
      [field]: Number.isNaN(parsedValue) ? 0 : parsedValue,
    }));
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0A0A0A] px-4 pb-16 pt-8 text-white"
    >
      <div className="mx-auto max-w-md">
        <header className="mb-6">
          <p className="text-sm font-bold tracking-[0.22em] text-[#D4AF37]">
            START COACH
          </p>

          <h1 className="mt-2 text-3xl font-black">
            לקוח חדש
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            הזן את נתוני הלקוח וקבל מיד BMR, תחזוקה,
            קלוריות יעד ומאקרו.
          </p>
        </header>

        <section className="space-y-4 rounded-[28px] border border-[#2B2B2B] bg-[#161616] p-5">
          <TextField
            label="שם הלקוח"
            icon={<UserRound size={18} />}
          >
            <input
              value={clientName}
              onChange={(event) =>
                setClientName(event.target.value)
              }
              placeholder="לדוגמה: ישראל ישראלי"
              className="nutrition-input"
            />
          </TextField>

          <div>
            <p className="mb-2 text-sm font-bold text-zinc-300">
              מין
            </p>

            <div className="grid grid-cols-2 gap-3">
              <GenderButton
                label="גבר"
                active={form.gender === "male"}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    gender: "male",
                  }))
                }
              />

              <GenderButton
                label="אישה"
                active={form.gender === "female"}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    gender: "female",
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="גיל"
              value={form.age}
              icon={<UserRound size={18} />}
              suffix="שנים"
              onChange={(value) =>
                updateNumberField("age", value)
              }
            />

            <NumberInput
              label="גובה"
              value={form.heightCm}
              icon={<Ruler size={18} />}
              suffix="ס״מ"
              onChange={(value) =>
                updateNumberField("heightCm", value)
              }
            />
          </div>

          <NumberInput
            label="משקל"
            value={form.weightKg}
            icon={<Scale size={18} />}
            suffix="ק״ג"
            step="0.1"
            onChange={(value) =>
              updateNumberField("weightKg", value)
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="אימונים בשבוע"
              value={form.weeklyWorkouts}
              icon={<Dumbbell size={18} />}
              suffix="אימונים"
              min="0"
              max="14"
              onChange={(value) =>
                updateNumberField("weeklyWorkouts", value)
              }
            />

            <NumberInput
              label="צעדים ביום"
              value={form.averageDailySteps}
              icon={<Footprints size={18} />}
              suffix="צעדים"
              step="500"
              onChange={(value) =>
                updateNumberField(
                  "averageDailySteps",
                  value
                )
              }
            />
          </div>

          <TextField
            label="מטרה"
            icon={<Target size={18} />}
          >
            <select
              value={form.goal}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  goal: event.target.value as Goal,
                }))
              }
              className="nutrition-input"
            >
              {goalOptions.map((goal) => (
                <option
                  key={goal.value}
                  value={goal.value}
                >
                  {goal.label}
                </option>
              ))}
            </select>
          </TextField>
        </section>

        <section className="mt-5 rounded-[28px] border border-[#4A3915] bg-gradient-to-b from-[#1A1810] to-[#141414] p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">
                תוצאה מחושבת
              </p>

              <h2 className="mt-1 text-2xl font-black">
                יעד תזונתי
              </h2>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#4A3915] bg-[#D4AF37]/10 text-[#D4AF37]">
              <Calculator size={23} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ResultCard
              label="BMR"
              value={targets.bmr}
              suffix="קלוריות"
              icon={<Flame size={18} />}
            />

            <ResultCard
              label="תחזוקה TDEE"
              value={targets.tdee}
              suffix="קלוריות"
              icon={<Activity size={18} />}
            />
          </div>

          <div className="mt-3 rounded-[22px] border border-[#6B521C] bg-[#D4AF37]/10 p-5 text-center">
            <p className="text-sm font-bold text-[#F3D27A]">
              קלוריות יעד
            </p>

            <p className="mt-2 text-4xl font-black text-white">
              {targets.targetCalories}
            </p>

            <p className="mt-1 text-sm text-zinc-400">
              קלוריות ביום
            </p>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <MacroResult
              label="חלבון"
              value={targets.proteinGrams}
            />

            <MacroResult
              label="פחמימה"
              value={targets.carbsGrams}
            />

            <MacroResult
              label="שומן"
              value={targets.fatGrams}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-[#2B2B2B] bg-[#0E0E0E] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">
                מקדם פעילות
              </span>

              <span className="font-black text-white">
                {targets.activityMultiplier}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-zinc-500">
                שינוי מהתחזוקה
              </span>

              <span
                className={
                  targets.calorieAdjustment < 0
                    ? "font-black text-red-400"
                    : targets.calorieAdjustment > 0
                      ? "font-black text-green-400"
                      : "font-black text-white"
                }
              >
                {targets.calorieAdjustment > 0 ? "+" : ""}
                {targets.calorieAdjustment} קלוריות
              </span>
            </div>
          </div>
        </section>

        <button
          type="button"
          disabled={!clientName.trim()}
          className="mt-5 w-full rounded-2xl bg-gradient-to-l from-[#8B6B1F] via-[#D4AF37] to-[#F3D27A] px-5 py-4 text-lg font-black text-black transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          המשך לבניית התפריט
        </button>
      </div>
    </main>
  );
}

type TextFieldProps = {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

function TextField({
  label,
  icon,
  children,
}: TextFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-300">
        <span className="text-[#D4AF37]">{icon}</span>
        {label}
      </span>

      {children}
    </label>
  );
}

type NumberInputProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  suffix: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  step?: string;
};

function NumberInput({
  label,
  value,
  icon,
  suffix,
  onChange,
  min = "0",
  max,
  step = "1",
}: NumberInputProps) {
  return (
    <TextField label={label} icon={icon}>
      <div className="relative">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="nutrition-input pl-16"
        />

        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
          {suffix}
        </span>
      </div>
    </TextField>
  );
}

type GenderButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function GenderButton({
  label,
  active,
  onClick,
}: GenderButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 font-bold transition ${
        active
          ? "border-[#D4AF37] bg-[#D4AF37] text-black"
          : "border-[#303030] bg-[#0F0F0F] text-zinc-400"
      }`}
    >
      {label}
    </button>
  );
}

type ResultCardProps = {
  label: string;
  value: number;
  suffix: string;
  icon: React.ReactNode;
};

function ResultCard({
  label,
  value,
  suffix,
  icon,
}: ResultCardProps) {
  return (
    <div className="rounded-[20px] border border-[#2B2B2B] bg-[#0E0E0E] p-4">
      <div className="flex items-center gap-2 text-[#D4AF37]">
        {icon}

        <span className="text-xs font-bold">
          {label}
        </span>
      </div>

      <p className="mt-3 text-2xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-500">
        {suffix}
      </p>
    </div>
  );
}

function MacroResult({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[18px] border border-[#2B2B2B] bg-[#0E0E0E] px-2 py-4 text-center">
      <p className="text-xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-500">
        גרם {label}
      </p>
    </div>
  );
}