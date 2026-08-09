"use client";
import { FileText, PlayCircle, Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { contentCategories, demoContentItems } from "@/lib/content";

export default function ContentLibrary() {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [category, setCategory] = useState("הכול");
  const categories = ["הכול", ...contentCategories];
  const visible = useMemo(() => demoContentItems.filter((item) =>
    (category === "הכול" || item.category === category) &&
    (!deferred.trim() || `${item.title} ${item.category}`.includes(deferred.trim()))
  ), [category, deferred]);
  return <>
    <p className="mb-4 rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-4 text-sm text-[#0B0B0B]">ספריית דמו: הרשומות הן מקומות שמורים ואינן תוכן מאושר.</p>
    <label className="relative block"><span className="sr-only">חיפוש בתכנים</span><Search className="absolute right-4 top-4 text-[#16A34A]" size={18}/><input className="nutrition-input pr-11" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש לפי שם או קטגוריה"/></label>
    <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-bold ${category === item ? "border-[#16A34A] bg-[#16A34A] text-[#FFFFFF]" : "border-[#E5E7E5] bg-[#FFFFFF] text-[#5B5F5B]"}`}>{item}</button>)}</div>
    {category !== "הכול" && <Link href={`/content/category/${encodeURIComponent(category)}`} className="mt-2 inline-flex text-sm font-bold text-[#16A34A]">לעמוד הקטגוריה</Link>}
    {visible.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((item) => <article key={item.id} className="overflow-hidden rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF]"><div className="grid aspect-video place-items-center bg-[#FFFFFF]">{item.type === "video" ? <PlayCircle className="text-[#16A34A]" size={42}/> : <FileText className="text-[#16A34A]" size={42}/>}</div><div className="p-5"><span className="text-xs font-bold text-[#16A34A]">{item.category} · דמו</span><h2 className="mt-2 text-xl font-black">{item.title}</h2><p className="mt-2 text-sm text-[#5B5F5B]">אין תוכן מאושר ברשומה זו.</p><Link href={`/content/${item.id}`} className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[#E5E7E5] px-3 text-xs font-bold text-[#3F433F]">צפייה בתבנית</Link></div></article>)}</div> : <div className="mt-5 rounded-[24px] border border-dashed border-[#E5E7E5] p-14 text-center"><Search className="mx-auto text-[#3F433F]"/><h2 className="mt-4 font-black">לא נמצאו תכנים</h2><p className="mt-2 text-sm text-[#5B5F5B]">אפשר לנסות חיפוש או קטגוריה אחרים.</p></div>}
  </>;
}
