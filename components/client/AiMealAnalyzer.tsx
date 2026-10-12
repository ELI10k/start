"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Camera, Images, Plus, Trash2 } from "lucide-react";
import { saveAiMeal, type SaveAiMealState } from "@/app/actions/ai-meal";
import { calculateFoodNutrition, addMacros } from "@/lib/meal-plans/calculations";
import { replaceInputFile, shrinkImage } from "@/lib/images/shrink";
import type { MealAnalysisComponent } from "@/lib/nutrition/meal-image-analysis";
import type { PickableFood } from "@/components/client/AteSomethingElse";

type Draft = MealAnalysisComponent & { draftId: string };
type AnalysisResponse = { summary: string; components: MealAnalysisComponent[]; analysisToken: string };
const initial: SaveAiMealState = { ok: false };
const randomId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export default function AiMealAnalyzer({ date, mealId, foods, onSaved }: { date: string; mealId: string; foods: readonly PickableFood[]; onSaved: () => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [description, setDescription] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [analysisToken, setAnalysisToken] = useState("");
  const [items, setItems] = useState<Draft[]>([]);
  const [entryId, setEntryId] = useState(randomId);
  const [mealSlot, setMealSlot] = useState("lunch");
  const [saveFavorite, setSaveFavorite] = useState(false);
  const [favoriteName, setFavoriteName] = useState("");
  const firstUse = useSyncExternalStore(() => () => undefined, () => localStorage.getItem("life-fit-ai-meal-intro") !== "seen", () => false);
  const [introDismissed, setIntroDismissed] = useState(false);
  const showIntro = firstUse && !introDismissed;
  const [state, action, pending] = useActionState(async (previous: SaveAiMealState, form: FormData) => {
    const result = await saveAiMeal(previous, form);
    if (result.ok) onSaved();
    return result;
  }, initial);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const choose = async (input: HTMLInputElement) => {
    const selected = input.files?.[0]; if (!selected) return;
    setPreparing(true); setError(""); setItems([]); setAnalysisToken("");
    const ready = await shrinkImage(selected);
    if (ready !== selected) replaceInputFile(input, ready);
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(ready); setPreview(URL.createObjectURL(ready)); setPreparing(false);
  };

  const analyze = async () => {
    if (!photo) { setError("יש לצלם ארוחה או לבחור תמונה מהגלריה."); return; }
    setAnalyzing(true); setError("");
    const form = new FormData(); form.set("photo", photo); form.set("description", description);
    try {
      const response = await fetch("/api/nutrition/analyze-meal", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) {
        const messages: Record<string, string> = { rate_limited: "הגעת למכסת הניתוחים כרגע. אפשר לנסות מאוחר יותר.", no_food: "לא הצלחנו לזהות מזון בתמונה. נסו תמונה ברורה יותר של הצלחת.", invalid_photo: "התמונה אינה קובץ JPG, PNG או WebP תקין.", analysis_unavailable: "שירות הניתוח אינו זמין כרגע." };
        setError(messages[payload.error] ?? "לא הצלחנו לנתח את התמונה. נסו תמונה ברורה יותר."); return;
      }
      const result = payload as AnalysisResponse;
      setSummary(result.summary); setAnalysisToken(result.analysisToken);
      setItems(result.components.map((item) => ({ ...item, draftId: randomId() })));
      setEntryId(randomId());
    } catch { setError("החיבור לניתוח נכשל. אפשר לנסות שוב."); }
    finally { setAnalyzing(false); }
  };

  const totals = useMemo(() => addMacros(...items.map((item) => calculateFoodNutrition(item.per100, item.grams))), [items]);
  const foodById = useMemo(() => new Map(foods.map((food) => [food.id, food])), [foods]);
  const update = (draftId: string, change: Partial<Draft>) => setItems((current) => current.map((item) => item.draftId === draftId ? { ...item, ...change } : item));
  const chooseFood = (draftId: string, foodId: string) => {
    const food = foodById.get(foodId); if (!food) return;
    update(draftId, { foodId, name: food.name, source: "catalog", per100: { calories: Number(food.calories ?? 0), protein: Number(food.protein ?? 0), carbs: Number(food.carbs ?? 0), fat: Number(food.fat ?? 0) } });
  };
  const addItem = () => {
    const food = foods[0];
    if (!food) { setError("לא ניתן להוסיף רכיב חדש כשהמאגר אינו זמין."); return; }
    setItems((current) => [...current, { draftId: randomId(), index: Math.max(-1, ...current.map((item) => item.index)) + 1, name: food.name, grams: 100, per100: { calories: Number(food.calories ?? 0), protein: Number(food.protein ?? 0), carbs: Number(food.carbs ?? 0), fat: Number(food.fat ?? 0) }, foodId: food.id, source: "catalog", confidence: "high", assumptions: [], clarification: null }]);
  };

  return <div className="mt-4 grid gap-4">
    {showIntro ? <div className="rounded-2xl bg-[#ECFDF3] p-4 text-sm"><strong className="block text-[#15803D]">מעקב מהיר, לא שקילה</strong><p className="mt-1">צילום ארוחה מאפשר מעקב מהיר ונוח, אך מדובר בהערכה בלבד. למעקב מדויק יותר מומלץ לשקול מזונות ולהזין כמויות ידנית. לא מומלץ להסתמך רק על צילום AI בכל הארוחות.</p><button type="button" className="chip mt-3" onClick={() => { localStorage.setItem("life-fit-ai-meal-intro", "seen"); setIntroDismissed(true); }}>הבנתי</button></div> : null}
    {!analysisToken ? <>
      <input ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(event) => void choose(event.currentTarget)}/>
      <input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void choose(event.currentTarget)}/>
      <div className="grid grid-cols-2 gap-2"><button type="button" className="premium-secondary-button" onClick={() => camera.current?.click()}><Camera size={17}/>צילום ארוחה</button><button type="button" className="premium-secondary-button" onClick={() => gallery.current?.click()}><Images size={17}/>בחירה מהגלריה</button></div>
      {preparing ? <p role="status">מכינים את התמונה…</p> : null}
      {preview ? <Image src={preview} alt="הארוחה שנבחרה לניתוח" width={640} height={420} unoptimized className="max-h-72 w-full rounded-2xl object-contain"/> : null}
      <label className="text-sm font-bold">מידע נוסף <span className="font-normal text-[#5B5F5B]">(רשות)</span><input className="nutrition-input mt-2" maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="לדוגמה: השניצל מטוגן, בלי רוטב"/></label>
      <button type="button" disabled={!photo || preparing || analyzing} onClick={() => void analyze()} className="premium-primary-button">{analyzing ? "מנתחים את הארוחה…" : "ניתוח הארוחה ב-AI"}</button>
    </> : <form action={action} className="grid gap-4">
      <input type="hidden" name="date" value={date}/><input type="hidden" name="mealId" value={mealId}/><input type="hidden" name="entryId" value={entryId}/><input type="hidden" name="analysisToken" value={analysisToken}/><input type="hidden" name="components" value={JSON.stringify(items.map(({ index, name, grams, foodId }) => ({ index, name, grams, foodId })))}/><input type="hidden" name="saveFavorite" value={saveFavorite ? "true" : "false"}/>
      <div className="rounded-2xl bg-[#FFF7ED] p-3 text-sm"><strong>הערכת AI</strong> — הערכים מבוססים על ניתוח תמונה ועשויים להיות שונים מהכמויות בפועל.</div>
      {summary ? <p className="text-sm text-[#5B5F5B]">{summary}</p> : null}
      <div className="rounded-2xl bg-[#F7F8F7] p-4"><strong className="text-xl">כ־{Math.round(totals.calories)} קל׳</strong><p className="mt-1 text-sm">חלבון {Math.round(totals.protein)} ג׳ · פחמימות {Math.round(totals.carbs)} ג׳ · שומן {Math.round(totals.fat)} ג׳</p></div>
      {items.map((item) => { const macros = calculateFoodNutrition(item.per100, item.grams); return <article key={item.draftId} className="rounded-2xl border border-[#E5E7E5] p-3">
        <div className="flex items-start justify-between gap-2"><strong>{item.name}</strong><button type="button" aria-label={`מחיקת ${item.name}`} className="inline-flex size-11 items-center justify-center text-[#DC2626]" onClick={() => setItems((current) => current.filter((row) => row.draftId !== item.draftId))}><Trash2 size={17}/></button></div>
        <label className="mt-2 block text-xs font-bold">שם המזון<input className="nutrition-input mt-1" maxLength={200} value={item.name} onChange={(event) => update(item.draftId, { name: event.target.value, foodId: null, source: "ai_estimate" })}/></label>
        <label className="mt-2 block text-xs font-bold">התאמה למאגר<select className="nutrition-input mt-1" value={item.foodId ?? ""} onChange={(event) => event.target.value ? chooseFood(item.draftId, event.target.value) : update(item.draftId, { foodId: null, source: "ai_estimate" })}><option value="">הערכת AI</option>{foods.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}</select></label>
        <label className="mt-2 block text-xs font-bold">משקל משוער בגרמים<input type="number" min="1" max="3000" step="1" className="nutrition-input mt-1" value={item.grams} onChange={(event) => update(item.draftId, { grams: Number(event.target.value) })}/></label>
        <p className="mt-2 text-xs text-[#5B5F5B]">{Math.round(macros.calories)} קל׳ · {Math.round(macros.protein)} ג׳ חלבון · {Math.round(macros.carbs)} ג׳ פחמימות · {Math.round(macros.fat)} ג׳ שומן · {item.source === "catalog" ? "מאגר המזונות" : "הערכת AI"}</p>
        {item.clarification ? <p className="mt-2 rounded-xl bg-[#FFF7ED] p-2 text-xs">{item.clarification}</p> : null}
        {item.assumptions.length ? <p className="mt-2 text-xs text-[#5B5F5B]">הנחה: {item.assumptions.join(" · ")}</p> : null}
      </article>; })}
      <button type="button" className="premium-secondary-button" onClick={addItem}><Plus size={17}/>הוספת רכיב</button>
      <label className="text-sm font-bold">סוג הארוחה<select name="mealSlot" value={mealSlot} onChange={(event) => setMealSlot(event.target.value)} className="nutrition-input mt-2"><option value="breakfast">ארוחת בוקר</option><option value="lunch">ארוחת צהריים</option><option value="dinner">ארוחת ערב</option><option value="snack">ארוחת ביניים</option></select></label>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={saveFavorite} onChange={(event) => setSaveFavorite(event.target.checked)}/>שמור גם בארוחות שלי</label>
      {saveFavorite ? <label className="text-sm font-bold">שם הארוחה השמורה<input name="favoriteName" maxLength={80} value={favoriteName} onChange={(event) => setFavoriteName(event.target.value)} className="nutrition-input mt-2" placeholder="לדוגמה: צהריים בעבודה"/></label> : null}
      {state.message ? <p role={state.ok ? "status" : "alert"} className={`rounded-xl p-3 text-sm font-bold ${state.ok ? "bg-[#ECFDF3] text-[#15803D]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>{state.message}</p> : null}
      <button disabled={pending || items.length === 0} className="premium-primary-button">{pending ? "שומרים…" : "הוסף ליומן התזונה"}</button>
      <button type="button" className="premium-secondary-button" onClick={() => { setAnalysisToken(""); setItems([]); setError(""); }}>צילום תמונה אחרת</button>
    </form>}
    {error ? <p role="alert" className="rounded-2xl bg-[#FEF2F2] p-3 text-sm font-bold text-[#DC2626]">{error}</p> : null}
  </div>;
}
