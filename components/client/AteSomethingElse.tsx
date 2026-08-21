"use client";

import { useActionState, useState } from "react";
import { Camera, PencilLine, Barcode } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import CameraScan from "@/components/client/CameraScan";
import SubmitButton from "@/components/forms/SubmitButton";
import { logClientFood, type FoodLogState } from "@/app/actions/food-log";
import { normalizeBarcode } from "@/lib/nutrition/open-food-facts";
import { replaceInputFile, shrinkImage } from "@/lib/images/shrink";

const initial: FoodLogState = { ok: false };

type Scanned = Readonly<{
  name: string; brand: string | null;
  calories: number; protein: number | null; carbs: number | null; fat: number | null;
  // What the package weighs, when the catalogue knows. The lookup has always
  // returned it and this sheet has always thrown it away, so the client was
  // asked to weigh a yoghurt they had just scanned.
  unitWeightGrams?: number | null;
  servingLabel?: string | null;
}>;

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * "I ate something else" - in whichever of three ways is true.
 *
 * A sentence is the fastest and carries no figures. A barcode carries the
 * catalog's own figures, scaled to the amount actually eaten, and is the only
 * one of the three that can put calories back into the day. A photograph
 * carries no figures either and tells a coach more in two seconds than a
 * paragraph does.
 *
 * None of them touch the plan. The meal is marked eaten-something-else and this
 * is what was eaten instead.
 */
