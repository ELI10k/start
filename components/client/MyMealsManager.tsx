"use client";

import { useActionState, useCallback, useMemo, useState } from "react";
import { Copy, Pencil, Plus, Trash2, UtensilsCrossed, X } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import FoodCombobox from "@/components/coach/menus/FoodCombobox";
import SubmitButton from "@/components/forms/SubmitButton";
import { addMyMealToDay, deleteMyMeal, duplicateMyMeal, saveMyMeal, type MyMealActionState } from "@/app/actions/my-meals";
import { portionFor, unitLabel } from "@/lib/nutrition/meal-alternatives";
import type { MyMeal } from "@/lib/nutrition/my-meals";

export type MyMealsFood = Readonly<{
  id: string; name: string; brand: string | null; category?: string;
  calories: number; protein: number | null; carbs: number | null; fat: number | null;
  packageUnit: string | null; unitWeightGrams: number | null;
}>;
type DraftItem = { foodId: string; quantity: number; unit: string };
type PlannedMealChoice = Readonly<{ id: string; title: string }>;
const initial: MyMealActionState = { ok: false };

const itemPortion = (item: DraftItem, food: MyMealsFood) => portionFor({
  calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat,
  packageUnit: food.packageUnit, unitWeightGrams: food.unitWeightGrams,
}, item.quantity, item.unit === "גרם" ? "gram" : "native");

function AssignToMeal({ meal, date, now, plannedMeals }: { meal: MyMeal; date: string; now: string; plannedMeals: readonly PlannedMealChoice[] }) {
  const [state, action] = useActionState(addMyMealToDay, initial);
  if (!plannedMeals.length)
    return <p className="mt-4 rounded-xl bg-[#F7F8F7] p-3 text-sm text-[#5B5F5B]">אין ארוחות זמינות בתפריט ליום הזה.</p>;
  return <form action={action} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
    <input type="hidden" name="id" value={meal.id}/><input type="hidden" name="date" value={date}/>
    <label className="text-xs font-bold">לאיזו ארוחה לשייך?<select className="nutrition-input mt-1" name="targetMealId" required defaultValue=""><option value="" disabled>בחירת ארוחה</option>{plannedMeals.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}</select></label>
    <label className="text-xs font-bold">שעת אכילה<input className="nutrition-input mt-1" type="time" name="time" defaultValue={now} required/></label>
    <SubmitButton idle="שיוך לארוחה" pending="משייכים…" className="premium-primary-button self-end"/>
    {state.message ? <p role="status" className={`text-sm sm:col-span-3 ${state.ok ? "text-[#15803D]" : "text-[#B91C1C]"}`}>{state.message}</p> : null}
  </form>;
}

