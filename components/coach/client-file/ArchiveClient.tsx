"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { archiveClient, permanentlyDeleteClient, restoreClient } from "@/app/actions/coach";

// Archiving, and the confirmation that makes it safe to offer.
//
// The word "מחיקה" is deliberately absent: nothing is deleted, and calling it a
// deletion would make a coach hesitate over the safe action and reach for
// something worse. The dialog names the client and lists what survives, because
// "are you sure?" tells nobody anything.

export function ArchiveClientPanel({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmationName, setConfirmationName] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  const archive = () => start(async () => {
    const result = await archiveClient(clientId);
    setMessage(result.message);
    if (result.ok) {
      setConfirming(false);
      // Back to the list the client has just left, which is where a coach
      // expects to land - and it is the proof that the archive worked.
      router.push("/coach/clients");
      router.refresh();
    }
  });

  const remove = () => start(async () => {
    const result = await permanentlyDeleteClient(clientId, confirmationName);
    setMessage(result.message);
    if (result.ok) {
      router.push("/coach/clients");
      router.refresh();
    }
  });

  return (
    <section className="mt-5 rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-4" aria-labelledby="danger-zone">
      <h2 id="danger-zone" className="font-black text-[#DC2626]">אזור מסוכן</h2>
      {!confirming ? <>
        <p className="mt-2 text-sm text-[#5B5F5B]">סיום הליווי מסיר את הלקוח מהרשימה הפעילה ושומר את כל ההיסטוריה.</p>
        <button type="button" onClick={() => { setConfirming(true); setMessage(""); }} className="premium-secondary-button mt-3 border-[#DC2626] text-[#DC2626]">
          <Archive aria-hidden="true" size={17}/>העברת לקוח לארכיון
        </button>
      </> : <div role="group" aria-labelledby="archive-confirm">
        <p id="archive-confirm" className="mt-2 text-sm font-bold">להעביר את <span className="font-black">{clientName}</span> לארכיון?</p>
        <ul className="mt-2 grid gap-1 text-sm text-[#5B5F5B]">
          <li>· הלקוח יוסר מרשימת הלקוחות הפעילים שלך.</li>
          <li>· התפריטים, האימונים, המדידות, ה־Check-ins וכל ההיסטוריה <strong>לא יימחקו</strong>.</li>
          <li>· חשבון הלקוח אינו נמחק ואינו מושבת.</li>
          <li>· אפשר לשחזר בכל רגע ממסך „לקוחות בארכיון”.</li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={archive} className="premium-secondary-button border-[#DC2626] bg-[#DC2626] text-[#FFFFFF]">
            {pending ? "מעבירים…" : "אישור והעברה לארכיון"}
          </button>
          <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="premium-secondary-button">ביטול</button>
        </div>
      </div>}
      {message && <p role="status" className="mt-3 text-sm font-bold text-[#0B0B0B]">{message}</p>}

      <div className="mt-5 border-t border-[#DC2626]/20 pt-4">
        {!deleting ? <>
          <p className="text-sm font-black text-[#DC2626]">מחיקה קבועה</p>
          <p className="mt-1 text-sm text-[#5B5F5B]">מוחקת את החשבון, התפריטים, האימונים, המדידות וההיסטוריה ומאפשרת להזמין מחדש את אותו אימייל.</p>
          <button type="button" onClick={() => { setDeleting(true); setConfirming(false); setMessage(""); }} className="premium-secondary-button mt-3 border-[#DC2626] text-[#DC2626]">
            <Trash2 aria-hidden="true" size={17}/>מחיקת לקוח לצמיתות
          </button>
        </> : <div role="group" aria-labelledby="delete-confirm">
          <p id="delete-confirm" className="text-sm font-black text-[#DC2626]">הפעולה אינה ניתנת לביטול</p>
          <ul className="mt-2 grid gap-1 text-sm text-[#5B5F5B]">
            <li>· חשבון הכניסה וכל נתוני הלקוח יימחקו.</li>
            <li>· היסטוריית תזונה, אימונים, מדידות ו־Check-ins לא תהיה ניתנת לשחזור.</li>
            <li>· לאחר המחיקה אפשר ליצור לקוח חדש עם אותו אימייל.</li>
          </ul>
          <label className="mt-3 block text-sm font-bold">להקליד את שם הלקוח לאישור: <span className="font-black">{clientName}</span>
            <input className="nutrition-input mt-2" value={confirmationName} onChange={event=>setConfirmationName(event.target.value)} autoComplete="off"/>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={pending||confirmationName.trim()!==clientName.trim()} onClick={remove} className="premium-secondary-button border-[#DC2626] bg-[#DC2626] text-[#FFFFFF] disabled:opacity-40">
              {pending?"מוחקים…":"אישור מחיקה לצמיתות"}
            </button>
            <button type="button" disabled={pending} onClick={()=>{setDeleting(false);setConfirmationName("")}} className="premium-secondary-button">ביטול</button>
          </div>
        </div>}
      </div>
    </section>
  );
}

/** The other direction, from the archive list. */
export function RestoreClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");

  const restore = () => start(async () => {
    const result = await restoreClient(clientId);
    setMessage(result.message);
    if (result.ok) { setConfirming(false); router.refresh(); }
  });

  if (!confirming) {
    return <button type="button" onClick={() => setConfirming(true)} className="chip">
      <RotateCcw aria-hidden="true" size={15}/>שחזור לקוח
    </button>;
  }
  return <span className="flex flex-wrap items-center gap-2">
    <span className="text-xs text-[#5B5F5B]">לשחזר את {clientName}?</span>
    <button type="button" disabled={pending} onClick={restore} className="chip border-[#16A34A] text-[#16A34A]">{pending ? "משחזרים…" : "אישור"}</button>
    <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="chip">ביטול</button>
    {message && <span role="status" className="text-xs text-[#5B5F5B]">{message}</span>}
  </span>;
}