export default function AteSomethingElse({
  mealId,
  date,
  open,
  onClose,
  // A free-calorie window is not a substitution - filling it IS the plan - and
  // the sheet asked "what did you eat instead?" of a meal that never prescribed
  // anything. Same three ways in, different sentence around them.
  title = "מה אכלת במקום?",
  unmeasuredNote = "הארוחה לא תיספר בקלוריות של היום — אין דרך לגזור אותן מתיאור או מתמונה. המאמן יראה בדיוק מה אכלת, וזה עוזר לו הרבה יותר מ״לא נאכל״.",
}: {
  mealId: string;
  date: string;
  open: boolean;
  onClose: () => void;
  title?: string;
  unmeasuredNote?: string;
}) {
  const [tab, setTab] = useState<"text" | "scan" | "photo">("text");
  const [state, action] = useActionState(logClientFood, initial);
  const [code, setCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState<Scanned | null>(null);
  const [miss, setMiss] = useState("");
  const [grams, setGrams] = useState("100");
  // Whether a chosen photograph is still being downscaled.
  const [preparing, setPreparing] = useState(false);

  const lookupFor = async (raw: string) => {
    const barcode = normalizeBarcode(raw);
    if (!barcode) { setMiss("ברקוד מוצר הוא 8, 12 או 13 ספרות."); return; }
    setLooking(true); setMiss(""); setFound(null);
    try {
      const response = await fetch(`/api/foods/barcode/${barcode}`);
      const payload = await response.json();
      if (payload.found) {
        const food = payload.food as Scanned;
        setFound(food);
        // Start on the package where there is one. It is the answer more often
        // than any other, and it is still one tap to change.
        if (food.unitWeightGrams && food.unitWeightGrams > 0) setGrams(String(Math.round(food.unitWeightGrams)));
      }
      else setMiss("המוצר לא נמצא. אפשר לתאר אותו במילים או לצלם אותו.");
    } catch {
      setMiss("החיפוש נכשל. אפשר לתאר במילים או לצלם.");
    } finally {
      setLooking(false);
    }
  };

  const lookup = () => lookupFor(code);

  // The catalog's figures are per 100 grams; this is the portion actually eaten.
  const factor = (Number(grams) || 0) / 100;
  const macros = found && factor > 0 ? {
    calories: round(found.calories * factor),
    protein: found.protein === null ? null : round(found.protein * factor),
    carbs: found.carbs === null ? null : round(found.carbs * factor),
    fat: found.fat === null ? null : round(found.fat * factor),
  } : null;

  const close = () => { setFound(null); setMiss(""); setCode(""); onClose(); };

  return (
    <BottomSheet open={open} title={title} onClose={close}>
      <div className="chip-row">
        <button type="button" onClick={() => setTab("text")} aria-pressed={tab === "text"} className={`chip${tab === "text" ? " pill--green" : ""}`}>
          <PencilLine aria-hidden="true" size={15} />תיאור
        </button>
        <button type="button" onClick={() => setTab("scan")} aria-pressed={tab === "scan"} className={`chip${tab === "scan" ? " pill--green" : ""}`}>
          <Barcode aria-hidden="true" size={15} />ברקוד
        </button>
        <button type="button" onClick={() => setTab("photo")} aria-pressed={tab === "photo"} className={`chip${tab === "photo" ? " pill--green" : ""}`}>
          <Camera aria-hidden="true" size={15} />צילום
        </button>
      </div>

      {tab === "scan" && !found && (
        <div className="mt-4 grid gap-2">
          <label className="text-sm font-bold">ברקוד המוצר
            <input inputMode="numeric" dir="ltr" value={code} onChange={(event) => setCode(event.target.value)} className="nutrition-input mt-2" placeholder="7290000066318" />
          </label>
          <button type="button" onClick={lookup} disabled={looking || !code.trim()} className="premium-secondary-button">
            {looking ? "מחפשים…" : code.trim() ? "חיפוש מוצר" : "סרקו או הקלידו ברקוד"}
          </button>
          {/* Reading thirteen digits off a curved bottle and typing them in is
              not a feature. The camera is the way in; the field is the fallback. */}
          <CameraScan onDetected={(value) => { setCode(value); void lookupFor(value); }} />
          {miss && <p role="status" className="rounded-2xl bg-[#F7F8F7] p-3 text-sm">{miss}</p>}
        </div>
      )}

      <form action={action} className="mt-4 grid gap-3">
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="mealId" value={mealId} />
        <input type="hidden" name="source" value={tab} />

        {tab === "text" && (
          <label className="text-sm font-bold">תיאור קצר
            <input name="name" required maxLength={200} className="nutrition-input mt-2" placeholder="לדוגמה: חביתה משתי ביצים ופרוסת לחם" />
          </label>
        )}

        {tab === "scan" && found && (
          <>
            <input type="hidden" name="name" value={found.brand ? `${found.name} — ${found.brand}` : found.name} />
            <input type="hidden" name="unit" value="גרם" />
            <p className="font-bold">{found.name}{found.brand ? ` — ${found.brand}` : ""}</p>
            {/* The common answers first, typing second. A barcode identifies a
                package, and "the whole thing" is what happened to it most of the
                time - so asking for a number in grams before offering that is
                asking the client to weigh something they have already eaten. */}
            {(() => {
              const pack = found.unitWeightGrams && found.unitWeightGrams > 0 ? Math.round(found.unitWeightGrams) : null;
              const presets = [
                ...(pack ? [
                  { label: `אריזה שלמה · ${pack} ג׳`, value: String(pack) },
                  { label: `חצי אריזה · ${Math.round(pack / 2)} ג׳`, value: String(Math.round(pack / 2)) },
                ] : []),
                { label: "100 גרם", value: "100" },
              ];
              return (
                <div className="chip-row">
                  {presets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setGrams(preset.value)}
                      aria-pressed={grams === preset.value}
                      className={`chip${grams === preset.value ? " pill--green" : ""}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              );
            })()}
            <label className="text-sm font-bold">כמה גרם אכלת?
              <input name="quantity" type="number" min="1" step="any" value={grams} onChange={(event) => setGrams(event.target.value)} className="nutrition-input mt-2" />
            </label>
            {macros && (
              <>
                <input type="hidden" name="calories" value={macros.calories} />
                <input type="hidden" name="protein" value={macros.protein ?? ""} />
                <input type="hidden" name="carbs" value={macros.carbs ?? ""} />
                <input type="hidden" name="fat" value={macros.fat ?? ""} />
                <dl className="compact-data-list">
                  <div><span>קלוריות</span><strong>{macros.calories}</strong></div>
                  <div><span>חלבון</span><strong>{macros.protein ?? "—"}</strong></div>
                  <div><span>פחמימות</span><strong>{macros.carbs ?? "—"}</strong></div>
                  <div><span>שומן</span><strong>{macros.fat ?? "—"}</strong></div>
                </dl>
                <p className="text-xs text-[#5B5F5B]">הערכים האלה כן ייספרו ביום שלך.</p>
              </>
            )}
            <button type="button" onClick={() => setFound(null)} className="chip w-fit">מוצר אחר</button>
          </>
        )}

        {tab === "photo" && (
          <>
            <label className="text-sm font-bold">תמונה של הארוחה
              {/* Downscaled here, before it is uploaded. This path accepts a
                  photograph per meal with no cadence limit, and it was sending
                  whatever the camera produced - up to 5MB a picture, which is
                  ten times what the same photograph is worth to a coach. */}
              <input
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                required
                className="nutrition-input mt-2"
                onChange={async (event) => {
                  const input = event.target;
                  const chosen = input.files?.[0];
                  if (!chosen) return;
                  setPreparing(true);
                  const prepared = await shrinkImage(chosen);
                  if (prepared !== chosen) replaceInputFile(input, prepared);
                  setPreparing(false);
                }}
              />
            </label>
            {preparing && <p role="status" className="text-xs text-[#5B5F5B]">מכינים את התמונה…</p>}
            <label className="text-sm font-bold">תיאור <span className="font-normal text-[#5B5F5B]">(רשות)</span>
              <input name="name" maxLength={200} className="nutrition-input mt-2" placeholder="מה יש בצלחת" />
            </label>
          </>
        )}

        {tab !== "scan" && <p className="text-xs text-[#5B5F5B]">{unmeasuredNote}</p>}

        {state.message && (
          <p role={state.ok ? "status" : "alert"} className={`rounded-2xl p-3 text-sm font-bold ${state.ok ? "bg-[#ECFDF3] text-[#15803D]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>{state.message}</p>
        )}

        <div className="sheet__actions">
          <SubmitButton
            idle="שמירה"
            pending="שומרים…"
            className="premium-primary-button w-full"
            event="meal_marked"
            eventProperties={{ status: "other", via: tab }}
          />
          <button type="button" onClick={close} className="premium-secondary-button">סגירה</button>
        </div>
      </form>
    </BottomSheet>
  );
}