export default function MyMealsManager({ meals, foods, date, now, plannedMeals }: {
  meals: readonly MyMeal[]; foods: readonly MyMealsFood[]; date: string; now: string; plannedMeals: readonly PlannedMealChoice[];
}) {
  const foodById = useMemo(() => new Map(foods.map((food) => [food.id, food])), [foods]);
  const [editing, setEditing] = useState<MyMeal | null | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [name, setName] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [state, action, pending] = useActionState(async (previous: MyMealActionState, form: FormData) => {
    const result = await saveMyMeal(previous, form);
    if (result.ok) setEditing(undefined);
    return result;
  }, initial);
  const closeEditor = useCallback(() => setEditing(undefined), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const openEditor = (meal: MyMeal | null) => {
    setEditing(meal); setName(meal?.name ?? "");
    setItems(meal?.items.map((item) => ({ foodId: item.foodId, quantity: item.quantity, unit: item.unit })) ?? []);
  };
  const addFood = (foodId: string) => {
    const food = foodById.get(foodId); if (!food) return;
    const native = food.packageUnit?.trim() && food.unitWeightGrams && food.unitWeightGrams > 0 ? food.packageUnit.trim() : "גרם";
    setItems((current) => [...current, { foodId, quantity: native === "גרם" ? 100 : 1, unit: native }]);
    setPickerOpen(false);
  };

  return <>
    <div className="flex items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black">הארוחות שלי</h1><p className="mt-1 text-sm text-[#5B5F5B]">בונים פעם אחת ומשייכים לארוחה בכמה שניות.</p></div>
      <button className="premium-primary-button" onClick={() => openEditor(null)}><Plus aria-hidden="true" size={18}/>ארוחה חדשה</button>
    </div>
    {meals.length ? <div className="mt-5 grid gap-4">{meals.map((meal) => {
      const totals = meal.items.reduce((sum, item) => ({ calories: sum.calories + item.calories, protein: sum.protein + item.protein }), { calories: 0, protein: 0 });
      return <article key={meal.id} className="rounded-[24px] border border-[#E5E7E5] bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black">{meal.name}</h2><p className="mt-1 text-xs text-[#5B5F5B]">{Math.round(totals.calories)} קל׳ · {Math.round(totals.protein)} ג׳ חלבון</p></div><div className="flex gap-1">
          <button aria-label={`עריכת ${meal.name}`} className="inline-flex size-11 items-center justify-center rounded-xl" onClick={() => openEditor(meal)}><Pencil size={17}/></button>
          <form action={duplicateMyMeal}><input type="hidden" name="id" value={meal.id}/><button aria-label={`שכפול ${meal.name}`} className="inline-flex size-11 items-center justify-center rounded-xl"><Copy size={17}/></button></form>
          <form action={deleteMyMeal}><input type="hidden" name="id" value={meal.id}/><button aria-label={`מחיקת ${meal.name}`} className="inline-flex size-11 items-center justify-center rounded-xl text-[#DC2626]" onClick={(event) => { if (!window.confirm(`למחוק את ${meal.name}?`)) event.preventDefault(); }}><Trash2 size={17}/></button></form>
        </div></div>
        <ul className="mt-3 divide-y divide-[#EEF0EE] text-sm">{meal.items.map((item) => <li key={item.id} className="flex justify-between gap-3 py-2"><span>{item.name}</span><span className="shrink-0 text-[#5B5F5B]">{item.quantity} {unitLabel(item.unit, item.quantity)}</span></li>)}</ul>
        <AssignToMeal meal={meal} date={date} now={now} plannedMeals={plannedMeals}/>
      </article>;
    })}</div> : <div className="mt-8 rounded-[24px] border border-dashed border-[#BFC5BF] bg-white p-8 text-center"><UtensilsCrossed className="mx-auto text-[#16A34A]"/><h2 className="mt-3 text-lg font-black">עוד אין ארוחות שמורות</h2><p className="mt-1 text-sm text-[#5B5F5B]">צרו ארוחה קבועה עם המאכלים והמינונים שלכם.</p><button className="premium-primary-button mt-4" onClick={() => openEditor(null)}>יצירת ארוחה ראשונה</button></div>}

    <BottomSheet open={editing !== undefined && !pickerOpen} title={editing ? "עריכת ארוחה" : "ארוחה חדשה"} onClose={closeEditor}>
      <form action={action} className="grid gap-4">{editing?.id ? <input type="hidden" name="id" value={editing.id}/> : null}<input type="hidden" name="items" value={JSON.stringify(items)}/>
        <label className="text-sm font-bold">שם הארוחה<input className="nutrition-input mt-2" name="name" maxLength={80} required value={name} onChange={(event) => setName(event.target.value)} placeholder="לדוגמה: ארוחת בוקר קבועה"/></label>
        <div className="grid gap-2"><div className="rounded-2xl bg-[#ECFDF3] p-3"><p className="text-sm font-bold text-[#15803D]">מאכלים ממאגר המזונות</p><p className="mt-1 text-xs text-[#3F433F]">בחרו מאכלים מהמאגר, והערכים יחושבו אוטומטית לפי הכמות.</p></div>
          {items.map((item, index) => { const food = foodById.get(item.foodId); if (!food) return null; const natural = Boolean(food.packageUnit && food.unitWeightGrams && food.unitWeightGrams > 0); const portion = itemPortion(item, food); return <div key={`${item.foodId}-${index}`} className="rounded-2xl border border-[#E5E7E5] p-3">
            <div className="flex items-center justify-between gap-2"><strong className="text-sm">{food.name}</strong><button type="button" aria-label={`הסרת ${food.name}`} className="inline-flex size-11 items-center justify-center text-[#DC2626]" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={17}/></button></div>
            <div className="mt-2 grid grid-cols-2 gap-2"><label className="text-xs font-bold">כמות<input className="nutrition-input mt-1" type="number" min="0.1" max="100000" step="0.1" value={item.quantity} onChange={(event) => setItems((current) => current.map((row, itemIndex) => itemIndex === index ? { ...row, quantity: Number(event.target.value) } : row))}/></label><label className="text-xs font-bold">יחידה<select className="nutrition-input mt-1" value={item.unit} onChange={(event) => setItems((current) => current.map((row, itemIndex) => itemIndex === index ? { ...row, unit: event.target.value, quantity: event.target.value === "גרם" ? 100 : 1 } : row))}><option value="גרם">גרם</option>{natural ? <option value={food.packageUnit!}>{unitLabel(food.packageUnit!, 2)}</option> : null}</select></label></div>
            {portion ? <p className="mt-2 text-xs text-[#5B5F5B]">{Math.round(portion.calories)} קל׳ · {Math.round(portion.protein)} ג׳ חלבון</p> : null}
          </div>; })}
          <button type="button" className="premium-secondary-button" onClick={() => setPickerOpen(true)}><Plus size={17}/>בחירה ממאגר המזונות</button>
        </div>
        {items.length ? <p className="rounded-xl bg-[#F7F8F7] p-3 text-sm font-bold">סה״כ בארוחה: {Math.round(items.reduce((sum, item) => { const food = foodById.get(item.foodId); return sum + (food ? itemPortion(item, food)?.calories ?? 0 : 0); }, 0))} קל׳</p> : null}
        {state.message && !state.ok ? <p role="alert" className="text-sm text-[#B91C1C]">{state.message}</p> : null}
        <button disabled={pending || !name.trim() || items.length === 0} className="premium-primary-button">{pending ? "שומרים…" : editing ? "שמירת השינויים" : "שמירת הארוחה"}</button>
      </form>
    </BottomSheet>
    <BottomSheet open={pickerOpen} title="בחירת מאכל" onClose={closePicker}><FoodCombobox foods={foods} value="" usage={[]} onSelect={addFood} onClose={closePicker} clientCatalogueOrder/></BottomSheet>
  </>;
}
