"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Camera, Images, Plus, Trash2 } from "lucide-react";
import { saveAiMeal, type SaveAiMealState } from "@/app/actions/ai-meal";
import { calculateFoodNutrition, addMacros } from "@/lib/meal-plans/calculations";
import { shrinkImage } from "@/lib/images/shrink";
import { applyMealClarification, type MealAnalysisComponent, type MealClarification, type MealClarificationOption } from "@/lib/nutrition/meal-image-analysis";
import type { PickableFood } from "@/components/client/AteSomethingElse";

type Draft = MealAnalysisComponent & { draftId: string };
type SelectedPhoto = { id: string; file: File; preview: string };
type AnalysisResponse = { summary: string; imageQualityWarning?: string | null; components: MealAnalysisComponent[]; clarifications?: MealClarification[]; analysisToken: string };
const initial: SaveAiMealState = { ok: false };
const randomId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export default function AiMealAnalyzer({ date, mealId, foods, onSaved }: { date: string; mealId: string; foods: readonly PickableFood[]; onSaved: () => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const previewUrls = useRef(new Set<string>());
  const replacementIndex = useRef<number | null>(null);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [description, setDescription] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [imageQualityWarning, setImageQualityWarning] = useState("");
  const [analysisToken, setAnalysisToken] = useState("");
  const [items, setItems] = useState<Draft[]>([]);
  const [clarifications, setClarifications] = useState<MealClarification[]>([]);
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

  useEffect(() => () => { previewUrls.current.forEach((url) => URL.revokeObjectURL(url)); previewUrls.current.clear(); }, []);

  const choose = async (input: HTMLInputElement) => {
    const selected = [...(input.files ?? [])];
    input.value = "";
    if (!selected.length) return;
    setPreparing(true); setError(""); setItems([]); setClarifications([]); setAnalysisToken("");
    const replacing = replacementIndex.current;
    replacementIndex.current = null;
    const limit = replacing == null ? Math.max(0, 3 - photos.length) : 1;
    const ready = await Promise.all(selected.slice(0, limit).map(shrinkImage));
    const additions = ready.map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      return { id: randomId(), file, preview };
    });
    if (replacing == null) {
      setPhotos((current) => [...current, ...additions].slice(0, 3));
      if (selected.length > limit) setError("אפשר לצרף עד 3 תמונות לאותה ארוחה.");
    } else if (additions[0]) {
      setPhotos((current) => current.map((photo, index) => {
        if (index !== replacing) return photo;
        URL.revokeObjectURL(photo.preview); previewUrls.current.delete(photo.preview);
        return additions[0];
      }));
    }
    setPreparing(false);
  };

  const openPicker = (kind: "camera" | "gallery", replaceAt: number | null = null) => {
    replacementIndex.current = replaceAt;
    (kind === "camera" ? camera : gallery).current?.click();
  };

  const removePhoto = (id: string) => setPhotos((current) => current.filter((photo) => {
    if (photo.id !== id) return true;
    URL.revokeObjectURL(photo.preview); previewUrls.current.delete(photo.preview); return false;
  }));

  const analyze = async () => {
    if (!photos.length) { setError("יש לצלם ארוחה או לבחור תמונה מהגלריה."); return; }
    if (!description.trim()) { setError("יש לכתוב בקצרה מה יש בארוחה ואיך היא הוכנה."); return; }
    setAnalyzing(true); setError("");
    const form = new FormData(); photos.forEach((photo) => form.append("photos", photo.file)); form.set("description", description);
    try {
      const response = await fetch("/api/nutrition/analyze-meal", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) {
        const messages: Record<string, string> = { feature_disabled: "ניתוח ארוחות ב־AI אינו זמין כרגע.", description_required: "יש לכתוב בקצרה מה יש בארוחה ואיך היא הוכנה.", rate_limited: "הגעת למכסת הניתוחים כרגע. אפשר לנסות מאוחר יותר.", no_food: "לא הצלחנו לזהות מזון בתמונות. נסו תמונה ברורה יותר של הצלחת.", invalid_photo: "אחת התמונות אינה קובץ JPG, PNG או WebP תקין.", too_many_photos: "אפשר לצרף עד 3 תמונות לאותה ארוחה.", photos_too_large: "התמונות גדולות מדי יחד. נסו תמונות קטנות יותר.", analysis_unavailable: "שירות הניתוח אינו זמין כרגע." };
        setError(messages[payload.error] ?? "לא הצלחנו לנתח את התמונה. נסו תמונה ברורה יותר."); return;
      }
      const result = payload as AnalysisResponse;
      setSummary(result.summary); setImageQualityWarning(result.imageQualityWarning ?? ""); setAnalysisToken(result.analysisToken);
      setItems(result.components.map((item) => ({ ...item, draftId: randomId() })));
      setClarifications(Array.isArray(result.clarifications) ? result.clarifications.slice(0, 2) : []);
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
  const answerClarification = (question: MealClarification, option: MealClarificationOption) => {
    setItems((current) => applyMealClarification(current, question, option).map((item) => {
      const existing = current.find((candidate) => candidate.componentKey && candidate.componentKey === item.componentKey);
      return { ...item, draftId: existing?.draftId ?? randomId() };
    }));
    setClarifications((current) => current.filter((candidate) => candidate.id !== question.id));
  };
  const skipClarification = (questionId: string) => setClarifications((current) => current.filter((question) => question.id !== questionId));

  return <div className="mt-4 grid gap-4">
    {showIntro ? <div className="rounded-2xl bg-[#ECFDF3] p-4 text-sm"><strong className="block text-[#15803D]">מעקב מהיר, לא שקילה</strong><p className="mt-1">צילום ארוחה מאפשר מעקב מהיר ונוח, אך מדובר בהערכה בלבד. למעקב מדויק יותר מומלץ לשקול מזונות ולהזין כמויות ידנית. לא מומלץ להסתמך רק על צילום AI בכל הארוחות.</p><button type="button" className="chip mt-3" onClick={() => { localStorage.setItem("life-fit-ai-meal-intro", "seen"); setIntroDismissed(true); }}>הבנתי</button></div> : null}
    {!analysisToken ? <>
      <input ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(event) => void choose(event.currentTarget)}/>
      <input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => void choose(event.currentTarget)}/>
      <div className="rounded-2xl bg-[#F7F8F7] p-3 text-sm"><strong>טיפ לצילום מדויק יותר</strong><p className="mt-1">קרב את המצלמה כך שהארוחה תמלא את רוב התמונה.</p><p className="mt-1 text-xs text-[#5B5F5B]">תמונה כללית חובה. אפשר להוסיף צילום מקרוב ותמונת חתך או זווית נוספת.</p></div>
      <div className="grid grid-cols-2 gap-2"><button type="button" disabled={photos.length >= 3} className="premium-secondary-button" onClick={() => openPicker("camera")}><Camera size={17}/>צילום תמונה</button><button type="button" disabled={photos.length >= 3} className="premium-secondary-button" onClick={() => openPicker("gallery")}><Images size={17}/>בחירה מהגלריה</button></div>
      {preparing ? <p role="status">מכינים את התמונה…</p> : null}
      {photos.length ? <div className="grid gap-3 sm:grid-cols-3">{photos.map((photo, index) => <article key={photo.id} className="rounded-2xl border border-[#E5E7E5] p-2">
        <p className="mb-2 text-xs font-bold">{index === 0 ? "תמונה כללית — חובה" : index === 1 ? "צילום מקרוב — רשות" : "חתך / זווית נוספת — רשות"}</p>
        <Image src={photo.preview} alt={`תמונה ${index + 1} של הארוחה`} width={480} height={320} unoptimized className="h-36 w-full rounded-xl object-contain"/>
        <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" className="chip min-h-10" onClick={() => openPicker("gallery", index)}>החלפה</button><button type="button" className="chip min-h-10 text-[#DC2626]" onClick={() => removePhoto(photo.id)}>הסרה</button></div>
      </article>)}</div> : null}
      <label className="text-sm font-bold">מה יש בארוחה?<span aria-hidden="true" className="mr-1 text-[#DC2626]">*</span><span className="mt-1 block font-normal text-[#5B5F5B]">כתוב בקצרה אילו מזונות יש בצלחת ואיך הוכנו, במיוחד אם יש שמן, רטבים או מיונז.</span><input required aria-required="true" className="nutrition-input mt-2" maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="פרגית צלויה, קוסקוס מבושל, חצילים מטוגנים, גזר במיונז"/></label>
      <button type="button" disabled={!photos.length || !description.trim() || preparing || analyzing} onClick={() => void analyze()} className="premium-primary-button">{analyzing ? "מנתחים את הארוחה…" : "ניתוח הארוחה ב־AI"}</button>
    </> : <form action={action} className="grid gap-4">
      <input type="hidden" name="date" value={date}/><input type="hidden" name="mealId" value={mealId}/><input type="hidden" name="entryId" value={entryId}/><input type="hidden" name="analysisToken" value={analysisToken}/><input type="hidden" name="components" value={JSON.stringify(items.map(({ index, componentKey, name, grams, foodId }) => ({ index, componentKey, name, grams, foodId })))}/><input type="hidden" name="saveFavorite" value={saveFavorite ? "true" : "false"}/>
      <div className="rounded-2xl bg-[#FFF7ED] p-3 text-sm"><strong>הערכת AI</strong> — הערכים מבוססים על ניתוח תמונה ועשויים להיות שונים מהכמויות בפועל.</div>
      {imageQualityWarning ? <div role="status" className="rounded-2xl border border-[#F59E0B] bg-[#FFFBEB] p-3 text-sm">{imageQualityWarning}</div> : null}
      {summary ? <p className="text-sm text-[#5B5F5B]">{summary}</p> : null}
      {clarifications.map((question) => <section key={question.id} className="rounded-2xl border border-[#F59E0B] bg-[#FFFBEB] p-4" aria-labelledby={`clarification-${question.id}`}>
        <strong id={`clarification-${question.id}`} className="block text-sm">שאלה קצרה לשיפור ההערכה</strong>
        <p className="mt-1 text-sm">{question.question}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {question.options.map((option) => <button key={option.id} type="button" className="chip min-h-11" onClick={() => answerClarification(question, option)}>{option.label}</button>)}
          <button type="button" className="chip min-h-11" onClick={() => skipClarification(question.id)}>לא בטוח / דילוג</button>
        </div>
        <p className="mt-2 text-xs text-[#5B5F5B]">אפשר גם לדלג ולתקן ידנית את השמות והגרמים למטה.</p>
      </section>)}
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
      <button type="button" className="premium-secondary-button" onClick={() => { setAnalysisToken(""); setItems([]); setClarifications([]); setImageQualityWarning(""); setError(""); }}>צילום תמונה אחרת</button>
    </form>}
    {error ? <p role="alert" className="rounded-2xl bg-[#FEF2F2] p-3 text-sm font-bold text-[#DC2626]">{error}</p> : null}
  </div>;
}
