"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Apple,
  Edit3,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  FoodCategory,
  FoodItem,
  initialFoods,
} from "@/lib/foods";

const categories: Array<FoodCategory | "הכול"> = [
  "הכול",
  "חלבון",
  "פחמימה",
  "שומן",
  "ירקות",
  "פירות",
  "מוצרי חלב",
  "אחר",
];

const emptyFood: Omit<FoodItem, "id"> = {
  name: "",
  category: "חלבון",
  servingAmount: 100,
  servingUnit: "גרם",
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  brand: "",
};

export default function FoodDatabase() {
  const [foods, setFoods] = useState<FoodItem[]>(initialFoods);
  const [search, setSearch] = useState("");
  const [category, setCategory] =
    useState<FoodCategory | "הכול">("הכול");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] =
    useState<Omit<FoodItem, "id">>(emptyFood);

  const filteredFoods = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return foods.filter((food) => {
      const matchesCategory =
        category === "הכול" || food.category === category;

      const matchesSearch =
        !normalizedSearch ||
        food.name.toLowerCase().includes(normalizedSearch) ||
        food.brand?.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [foods, search, category]);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyFood);
    setFormOpen(true);
  }

  function openEditForm(food: FoodItem) {
    const { id, ...foodWithoutId } = food;

    setEditingId(id);
    setForm(foodWithoutId);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyFood);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) return;

    if (editingId !== null) {
      setFoods((currentFoods) =>
        currentFoods.map((food) =>
          food.id === editingId
            ? {
                ...form,
                id: editingId,
                name: form.name.trim(),
              }
            : food
        )
      );
    } else {
      setFoods((currentFoods) => [
        {
          ...form,
          id: Date.now(),
          name: form.name.trim(),
        },
        ...currentFoods,
      ]);
    }

    closeForm();
  }

  function deleteFood(foodId: number) {
    const confirmed = window.confirm(
      "למחוק את המאכל מהמאגר?"
    );

    if (!confirmed) return;

    setFoods((currentFoods) =>
      currentFoods.filter((food) => food.id !== foodId)
    );
  }

  return (
    <div>
      <section className="mb-5 rounded-[28px] border border-[#3A2E12] bg-[#161616] p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">
              סך הכול במאגר
            </p>

            <p className="mt-1 text-3xl font-black text-white">
              {foods.length} מאכלים
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-l from-[#8B6B1F] via-[#D4AF37] to-[#F3D27A] px-4 py-3 font-bold text-black"
          >
            <Plus size={19} />
            הוסף מאכל
          </button>
        </div>

        <div className="relative">
          <Search
            size={19}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש לפי שם או מותג..."
            className="w-full rounded-2xl border border-[#303030] bg-[#0F0F0F] py-3 pl-4 pr-12 text-white outline-none placeholder:text-zinc-600 focus:border-[#D4AF37]"
          />
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                category === item
                  ? "border-[#D4AF37] bg-[#D4AF37] text-black"
                  : "border-[#303030] bg-[#101010] text-zinc-400"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {filteredFoods.map((food) => (
          <FoodCard
            key={food.id}
            food={food}
            onEdit={() => openEditForm(food)}
            onDelete={() => deleteFood(food.id)}
          />
        ))}

        {filteredFoods.length === 0 && (
          <div className="rounded-[28px] border border-dashed border-[#3A2E12] bg-[#161616] p-10 text-center">
            <Apple
              size={34}
              className="mx-auto mb-3 text-[#D4AF37]"
            />

            <p className="font-bold text-white">
              לא נמצאו מאכלים
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              נסה חיפוש אחר או הוסף מאכל חדש.
            </p>
          </div>
        )}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[32px] border border-[#3A2E12] bg-[#111111] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">
                {editingId === null
                  ? "הוספת מאכל"
                  : "עריכת מאכל"}
              </h2>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-full border border-[#303030] bg-[#1B1B1B] p-2 text-zinc-400"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="שם המאכל">
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  className="input"
                  placeholder="לדוגמה: חזה עוף מבושל"
                />
              </FormField>

              <FormField label="מותג — לא חובה">
                <input
                  value={form.brand}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      brand: event.target.value,
                    })
                  }
                  className="input"
                  placeholder="לדוגמה: תנובה"
                />
              </FormField>

              <FormField label="קטגוריה">
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target
                        .value as FoodCategory,
                    })
                  }
                  className="input"
                >
                  {categories
                    .filter((item) => item !== "הכול")
                    .map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="כמות מנה"
                  value={form.servingAmount}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      servingAmount: value,
                    })
                  }
                />

                <FormField label="יחידת מידה">
                  <input
                    value={form.servingUnit}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        servingUnit: event.target.value,
                      })
                    }
                    className="input"
                    placeholder="גרם / יחידה"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="קלוריות"
                  value={form.calories}
                  onChange={(value) =>
                    setForm({ ...form, calories: value })
                  }
                />

                <NumberField
                  label="חלבון"
                  value={form.protein}
                  onChange={(value) =>
                    setForm({ ...form, protein: value })
                  }
                />

                <NumberField
                  label="פחמימה"
                  value={form.carbs}
                  onChange={(value) =>
                    setForm({ ...form, carbs: value })
                  }
                />

                <NumberField
                  label="שומן"
                  value={form.fat}
                  onChange={(value) =>
                    setForm({ ...form, fat: value })
                  }
                />

                <NumberField
                  label="סיבים"
                  value={form.fiber}
                  onChange={(value) =>
                    setForm({ ...form, fiber: value })
                  }
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-l from-[#8B6B1F] via-[#D4AF37] to-[#F3D27A] px-4 py-4 font-black text-black"
              >
                {editingId === null
                  ? "שמור במאגר"
                  : "שמור שינויים"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

type FoodCardProps = {
  food: FoodItem;
  onEdit: () => void;
  onDelete: () => void;
};

function FoodCard({
  food,
  onEdit,
  onDelete,
}: FoodCardProps) {
  return (
    <article className="rounded-[24px] border border-[#2B2B2B] bg-[#161616] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="rounded-full border border-[#4A3915] bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold text-[#F3D27A]">
            {food.category}
          </span>

          <h3 className="mt-3 text-lg font-bold text-white">
            {food.name}
          </h3>

          <p className="mt-1 text-sm text-zinc-500">
            {food.servingAmount} {food.servingUnit}
            {food.brand ? ` · ${food.brand}` : ""}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-[#303030] bg-[#101010] p-2 text-[#D4AF37]"
          >
            <Edit3 size={17} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-[#303030] bg-[#101010] p-2 text-red-400"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <MacroBox label="קלוריות" value={food.calories} />
        <MacroBox label="חלבון" value={food.protein} />
        <MacroBox label="פחמימה" value={food.carbs} />
        <MacroBox label="שומן" value={food.fat} />
      </div>
    </article>
  );
}

function MacroBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-[#0F0F0F] px-2 py-3 text-center">
      <p className="text-sm font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-zinc-300">
        {label}
      </span>

      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <FormField label={label}>
      <input
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        className="input"
      />
    </FormField>
  );
}