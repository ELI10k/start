"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Database, PencilLine, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import { buildShoppingList, shoppingListText, SHOPPING_CATEGORIES, type ShoppingSource } from "@/lib/nutrition/shopping-list";
import FoodCombobox, { type ComboboxFood } from "@/components/coach/menus/FoodCombobox";

export type ShoppingCatalogueFood = ComboboxFood;

// The menu already lists every food and every quantity. Turning that into a
// shopping list is presentation, not a new engine - and it is the one thing a
// client has to do outside the app for the plan to be followable at all.
export default function ShoppingList({
  items,
  title,
  catalogueFoods = [],
  recentFreeFoods = [],
  // `inline` renders the list as the screen rather than behind a button: the
  // shopping list has its own tab now, and a screen whose only content is a
  // button that opens the content is a screen with an extra tap in it.
  inline = false,
}: {
  items: readonly ShoppingSource[];
  title: string;
  catalogueFoods?: readonly ShoppingCatalogueFood[];
  recentFreeFoods?: readonly ShoppingSource[];
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Kept across a route change, and only for this menu.
  //
  // The ticks were component state, so glancing at a meal and coming back
  // emptied the basket - which is the one thing a shopping list must not do
  // while its owner is still in the shop. A new menu gets a new key, so last
  // week's ticks never appear against this week's list.
  const storageKey = `start.shopping.${title}`;
  const extrasKey = `${storageKey}.extras`;
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [extras, setExtras] = useState<ShoppingSource[]>([]);
  // Read after mount, not in a lazy initialiser: this component renders on the
  // server too, where localStorage does not exist, and seeding state from it
  // during render is the hydration mismatch that causes.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setTicked(new Set(JSON.parse(stored) as string[]));
      const savedExtras = window.localStorage.getItem(extrasKey);
      if (savedExtras) setExtras(JSON.parse(savedExtras) as ShoppingSource[]);
    } catch { /* a browser that refuses storage still gets a working list */ }
  }, [extrasKey, storageKey]);

  const lines = useMemo(() => buildShoppingList([...items, ...extras]), [extras, items]);
  const saveExtras = (next: ShoppingSource[]) => {
    setExtras(next);
    try { window.localStorage.setItem(extrasKey, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const addExtra = (item: ShoppingSource) => saveExtras([...extras, item]);
  const removeExtra = (index: number) => saveExtras(extras.filter((_, itemIndex) => itemIndex !== index));
  const toggle = (key: string) =>
    setTicked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try { window.localStorage.setItem(storageKey, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  const clear = () => {
    setTicked(new Set());
    try { window.localStorage.removeItem(storageKey); } catch { /* ignore */ }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shoppingListText(lines, title));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the list itself is still on screen.
    }
  };

  // By aisle. A supermarket is laid out in food groups and so is the menu these
  // lines came from, so walking the list is walking the shop - instead of the
  // alphabetical sweep that sent a client back to the fridges four times.
  const body = (
    <>
      {!lines.length ? <p className="rounded-2xl bg-[#F7F8F7] p-4 text-sm text-[#5B5F5B]">הרשימה עדיין ריקה. אפשר להוסיף פריט מהמאגר או לכתוב אותו ידנית.</p> : null}
      {SHOPPING_CATEGORIES.map(({ type, label }) => {
        const inCategory = lines.filter((line) => line.category === type);
        if (!inCategory.length) return null;
        return (
          <section key={type} className="mt-4 first:mt-0">
            <h3 className="text-sm font-black">{label}</h3>
            <Group lines={inCategory} ticked={ticked} onToggle={toggle} />
          </section>
        );
      })}
      {lines.length ? <p className="mt-3 text-xs text-[#5B5F5B]">
        פריט מסומן כחלופה הוא בחירה אפשרית ולא חובה — כדאי לקנות לפחות אחת מכל קבוצה, כדי שתהיה באמת בחירה.
      </p> : null}
    </>
  );
  const copyButton = (
    <button type="button" onClick={copy} className="premium-primary-button">
      {copied ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}
      {copied ? "הועתק" : "העתקת הרשימה"}
    </button>
  );

  const done = lines.filter((line) => ticked.has(`${line.name} ${line.unit}`)).length;
  const additions = (
    <section className="grid gap-3 rounded-2xl border border-[#E5E7E5] bg-white p-4">
      <h2 className="font-black">הוספת פריטים</h2>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setCatalogueOpen(true)} className="premium-secondary-button"><Database size={16} />מהמאגר</button>
        <button type="button" onClick={() => setManualOpen(true)} className="premium-secondary-button"><PencilLine size={16} />הוספה ידנית</button>
      </div>
      {recentFreeFoods.length ? (
        <div>
          <p className="mb-2 text-sm font-bold">מאכלים שנאכלו בקלוריות החופשיות</p>
          <div className="flex flex-wrap gap-2">
            {recentFreeFoods.map((item, index) => (
              <button key={`${item.name}-${item.measurementUnit}-${index}`} type="button" onClick={() => addExtra(item)} className="chip">
                <Plus size={14} />{item.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {extras.length ? (
        <div className="grid gap-2 border-t border-[#E5E7E5] pt-3">
          <p className="text-sm font-bold">פריטים שהוספת</p>
          {extras.map((item, index) => (
            <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-2 text-sm">
              <span>{item.name} · {item.displayQuantity} {item.measurementUnit}</span>
              <button type="button" aria-label={`מחיקת ${item.name}`} onClick={() => removeExtra(index)} className="chip text-[#DC2626]"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
  const sheets = (
    <>
      <CatalogueAddition open={catalogueOpen} onClose={() => setCatalogueOpen(false)} foods={catalogueFoods} onAdd={addExtra} />
      <ManualAddition open={manualOpen} onClose={() => setManualOpen(false)} onAdd={addExtra} />
    </>
  );

  if (inline) return (
    <div className="grid gap-3">
      {additions}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#5B5F5B]">נאספו {done} מתוך {lines.length}</p>
        {done ? <button type="button" onClick={clear} className="chip">ניקוי הסימונים</button> : null}
      </div>
      {body}
      {lines.length ? <div className="mt-2">{copyButton}</div> : null}
      {sheets}
    </div>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="premium-secondary-button w-full">
        <ShoppingBasket aria-hidden="true" size={17} />
        רשימת קניות מהתפריט
      </button>

      <BottomSheet open={open} title="רשימת קניות" onClose={() => setOpen(false)}>
        <p className="text-sm text-[#5B5F5B]">
          כל המזונות בתפריט, עם הכמויות מחוברות. סימון פריט נשאר עד סגירת החלון.
        </p>
        {body}
        <div className="sheet__actions">
          {copyButton}
          <button type="button" onClick={() => setOpen(false)} className="premium-secondary-button">סגירה</button>
        </div>
      </BottomSheet>
      {sheets}
    </>
  );
}

function CatalogueAddition({ open, onClose, foods, onAdd }: { open: boolean; onClose: () => void; foods: readonly ShoppingCatalogueFood[]; onAdd: (item: ShoppingSource) => void }) {
  const [foodId, setFoodId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("יחידה");
  const food = foods.find((item) => item.id === foodId);
  const add = () => {
    const amount = Number(quantity.replace(",", "."));
    if (!food || !Number.isFinite(amount) || amount <= 0) return;
    onAdd({ name: food.brand ? `${food.name} — ${food.brand}` : food.name, displayQuantity: amount, measurementUnit: unit.trim() || "יחידה", itemRole: "primary", groupType: "other" });
    setFoodId(""); setQuantity("1"); setUnit("יחידה"); onClose();
  };
  return <BottomSheet open={open} title="הוספה ממאגר המזונות" onClose={onClose} placement="top">
    {!food ? <FoodCombobox foods={foods} value={foodId} usage={[]} clientCatalogueOrder onSelect={setFoodId} onClose={onClose} /> : <div className="grid gap-3">
      <p className="font-black">{food.brand ? `${food.name} — ${food.brand}` : food.name}</p>
      <label className="text-sm font-bold">כמות<input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" className="nutrition-input mt-2" /></label>
      <label className="text-sm font-bold">יחידה<input value={unit} onChange={(event) => setUnit(event.target.value)} className="nutrition-input mt-2" placeholder="יחידה / גרם / אריזה" /></label>
      <button type="button" onClick={add} className="premium-primary-button">הוספה לרשימה</button>
    </div>}
  </BottomSheet>;
}

function ManualAddition({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (item: ShoppingSource) => void }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("יחידה");
  const add = () => {
    const amount = Number(quantity.replace(",", "."));
    if (!name.trim() || !Number.isFinite(amount) || amount <= 0) return;
    onAdd({ name: name.trim(), displayQuantity: amount, measurementUnit: unit.trim() || "יחידה", itemRole: "primary", groupType: "other" });
    setName(""); setQuantity("1"); setUnit("יחידה"); onClose();
  };
  return <BottomSheet open={open} title="הוספה ידנית לרשימה" onClose={onClose}>
    <div className="grid gap-3">
      <label className="text-sm font-bold">שם הפריט<input value={name} onChange={(event) => setName(event.target.value)} className="nutrition-input mt-2" /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm font-bold">כמות<input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" className="nutrition-input mt-2" /></label>
        <label className="text-sm font-bold">יחידה<input value={unit} onChange={(event) => setUnit(event.target.value)} className="nutrition-input mt-2" /></label>
      </div>
      <button type="button" onClick={add} className="premium-primary-button">הוספה לרשימה</button>
    </div>
  </BottomSheet>;
}

function Group({
  lines,
  ticked,
  onToggle,
}: {
  lines: readonly { name: string; quantity: number; unit: string; alternativeOnly: boolean }[];
  ticked: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <ul className="mt-3 grid gap-1">
      {lines.map((line) => {
        const key = `${line.name} ${line.unit}`;
        const done = ticked.has(key);
        return (
          <li key={key}>
            {/* A checkbox, not a row that changes appearance when pressed.
                
                Struck-through text was the only sign an item had been picked up,
                which reads as "unavailable" at least as often as "got it", and
                in a supermarket the question is the opposite one: what is still
                missing. The circle answers that from across an aisle. */}
            <button
              type="button"
              onClick={() => onToggle(key)}
              role="checkbox"
              aria-checked={done}
              className="shopping-row"
              data-done={done || undefined}
            >
              <span aria-hidden="true" className="shopping-row__box">
                {done ? <Check size={14} strokeWidth={3} /> : null}
              </span>
              <span className="shopping-row__name">
                {line.name}
                {line.alternativeOnly ? <span className="shopping-row__swap">חלופה</span> : null}
              </span>
              <span className="shopping-row__amount">{line.quantity} {line.unit}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
