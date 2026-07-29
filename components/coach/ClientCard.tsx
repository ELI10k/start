import { ArrowLeft, CalendarDays, CheckCircle2, Phone, Ruler, Scale, Target } from "lucide-react";
import Link from "next/link";
import type { Client } from "@/lib/clients";
import { clientStatusLabels } from "@/lib/clients";
import { getLatestCheckIn, getAttentionFlags, updatedThisWeek } from "@/lib/check-ins/calculations";
import { mockCheckIns } from "@/lib/check-ins/mock-data";
import { summarizeProgress } from "@/lib/progress/calculations";
import { mockWeighIns } from "@/lib/progress/mock-data";

const statusStyles: Record<Client["status"], string> = {
  active: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  "needs-attention": "border-amber-500/25 bg-amber-500/10 text-amber-300",
  paused: "border-zinc-500/25 bg-zinc-500/10 text-zinc-300",
};

export function formatCheckIn(date: string) {
  return new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", timeZone: "Asia/Jerusalem" }).format(new Date(`${date}T12:00:00`));
}

export default function ClientCard({ client }: { client: Client }) {
  const checkIns = mockCheckIns.filter((entry) => entry.clientId === client.id);
  const latestCheckIn = getLatestCheckIn(checkIns);
  const isUpdated = updatedThisWeek(checkIns);
  const needsAttention = getAttentionFlags(checkIns).length > 0;
  const progressSummary = summarizeProgress(mockWeighIns.filter((entry) => entry.clientId === client.id));
  const progress = Math.max(0, Math.min(100, 100 - Math.abs(client.currentWeight - client.targetWeight) * 8));

  return (
    <article className="group overflow-hidden rounded-[26px] border border-[#292929] bg-gradient-to-br from-[#191919] to-[#111] p-5 transition hover:-translate-y-0.5 hover:border-[#D4AF37]/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-lg font-black text-[#E7C85D]">
            {client.fullName.charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold text-white">{client.fullName}</h2>
            <a href={`tel:${client.phone}`} className="mt-1 flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-[#D4AF37]">
              <Phone size={13} /> <span dir="ltr">{client.phone}</span>
            </a>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyles[client.status]}`}>
          {clientStatusLabels[client.status]}
        </span>
      </div>

      <div className="my-5 grid grid-cols-3 gap-2">
        <Metric icon={<Scale size={15} />} label="משקל" value={`${progressSummary.latestWeight ?? client.currentWeight} ק״ג`} />
        <Metric icon={<Ruler size={15} />} label="היקף" value={`${progressSummary.latestWaist ?? client.waist} ס״מ`} />
        <Metric icon={<Target size={15} />} label="יעד" value={`${client.targetWeight} ק״ג`} />
      </div>

      <div className="mb-4">
        <div className="mb-2 flex justify-between text-xs text-zinc-500"><span>התקדמות ליעד</span><span>{Math.round(progress)}%</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-gradient-to-l from-[#D4AF37] to-[#8B6B1F]" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          {isUpdated ? <CheckCircle2 size={15} className="text-emerald-400" /> : <CalendarDays size={15} />}
          <span>{isUpdated ? "עודכן השבוע" : latestCheckIn ? `צ׳ק-אין ${formatCheckIn(latestCheckIn.date)}` : "חסר עדכון שבועי"}{needsAttention ? " · דורש תשומת לב" : ""}</span>
        </div>
        <Link href={`/coach/clients/${client.id}`} aria-label={`פתיחת הכרטיס של ${client.fullName}`} className="flex items-center gap-1 text-sm font-bold text-[#D4AF37] transition group-hover:gap-2">
          פרטים <ArrowLeft size={15} />
        </Link>
      </div>
    </article>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-white/[0.035] px-3 py-3"><div className="flex items-center gap-1.5 text-[11px] text-zinc-500">{icon}{label}</div><strong className="mt-1.5 block text-sm text-zinc-100">{value}</strong></div>;
}
