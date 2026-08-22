"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ShoppingBasket } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import { buildShoppingList, shoppingListText, SHOPPING_CATEGORIES, type ShoppingSource } from "@/lib/nutrition/shopping-list";

// The menu already lists every food and every quantity. Turning that into a
// shopping list is presentation, not a new engine - and it is the one thing a
// client has to do outside the app for the plan to be followable at all.
export default function ShoppingList({
  items,
  title,
  // `inline` renders the list as the screen rather than behind a button: the
  // shopping list has its own tab now, and a screen whose only content is a
  // button that opens the content is a screen with an extra tap in it.
  inline = false,
}: { items: readonly ShoppingSource[]; title: string; inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Kept across a route change, and only for this menu.
  //
  // The ticks were component state, so glancing at a meal and coming back
  // emptied the basket - which is the one thing a shopping list must not do
  // while its owner is still in the shop. A new menu gets a new key, so last
  // week's ticks never appear against this week's list.
  const storageKey = `start.shopping.${title}`;
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  // Read after mount, not in a lazy initialiser: this component renders on the
  // server too, where localStorage does not exist, and seeding state from it
  // during render is the hydration mismatch that causes.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setTicked(new Set(JSON.parse(stored) as string[]));
    } catch { /* a browser that refuses storage still gets a working list */ }
  }, [storageKey]);

  const lines = useMemo(() => buildShoppingList(items), [items]);
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

  if (!lines.length) return null;

  // By aisle. A supermarket is laid out in food groups and so is the menu these
  // lines came from, so walking the list is walking the shop - instead of the
  // alphabetical sweep that sent a client back to the fridges four times.
  const body = (
    <>
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
      <p className="mt-3 text-xs text-[#5B5F5B]">
        פריט מסומן כחלופה הוא בחירה אפשרית ולא חובה — כדאי לקנות לפחות אחת מכל קבוצה, כדי שתהיה באמת בחירה.
      </p>
    </>
  );
  const copyButton = (
    <button type="button" onClick={copy} className="premium-primary-button">
      {copied ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}
      {copied ? "הועתק" : "העתקת הרשימה"}
    </button>
  );

  const done = lines.filter((line) => ticked.has(`${line.name} ${line.unit}`)).length;

  if (inline) return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[#5B5F5B]">נאספו {done} מתוך {lines.length}</p>
        {done ? <button type="button" onClick={clear} className="chip">ניקוי הסימונים</button> : null}
      </div>
      {body}
      <div className="mt-2">{copyButton}</div>
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
    </>
  );
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
