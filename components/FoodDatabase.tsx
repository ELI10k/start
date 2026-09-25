"use client";
import { ArrowUp, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import type { Food, FoodSort } from "@/lib/foods";
import { queryFoods } from "@/lib/foods/repository";
import { ALL_SHELF, foodShelves, foodsOnShelf } from "@/lib/foods/shelves";
import { toggleFoodFavorite } from "@/app/actions/food-favorites";
import { foodMacroGroup, type MacroGroup } from "@/lib/nutrition/food-groups";
import { displayCalories } from "@/lib/nutrition/display";

type DisplayFood = Food & Readonly<{ usageCount?: number }>;

// The catalogue passed 800 products with the chains. Drawn at once on a phone
// that is a page hundreds of thousands of pixels tall, so it renders a page at
// a time; any change of filter starts again from the top.
const PAGE_SIZE = 60;

export default function FoodDatabase({
  foods,
  initialFavorites = [],
}: {
  foods: readonly DisplayFood[];
  initialFavorites?: readonly string[];
}) {
  const [search, setSearch] = useState("");
  const [shelf, setShelf] = useState(ALL_SHELF);
  const [sort, setSort] = useState<FoodSort>("calories-low");
  const deferredSearch = useDeferredValue(search);
  const [favorites, setFavorites] = useState(() => new Set(initialFavorites));
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [limitKey, setLimitKey] = useState("");
  const filterKey = `${deferredSearch}|${shelf}|${sort}|${favoriteOnly}`;
  if (filterKey !== limitKey) {
    setLimitKey(filterKey);
    setLimit(PAGE_SIZE);
  }
  const [, startTransition] = useTransition();
  const classifiable = useMemo(
    () =>
      foods.map((food) => ({
        ...food,
        protein: food.protein ?? null,
        carbs: food.carbs ?? null,
        fat: food.fat ?? null,
      })),
    [foods],
  );
  const shelves = useMemo(() => foodShelves(classifiable), [classifiable]);
  const onShelf = useMemo(
    () => new Set(foodsOnShelf(classifiable, shelf).map((food) => food.id)),
    [classifiable, shelf],
  );
  const visible = useMemo(() => {
    const queried = queryFoods(foods, { search: deferredSearch, sort }).filter(
      (food) => onShelf.has(food.id),
    );
    return favoriteOnly
      ? queried.filter((food) => favorites.has(food.id))
      : queried;
  }, [foods, deferredSearch, onShelf, sort, favoriteOnly, favorites]);
  const favoriteGroups = useMemo(() => {
    const groups: Record<MacroGroup, Food[]> = {
      protein: [],
      carbohydrate: [],
      fat: [],
    };
    for (const food of visible)
      groups[
        foodMacroGroup({
          ...food,
          protein: food.protein ?? null,
          carbs: food.carbs ?? null,
          fat: food.fat ?? null,
        })
      ].push(food);
    return groups;
  }, [visible]);
  const clear = () => {
    setSearch("");
    setShelf(ALL_SHELF);
    setSort("calories-low");
    setFavoriteOnly(false);
  };
  const toggle = (foodId: string) => {
    const was = favorites.has(foodId);
    setFavorites((current) => {
      const next = new Set(current);
      if (was) next.delete(foodId);
      else next.add(foodId);
      return next;
    });
    startTransition(async () => {
      try {
        const result = await toggleFoodFavorite(foodId, !was);
        setFavorites((current) => {
          const next = new Set(current);
          if (result.favorite) next.add(foodId);
          else next.delete(foodId);
          return next;
        });
      } catch {
        setFavorites((current) => {
          const next = new Set(current);
          if (was) next.add(foodId);
          else next.delete(foodId);
          return next;
        });
      }
    });
  };
  return (
    <section className="food-database" aria-busy={search !== deferredSearch}>
      <header className="food-database__header">
        <div>
          <span className="food-database__eyebrow">START LIFE FIT FOOD DATABASE</span>
          <h1 className="food-database__title">מאגר מזונות</h1>
          <p className="food-database__description">
            חיפוש לפי שם, מותג, קטגוריה או ברקוד
          </p>
          <p className="mt-3 text-xs text-[#5B5F5B]">
            {foods.length} מוצרים מהמאגר הרשמי
          </p>
        </div>
        <div className="food-database__count">
          <strong>{visible.length}</strong>
          <span>תוצאות</span>
        </div>
      </header>
      <div className="grid gap-3 rounded-[22px] border border-[#E5E7E5] bg-[#FFFFFF] p-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative">
          <span className="sr-only">חיפוש מזונות</span>
          <Search className="absolute right-4 top-4 text-[#16A34A]" size={18} />
          <input
            className="nutrition-input pr-11"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש מזון..."
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="ניקוי חיפוש"
              className="absolute left-3 top-3 rounded-xl p-2 text-[#5B5F5B] hover:text-[#0B0B0B]"
            >
              <X size={18} />
            </button>
          )}
        </label>
        <label className="flex items-center gap-2 text-xs text-[#5B5F5B]">
          <SlidersHorizontal size={17} />
          מיון
          <select
            className="nutrition-input"
            value={sort}
            onChange={(event) => setSort(event.target.value as FoodSort)}
          >
            <option value="relevant">רלוונטיות</option>
            <option value="protein-high">חלבון: גבוה לנמוך</option>
            <option value="calories-low">קלוריות: נמוך לגבוה</option>
            <option value="calories-high">קלוריות: גבוה לנמוך</option>
            <option value="alphabetical">א׳–ת׳</option>
          </select>
        </label>
      </div>
      <div className="food-categories" aria-label="סינון לפי קטגוריה">
        <button
          type="button"
          aria-pressed={shelf === ALL_SHELF && !favoriteOnly}
          className={
            shelf === ALL_SHELF && !favoriteOnly
              ? "food-category active"
              : "food-category"
          }
          onClick={() => {
            setShelf(ALL_SHELF);
            setFavoriteOnly(false);
          }}
        >
          הכול
        </button>
        <button
          type="button"
          aria-pressed={favoriteOnly}
          className={favoriteOnly ? "food-category active" : "food-category"}
          onClick={() => setFavoriteOnly((value) => !value)}
        >
          <Star size={15} fill={favoriteOnly ? "currentColor" : "none"} />
          מועדפים
        </button>
        {shelves.filter((item) => item.key !== ALL_SHELF).map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={shelf === item.key}
            className={
              shelf === item.key ? "food-category active" : "food-category"
            }
            onClick={() => setShelf(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {visible.length ? (
        favoriteOnly ? (
          <div className="space-y-8">
            {(["protein", "carbohydrate", "fat"] as const).map((group) =>
              favoriteGroups[group].length ? (
                <section key={group}>
                  <h2 className="mb-3 text-xl font-black">
                    {group === "protein"
                      ? "חלבונים"
                      : group === "carbohydrate"
                        ? "פחמימות"
                        : "שומנים"}
                  </h2>
                  <div className="food-list">
                    {favoriteGroups[group].map((food) => (
                      <FoodCard
                        key={food.id}
                        food={food}
                        favorite
                        onToggle={() => toggle(food.id)}
                      />
                    ))}
                  </div>
                </section>
              ) : null,
            )}
          </div>
        ) : (
          <>
            <div className="food-list">
              {visible.slice(0, limit).map((food) => (
                <FoodCard
                  key={food.id}
                  food={food}
                  favorite={favorites.has(food.id)}
                  onToggle={() => toggle(food.id)}
                />
              ))}
            </div>
            {visible.length > limit && (
              <button
                type="button"
                className="premium-secondary-button mx-auto mt-6 flex"
                onClick={() => setLimit((value) => value + PAGE_SIZE)}
              >
                הצגת עוד ({visible.length - limit})
              </button>
            )}
          </>
        )
      ) : (
        <div className="food-empty-state">
          <Search className="mx-auto mb-3 text-[#3F433F]" size={38} />
          <h2>לא נמצאו מוצרים</h2>
          <p>אפשר לנסות שם, מותג, ברקוד או קטגוריה אחרים.</p>
          <button type="button" onClick={clear}>
            ניקוי הסינונים
          </button>
        </div>
      )}
      <BackToTop />
    </section>
  );
}

// Hundreds of products deep, the filters are a long scroll away. The button
// only appears once there is something to come back from.
function BackToTop() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 800);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!shown) return null;
  return (
    <button
      type="button"
      className="food-to-top"
      aria-label="חזרה לראש הרשימה"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}
