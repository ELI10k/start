"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Search } from "lucide-react";
import { duplicateCoachMealPlan } from "@/app/actions/product";

export type MenuSeed = Readonly<{
  id: string;
  title: string;
  calorieTarget: number | null;
  clientName: string | null;
  isSystemTemplate: boolean;
}>;

/**
 * Start a menu from one that already works.
 *
 * "Duplicate" existed, but only on a menu the coach had already found in a list
 * with no calorie figure on it - so the practical question, "give me my 1,800
 * base", had no answer except remembering which client it was built for. The
 * menus are ranked here by distance from the target being built, which is the
 * thing that actually decides whether a menu is a usable starting point.
 */
export default function StartFromExisting({ menus }: { menus: readonly MenuSeed[] }) {
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const ranked = useMemo(() => {
    const goal = Number(target);
    const term = query.trim();
    return [...menus]
      .filter((menu) => !term || menu.title.includes(term) || (menu.clientName ?? "").includes(term))
      .sort((a, b) => {
        if (!Number.isFinite(goal) || goal <= 0) return a.title.localeCompare(b.title, "he");
        // A menu with no target cannot be ranked by closeness, so it sorts last
        // rather than being treated as a perfect match at zero.
        const distance = (menu: MenuSeed) => (menu.calorieTarget ? Math.abs(menu.calorieTarget - goal) : Number.MAX_SAFE_INTEGER);
        return distance(a) - distance(b);
      })
      .slice(0, 8);
  }, [menus, query, target]);

  const start = (id: string) =>
    startTransition(async () => {
      setMessage("");
      const result = await duplicateCoachMealPlan(id);
      if (result.ok && result.id) router.push(`/coach/menus/${result.id}`);
      else setMessage(result.message ?? "לא ניתן היה לשכפל את התפריט.");
    });

  if (!menus.length) return null;

  return (
    <section className="rounded-[24px] border border-[#16A34A]/30 bg-[#F0FDF4] p-5">
      <h2 className="font-black">להתחיל מתפריט קיים</h2>
      <p className="mt-1 text-sm text-[#5B5F5B]">
        השכפול נפתח כטיוטה ללא שיוך ללקוח, כך שאפשר לשנות אותו בלי לגעת במקור.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {/* Deliberately not "יעד קלוריות": the editor below has a field by that
            name, and two controls whose labels contain the same phrase are
            ambiguous both to a screen reader and to anything looking one up. */}
        <label className="text-sm font-bold">
          כמה קלוריות ליום
          <input
            type="number"
            min="0"
            inputMode="numeric"
            className="nutrition-input mt-2"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="לדוגמה: 1800"
          />
        </label>
        <label className="text-sm font-bold">
          חיפוש
          <span className="food-picker__search mt-2">
            <Search aria-hidden="true" size={17} />
            <input
              className="nutrition-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="שם תפריט או לקוח"
            />
          </span>
        </label>
      </div>

      <ul className="mt-4 grid gap-2">
        {ranked.map((menu) => (
          <li key={menu.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() => start(menu.id)}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7E5] bg-[#FFFFFF] px-3 text-start disabled:opacity-50"
            >
              <span className="min-w-0">
                <strong className="block truncate">{menu.title}</strong>
                <span className="text-xs text-[#5B5F5B]">
                  {menu.isSystemTemplate ? "תבנית משותפת" : menu.clientName ?? "ללא שיוך"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="pill">{menu.calorieTarget ? `${menu.calorieTarget} קל׳` : "ללא יעד"}</span>
                <Copy aria-hidden="true" size={16} />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {message && <p role="alert" className="mt-3 text-sm text-[#DC2626]">{message}</p>}
    </section>
  );
}
