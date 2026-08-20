"use client";

import { useActionState, useEffect, useState } from "react";
import { Barcode, Search } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import CameraScan from "@/components/client/CameraScan";
import SubmitButton from "@/components/forms/SubmitButton";
import { saveScannedFood, type ScanState } from "@/app/actions/scanned-food";
import { normalizeBarcode } from "@/lib/nutrition/open-food-facts";
import { track } from "@/lib/analytics/client";
import { describeError } from "@/lib/analytics/events";

type Found = Readonly<{
  barcode: string;
  name: string;
  brand: string | null;
  servingLabel: string;
  packageUnit: string | null;
  unitWeightGrams: number | null;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  source: string;
  sourceUrl: string | null;
}>;

const initial: ScanState = { ok: false };

// BarcodeDetector is Chromium-only. On iOS Safari - and therefore on every
// iPhone - it does not exist, and the camera button used to be hidden behind it:
// the whole feature on an iPhone was a field to type thirteen digits into. ZXing
// decodes the same formats in JavaScript and is loaded only when the camera is
// actually opened, so nothing is added to the bundle for the browsers that have
// the native detector.

export default function BarcodeScanner({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [miss, setMiss] = useState<string>("");
  const [state, action] = useActionState(saveScannedFood, initial);

  const close = () => {
    setOpen(false);
    setFound(null);
    setMiss("");
    setCode("");
  };

  const lookup = async (raw: string) => {
    const barcode = normalizeBarcode(raw);
    if (!barcode) {
      setMiss("הברקוד אינו תקין. ברקוד מוצר הוא 8, 12 או 13 ספרות.");
      return;
    }
    setLooking(true);
    setMiss("");
    setFound(null);
    try {
      const response = await fetch(`/api/foods/barcode/${barcode}`);
      const payload = await response.json();
      // Whether the lookup hit, never which product it was.
      track("barcode_scanned", { found: Boolean(payload.found), reason: String(payload.reason ?? "ok").slice(0, 32) });
      if (payload.found) setFound(payload.food as Found);
      else setMiss(payload.reason === "lookup_unavailable"
        ? "מאגר המוצרים אינו זמין כרגע. אפשר להוסיף את המזון ידנית."
        : "המוצר לא נמצא. אפשר להוסיף אותו ידנית — הוא יישמר לפעם הבאה.");
    } catch (error) {
      track("error", describeError(error, "barcode-lookup"));
      setMiss("החיפוש נכשל. אפשר להוסיף את המזון ידנית.");
    } finally {
      setLooking(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="app-list w-full text-start">
        <span className="app-list__icon"><Barcode aria-hidden="true" size={17} /></span>
        <span className="app-list__main"><strong>סריקת ברקוד</strong><span>הוספת מוצר לפי הברקוד שלו</span></span>
      </button>

      <BottomSheet open={open} title="סריקת ברקוד" onClose={close}>
        {!found && (
          <>
            <label className="block text-sm font-bold">ברקוד
              <input
                inputMode="numeric"
                autoComplete="off"
                className="nutrition-input mt-2"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="7290000066318"
                dir="ltr"
              />
            </label>
            <div className="mt-3 grid gap-2">
              <button type="button" onClick={() => lookup(code)} disabled={looking || !code.trim()} className="premium-primary-button">
                <Search aria-hidden="true" size={17} />{looking ? "מחפשים…" : "חיפוש מוצר"}
              </button>
              <CameraScan onDetected={(value) => { setCode(value); lookup(value); }} />
            </div>
            {miss && (
              <div className="mt-4">
                <p role="status" className="rounded-2xl bg-[#F7F8F7] p-3 text-sm">{miss}</p>
                <ManualForm date={date} barcode={code} action={action} state={state} onSaved={close} />
              </div>
            )}
          </>
        )}

        {found && (
          <>
            <article className="premium-card">
              <strong className="block text-lg">{found.name}</strong>
              {found.brand && <span className="text-sm text-[#5B5F5B]">{found.brand}</span>}
              <dl className="compact-data-list mt-3">
                <div><span>קלוריות ל-100 גרם</span><strong>{found.calories}</strong></div>
                <div><span>חלבון</span><strong>{found.protein ?? "—"}</strong></div>
                <div><span>פחמימות</span><strong>{found.carbs ?? "—"}</strong></div>
                <div><span>שומן</span><strong>{found.fat ?? "—"}</strong></div>
              </dl>
              <p className="mt-3 text-xs text-[#5B5F5B]">
                מקור: {found.source === "start" ? "מאגר START" : found.source === "manual" ? "הוזן ידנית" : "Open Food Facts"}
              </p>
            </article>

            <form action={action} className="sheet__actions">
              <input type="hidden" name="barcode" value={found.barcode} />
              <input type="hidden" name="name" value={found.name} />
              <input type="hidden" name="brand" value={found.brand ?? ""} />
              <input type="hidden" name="servingLabel" value={found.servingLabel} />
              <input type="hidden" name="packageUnit" value={found.packageUnit ?? "גרם"} />
              <input type="hidden" name="unitWeightGrams" value={found.unitWeightGrams ?? ""} />
              <input type="hidden" name="calories" value={found.calories} />
              <input type="hidden" name="protein" value={found.protein ?? ""} />
              <input type="hidden" name="carbs" value={found.carbs ?? ""} />
              <input type="hidden" name="fat" value={found.fat ?? ""} />
              <input type="hidden" name="sourceUrl" value={found.sourceUrl ?? ""} />
              <input type="hidden" name="source" value={found.source === "start" ? "manual" : "openfoodfacts"} />
              <SubmitButton idle="שמירה במאגר שלי" pending="שומרים…" className="premium-primary-button" />
              <button type="button" onClick={() => setFound(null)} className="premium-secondary-button">סריקה אחרת</button>
            </form>
            {state.message && (
              <p role={state.ok ? "status" : "alert"} className={`mt-3 rounded-2xl p-3 text-sm font-bold ${state.ok ? "bg-[#ECFDF3] text-[#15803D]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>{state.message}</p>
            )}
          </>
        )}
      </BottomSheet>
    </>
  );
}

function ManualForm({
  date,
  barcode,
  action,
  state,
  onSaved,
}: {
  date: string;
  barcode: string;
  action: (payload: FormData) => void;
  state: ScanState;
  onSaved: () => void;
}) {
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state.ok, onSaved]);

  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="source" value="manual" />
      <input type="hidden" name="date" value={date} />
      <label className="block text-sm font-bold">שם המזון<input name="name" required className="nutrition-input mt-2" /></label>
      <label className="block text-sm font-bold">ברקוד (רשות)<input name="barcode" defaultValue={barcode} inputMode="numeric" className="nutrition-input mt-2" dir="ltr" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold">קלוריות ל-100 גרם<input name="calories" required type="number" min="0" step="0.1" className="nutrition-input mt-2" /></label>
        <label className="block text-sm font-bold">חלבון<input name="protein" type="number" min="0" step="0.1" className="nutrition-input mt-2" /></label>
        <label className="block text-sm font-bold">פחמימות<input name="carbs" type="number" min="0" step="0.1" className="nutrition-input mt-2" /></label>
        <label className="block text-sm font-bold">שומן<input name="fat" type="number" min="0" step="0.1" className="nutrition-input mt-2" /></label>
      </div>
      {state.message && !state.ok && <p role="alert" className="rounded-2xl bg-[#FEF2F2] p-3 text-sm font-bold text-[#DC2626]">{state.message}</p>}
      <SubmitButton idle="שמירת המזון" pending="שומרים…" className="premium-primary-button w-full" event="manual_food_added" eventProperties={{ fromBarcode: Boolean(barcode) }} />
    </form>
  );
}
