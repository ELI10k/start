"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ShoppingBasket } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import { buildShoppingList, shoppingListText, type ShoppingSource } from "@/lib/nutrition/shopping-list";

// The menu already lists every food and every quantity. Turning that into a
// shopping list is presentation, not a new engine - and it is the one thing a
// client has to do outside the app for the plan to be followable at all.
export default function ShoppingList({ items, title }: { items: readonly ShoppingSource[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());

  const lines = useMemo(() => buildShoppingList(items), [items]);
  const planned = lines.filter((line) => !line.alternativeOnly);
  const alternatives = lines.filter((line) => line.alternativeOnly);

  const toggle = (key: string) =>
    setTicked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

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

        <Group lines={planned} ticked={ticked} onToggle={toggle} />
        {alternatives.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-black">חלופות</h3>
            <p className="text-xs text-[#5B5F5B]">כדאי לקנות לפחות אחת מכל קבוצה, כדי שתהיה באמת בחירה.</p>
            <Group lines={alternatives} ticked={ticked} onToggle={toggle} />
          </>
        )}

        <div className="sheet__actions">
          <button type="button" onClick={copy} className="premium-primary-button">
            {copied ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}
            {copied ? "הועתק" : "העתקת הרשימה"}
          </button>
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
  lines: readonly { name: string; quantity: number; unit: string }[];
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
            <button
              type="button"
              onClick={() => onToggle(key)}
              aria-pressed={done}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7E5] px-3 text-start"
              style={done ? { opacity: 0.5, textDecoration: "line-through" } : undefined}
            >
              <span className="font-bold">{line.name}</span>
              <span className="text-sm text-[#5B5F5B]">{line.quantity} {line.unit}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
