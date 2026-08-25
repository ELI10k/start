"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { Barcode, Camera, Database, Images, PencilLine } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import CameraScan from "@/components/client/CameraScan";
import SubmitButton from "@/components/forms/SubmitButton";
import { logClientFood, type FoodLogState } from "@/app/actions/food-log";
import { normalizeBarcode } from "@/lib/nutrition/open-food-facts";
import { replaceInputFile, shrinkImage } from "@/lib/images/shrink";
import FoodCombobox, { type ComboboxFood } from "@/components/coach/menus/FoodCombobox";
import { calculateFoodNutrition } from "@/lib/meal-plans/calculations";

/** The database rows this sheet needs: enough to search by and enough to count. */
export type PickableFood = ComboboxFood & {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

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
 * A barcode or catalogue item carries deterministic figures. Text and photos
 * are estimated on the server and clearly labelled as such, so every honest
 * entry contributes to the day without pretending an estimate is a label.
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
  // Empty until the screen has loaded the catalogue; the tab hides itself rather
  // than offering a search with nothing behind it.
  foods = [],
  unmeasuredNote = "ה־AI יעריך קלוריות ואבות מזון לפי התיאור או התמונה, והערכים יתווספו לסיכום של היום.",
}: {
  mealId: string;
  date: string;
  open: boolean;
  onClose: () => void;
  title?: string;
  unmeasuredNote?: string;
  foods?: readonly PickableFood[];
}) {
  const [tab, setTab] = useState<"text" | "food" | "scan" | "photo">("text");
  // Shares the barcode tab's gram field: it is the same question, asked once.
  const [pickedId, setPickedId] = useState("");
  const [code, setCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState<Scanned | null>(null);
  const [miss, setMiss] = useState("");
  const [grams, setGrams] = useState("100");
  // Whether a chosen photograph is still being downscaled.
  const [preparing, setPreparing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const cameraPhoto = useRef<HTMLInputElement>(null);
  const galleryPhoto = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // A successful entry is one item, not the end of the meal. Leave the sheet
  // open but return every input to a clean state so the next barcode cannot
  // inherit the previous product, weight or photograph.
  const [state, action] = useActionState(async(previous:FoodLogState,form:FormData)=>{const result=await logClientFood(previous,form);if(result.ok){formRef.current?.reset();setCode("");setFound(null);setMiss("");setPickedId("");setGrams("100");setPhotoPreview((current)=>{if(current)URL.revokeObjectURL(current);return""})}return result},initial);

  const preparePhoto = async (input: HTMLInputElement) => {
    const chosen = input.files?.[0];
    if (!chosen) return;
    setPreparing(true);
    const prepared = await shrinkImage(chosen);
    if (prepared !== chosen) replaceInputFile(input, prepared);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(prepared));
    setPreparing(false);
  };

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

  const close = () => { if(photoPreview)URL.revokeObjectURL(photoPreview);setPhotoPreview("");setFound(null); setMiss(""); setCode(""); onClose(); };

  return (
    <BottomSheet open={open} title={title} onClose={close}>
      <div className="chip-row">
        <button type="button" onClick={() => setTab("text")} aria-pressed={tab === "text"} className={`chip${tab === "text" ? " pill--green" : ""}`}>
          <PencilLine aria-hidden="true" size={15} />תיאור
        </button>
        <button type="button" onClick={() => setTab("scan")} aria-pressed={tab === "scan"} className={`chip${tab === "scan" ? " pill--green" : ""}`}>
          <Barcode aria-hidden="true" size={15} />ברקוד
        </button>
        {foods.length ? (
          <button type="button" onClick={() => setTab("food")} aria-pressed={tab === "food"} className={`chip${tab === "food" ? " pill--green" : ""}`}>
            <Database aria-hidden="true" size={15} />מהמאגר
          </button>
        ) : null}
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

      <form ref={formRef} action={action} className="mt-4 grid gap-3">
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="mealId" value={mealId} />
        {/* The catalogue reports itself as "scan".
            
            The database's own check accepts text, scan or photo, so a fourth
            name would be refused at the last step - which is exactly what
            happened: everything computed correctly and then the save came back
            "סוג הרישום אינו מוכר". Of the three it is a scan: an identified
            food carrying approved figures, differing from a barcode only in how
            it was found. Giving it a name of its own needs a migration, and is
            not worth breaking the save over. */}
        <input type="hidden" name="source" value={tab === "food" ? "scan" : tab} />

        {tab === "text" && (
          <label className="text-sm font-bold">תיאור קצר
            <input name="name" required maxLength={200} className="nutrition-input mt-2" placeholder="לדוגמה: חביתה משתי ביצים ופרוסת לחם" />
          </label>
        )}

        {tab === "scan" && found && (
          <>
            <input type="hidden" name="name" value={found.brand ? `${found.name} — ${found.brand}` : found.name} />
            <input type="hidden" name="unit" value="גרם" />
            <p className="sheet__product-name font-bold">{found.name}{found.brand ? ` — ${found.brand}` : ""}</p>
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

        {/* The catalogue, with a weight - the one path here that produces numbers
            without a barcode.
            
            Most of what a client eats instead is an ordinary food that is
            already in the database with
            approved figures beside it; all that was missing was a way to say
            which one and how much of it. Same arithmetic the menu builder uses,
            so the coach's screen and this one cannot disagree about a portion. */}
        {tab === "food" && (() => {
          const picked = foods.find((food) => food.id === pickedId) ?? null;
          const weight = Number(grams);
          const macros = picked && Number.isFinite(weight) && weight > 0
            ? calculateFoodNutrition({
                calories: picked.calories ?? 0,
                protein: picked.protein ?? 0,
                carbs: picked.carbs ?? 0,
                fat: picked.fat ?? 0,
              }, weight)
            : null;
          return (
            <>
              {/* The catalogue is the whole panel until something is chosen, and
                  then it gets out of the way: a list still open under the
                  answer invites a second answer over the first. */}
              {picked ? null : (
                <FoodCombobox foods={foods} value={pickedId} usage={[]} onSelect={(id) => setPickedId(id)} />
              )}
              {picked ? (
                <>
                <p className="font-bold">{picked.brand ? `${picked.name} — ${picked.brand}` : picked.name}</p>
                </>
              ) : null}
              {picked ? (
                <>
                  <input type="hidden" name="name" value={picked.brand ? `${picked.name} — ${picked.brand}` : picked.name} />
                  <input type="hidden" name="unit" value="גרם" />
                  <label className="text-sm font-bold">כמה גרם אכלת?
                    <input name="quantity" type="number" min="1" step="any" value={grams} onChange={(event) => setGrams(event.target.value)} className="nutrition-input mt-2" />
                  </label>
                  {macros ? (
                    <>
                      <input type="hidden" name="calories" value={macros.calories} />
                      <input type="hidden" name="protein" value={macros.protein} />
                      <input type="hidden" name="carbs" value={macros.carbs} />
                      <input type="hidden" name="fat" value={macros.fat} />
                      <dl className="compact-data-list">
                        <div><span>קלוריות</span><strong>{macros.calories}</strong></div>
                        <div><span>חלבון</span><strong>{macros.protein}</strong></div>
                        <div><span>פחמימות</span><strong>{macros.carbs}</strong></div>
                        <div><span>שומן</span><strong>{macros.fat}</strong></div>
                      </dl>
                      <p className="text-xs text-[#5B5F5B]">הערכים האלה כן ייספרו ביום שלך.</p>
                    </>
                  ) : (
                    <p className="text-xs text-[#5B5F5B]">יש להזין כמות כדי לחשב את הערכים.</p>
                  )}
                  <button type="button" onClick={() => setPickedId("")} className="chip w-fit">מזון אחר</button>
                </>
              ) : null}
            </>
          );
        })()}

        {tab === "photo" && (
          <>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-bold">תמונה של הארוחה</legend>
              <input
                ref={cameraPhoto}
                name="cameraPhoto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="sr-only"
                onChange={(event) => void preparePhoto(event.currentTarget)}
              />
              <input
                ref={galleryPhoto}
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => void preparePhoto(event.currentTarget)}
              />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => cameraPhoto.current?.click()} className="premium-secondary-button">
                  <Camera aria-hidden="true" size={17} />פתיחת מצלמה
                </button>
                <button type="button" onClick={() => galleryPhoto.current?.click()} className="premium-secondary-button">
                  <Images aria-hidden="true" size={17} />בחירה מהגלריה
                </button>
              </div>
            </fieldset>
            {preparing && <p role="status" className="text-xs text-[#5B5F5B]">מכינים את התמונה…</p>}
            {photoPreview && !preparing ? (
              <div className="overflow-hidden rounded-2xl border border-[#16A34A] bg-[#ECFDF3] p-2">
                <Image src={photoPreview} alt="התמונה שנבחרה לניתוח" width={640} height={420} unoptimized className="max-h-72 w-full rounded-xl object-contain" />
                <p role="status" className="mt-2 text-center text-sm font-bold text-[#15803D]">התמונה צורפה ותישלח לחישוב</p>
              </div>
            ) : null}
            <label className="text-sm font-bold">תיאור <span className="font-normal text-[#5B5F5B]">(רשות)</span>
              <input name="name" maxLength={200} className="nutrition-input mt-2" placeholder="מה יש בצלחת" />
            </label>
          </>
        )}

        {(tab === "text" || tab === "photo") && <p className="text-xs text-[#5B5F5B]">{unmeasuredNote}</p>}

        {state.message && (
          <p role={state.ok ? "status" : "alert"} className={`rounded-2xl p-3 text-sm font-bold ${state.ok ? "bg-[#ECFDF3] text-[#15803D]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>{state.message}</p>
        )}

        {/* Nothing to save until a food is chosen, and the sticky bar was sitting
            on top of the results while the client was still scrolling them. */}
        <div className="sheet__actions" hidden={tab === "food" && !pickedId}>
          <SubmitButton
            idle="שמירה"
            pending={tab === "text" || tab === "photo" ? "מחשבים ושומרים…" : "שומרים…"}
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
