"use client";

import { Search, SlidersHorizontal, UserRoundX, X } from "lucide-react";
import { useMemo, useState } from "react";
import ClientCard from "@/components/coach/ClientCard";
import type { Client, ClientStatus } from "@/lib/clients";
import { getAttentionFlags, updatedThisWeek } from "@/lib/check-ins/calculations";
import { mockCheckIns } from "@/lib/check-ins/mock-data";

type Filter = "all" | ClientStatus | "updated" | "missing" | "attention";
type Sort = "name" | "recent" | "weight";
const filters: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "הכול" }, { value: "active", label: "פעילים" },
  { value: "needs-attention", label: "דורשים תשומת לב" }, { value: "paused", label: "בהשהיה" },
  { value: "updated", label: "עודכנו השבוע" },
  { value: "missing", label: "חסר עדכון" }, { value: "attention", label: "דורשים תשומת לב" },
];

export default function ClientsDirectory({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("name");
  const visibleClients = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("he");
    return clients.filter((client) => {
      const matchesQuery = !normalized || client.fullName.toLocaleLowerCase("he").includes(normalized) || client.phone.includes(normalized);
      const entries = mockCheckIns.filter((entry) => entry.clientId === client.id);
      const matchesFilter = filter === "all" || (filter === "updated" ? updatedThisWeek(entries) : filter === "missing" ? !updatedThisWeek(entries) : filter === "attention" ? getAttentionFlags(entries).length > 0 : client.status === filter);
      return matchesQuery && matchesFilter;
    }).sort((a, b) => sort === "recent" ? b.lastCheckIn.localeCompare(a.lastCheckIn) : sort === "weight" ? b.currentWeight - a.currentWeight : a.fullName.localeCompare(b.fullName, "he"));
  }, [clients, filter, query, sort]);

  return <>
    <div className="mb-4 flex items-center gap-3 rounded-[20px] border border-[#2B2B2B] bg-[#151515] px-4 transition focus-within:border-[#D4AF37]/70 focus-within:ring-4 focus-within:ring-[#D4AF37]/5">
      <Search size={19} className="shrink-0 text-[#D4AF37]" />
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש לפי שם או טלפון..." aria-label="חיפוש לקוחות" className="h-14 min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-600" />
      {query && <button onClick={() => setQuery("")} aria-label="ניקוי חיפוש" className="rounded-full p-1 text-zinc-500 hover:bg-white/5 hover:text-white"><X size={18} /></button>}
    </div>
    <div className="mb-7 flex items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
      <SlidersHorizontal size={17} className="ml-1 shrink-0 text-zinc-500" />
      {filters.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${filter === item.value ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-[#303030] bg-[#151515] text-zinc-400 hover:border-zinc-600 hover:text-white"}`}>{item.label}</button>)}
    </div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-zinc-500">מציגים <strong className="text-zinc-200">{visibleClients.length}</strong> לקוחות</p><label className="flex items-center gap-2 text-xs text-zinc-500">מיון<select className="rounded-xl border border-[#333] bg-[#151515] px-3 py-2 text-white" value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="name">שם</option><option value="recent">עדכון אחרון</option><option value="weight">משקל</option></select></label></div>
    {visibleClients.length ? <div className="grid gap-4 md:grid-cols-2">{visibleClients.map((client) => <ClientCard key={client.id} client={client} />)}</div> : <div className="rounded-[28px] border border-dashed border-[#333] bg-[#121212] px-6 py-16 text-center"><UserRoundX className="mx-auto text-zinc-600" size={38} /><h2 className="mt-4 font-bold">לא נמצאו לקוחות</h2><p className="mt-2 text-sm text-zinc-500">כדאי לנסות חיפוש או סינון אחר</p></div>}
  </>;
}