export function FoodCard({
  food,
  favorite = false,
  onToggle,
}: {
  food: DisplayFood;
  favorite?: boolean;
  onToggle?: () => void;
}) {
  return (
    <article className="food-card">
      <div className="food-card__top">
        <div>
          <span className="food-card__category">{food.category}</span>
          <h2 className="food-card__name">{food.name}</h2>
          {food.brand && <p className="food-card__brand">{food.brand}</p>}
          {typeof food.usageCount === "number" && <p className="mt-1 text-xs text-[#5B5F5B]">נבחר לתפריטים {food.usageCount} פעמים</p>}
        </div>
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onToggle}
            aria-label={
              favorite
                ? `הסרת ${food.name} מהמועדפים`
                : `הוספת ${food.name} למועדפים`
            }
            aria-pressed={favorite}
            className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full border ${favorite ? "border-[#16A34A] bg-[#ECFDF3] text-[#16A34A]" : "border-[#D9DDD9] bg-white text-[#5B5F5B]"}`}
          >
            <Star size={20} fill={favorite ? "currentColor" : "none"} />
          </button>
          <div className="min-w-24 rounded-2xl border border-[#B7E4C7] bg-[#ECFDF3] px-4 py-3 text-center text-[#15803D]">
            <strong className="block text-2xl leading-none">
              {displayCalories(food.calories)}
            </strong>
            <span className="mt-1 block text-xs">קלוריות</span>
          </div>
        </div>
      </div>
      <div className="food-card__macros">
        <Macro label="חלבון" value={food.protein} />
        <Macro label="פחמימה" value={food.carbs} />
        <Macro label="שומן" value={food.fat} />
      </div>
      <div className="food-card__footer">
        <span>{food.servingLabel}</span>
      </div>
    </article>
  );
}
function Macro({ label, value }: { label: string; value?: number }) {
  return (
    <div className="food-macro">
      <span>{label}</span>
      <strong>{value === undefined ? "—" : `${value} גרם`}</strong>
    </div>
  );
}
