"use client";

import { useMemo, useState } from "react";
import { Plus, Scale } from "lucide-react";
import { useClientData } from "./ClientDataProvider";
import { sortWeighIns, summarizeProgress } from "@/lib/progress/calculations";

const format = (value?: number) => value === undefined ? "—" : value.toFixed(1).replace(".0", "");
export default function ProgressPanel({ clientId }: { clientId: string }) {
  const { weighIns, addWeighIn } = useClientData();
  const entries = useMemo(() => sortWeighIns(weighIns.filter((entry) => entry.clientId === clientId)), [weighIns, clientId]);
  const summary = summarizeProgress(entries);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), weight: "", waist: "", note: "" });
  const [message, setMessage] = useState("");
  const valid = form.date && Number(form.weight) > 0 && Number(form.waist) > 0;
  const points = entries.map((entry, index) => {
    const weights = entries.map((item) => item.weightKg); const min = Math.min(...weights); const max = Math.max(...weights); const range = max - min || 1;
    return `${entries.length === 1 ? 50 : index / (entries.length - 1) * 100},${90 - (entry.weightKg - min) / range * 70}`;
  }).join(" ");
  function submit(event: React.FormEvent) {
    event.preventDefault(); if (!valid) { setMessage("יש להזין תאריך, משקל והיקף חיוביים."); return; }
    addWeighIn({ id: `weigh-${Date.now()}`, clientId, date: form.date, weightKg: Number(form.weight), measurements: { waistCm: Number(form.waist) }, note: form.note.trim() || undefined });
    setForm((current) => ({ ...current, weight: "", waist: "", note: "" })); setMessage("השקילה נוספה למצב הדמו של הסשן.");
  }
  return <div className="space-y-5">
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label="משקל אחרון" value={`${format(summary.latestWeight)} ק״ג`}/><Metric label="משקל התחלה" value={`${format(summary.startingWeight)} ק״ג`}/><Metric label="שינוי כולל" value={`${format(summary.weightChangeFromStart)} ק״ג`}/><Metric label="שינוי היקף" value={`${format(summary.waistChange)} ס״מ`}/>
    </section>
    <section className="rounded-[26px] border border-[#E5E7E5] bg-[#FFFFFF] p-5"><h2 className="text-xl font-black">מגמת משקל</h2>{entries.length > 1 ? <><svg viewBox="0 0 100 100" role="img" aria-label="תרשים מגמת משקל לאורך זמן" className="mt-4 h-52 w-full overflow-visible" preserveAspectRatio="none"><line x1="0" y1="90" x2="100" y2="90" stroke="#E5E7E5"/><polyline points={points} fill="none" stroke="#16A34A" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg><div className="flex justify-between text-xs text-[#5B5F5B]"><span>{entries[0].date}</span><span>{entries.at(-1)?.date}</span></div></> : <Empty text="נדרשות לפחות שתי שקילות להצגת מגמה."/>}</section>
    <section className="rounded-[26px] border border-[#E5E7E5] bg-[#FFFFFF] p-5"><h2 className="text-xl font-black">היסטוריה</h2>{entries.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-right text-sm"><thead className="text-[#5B5F5B]"><tr><th className="p-3">תאריך</th><th>משקל</th><th>היקף</th><th>הערה</th></tr></thead><tbody>{[...entries].reverse().map((entry) => <tr key={entry.id} className="border-t border-[#E5E7E5]"><td className="p-3">{entry.date}</td><td>{entry.weightKg} ק״ג</td><td>{entry.measurements.waistCm ?? "—"} ס״מ</td><td className="text-[#5B5F5B]">{entry.note ?? "—"}</td></tr>)}</tbody></table></div> : <Empty text="עדיין אין שקילות ללקוח הזה."/>}</section>
    <form onSubmit={submit} className="rounded-[26px] border border-[#BBF7D0] bg-[#FFFFFF] p-5"><div className="flex items-center gap-2"><Plus className="text-[#16A34A]"/><h2 className="text-xl font-black">הוספת שקילת דמו</h2></div><p className="mt-1 text-xs text-[#5B5F5B]">הנתונים נשמרים בסשן הנוכחי בלבד.</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><Field label="תאריך" type="date" value={form.date} onChange={(date) => setForm({ ...form, date })}/><Field label="משקל (ק״ג)" type="number" value={form.weight} onChange={(weight) => setForm({ ...form, weight })}/><Field label="היקף מותניים (ס״מ)" type="number" value={form.waist} onChange={(waist) => setForm({ ...form, waist })}/><label className="text-sm text-[#3F433F] sm:col-span-3">הערה (אופציונלית)<textarea className="nutrition-input mt-2" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })}/></label></div>{message && <p aria-live="polite" className="mt-3 text-sm text-[#0B0B0B]">{message}</p>}<button disabled={!valid} className="mt-4 min-h-12 rounded-2xl bg-[#16A34A] px-5 font-black text-[#FFFFFF] disabled:opacity-40">הוספת שקילה</button></form>
  </div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-[22px] border border-[#E5E7E5] bg-[#FFFFFF] p-4"><Scale size={18} className="text-[#16A34A]"/><span className="mt-3 block text-xs text-[#5B5F5B]">{label}</span><strong className="mt-1 block text-xl">{value}</strong></div>; }
function Empty({ text }: { text: string }) { return <p className="mt-4 rounded-2xl border border-dashed border-[#E5E7E5] p-8 text-center text-sm text-[#5B5F5B]">{text}</p>; }
function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) { return <label className="text-sm text-[#3F433F]">{label}<input required className="nutrition-input mt-2" type={type} min={type === "number" ? "0.1" : undefined} step={type === "number" ? "0.1" : undefined} value={value} onChange={(event) => onChange(event.target.value)}/></label>; }
