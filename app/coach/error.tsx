"use client";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
export default function CoachError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="px-4 py-20"><section className="mx-auto max-w-xl rounded-[24px] border border-[#FECACA] bg-[#FEF2F2] p-8 text-center"><AlertTriangle className="mx-auto text-[#DC2626]"/><h1 className="mt-4 text-2xl font-black">לא ניתן לטעון את מסך המאמן</h1><p className="mt-2 text-sm text-[#5B5F5B]">המידע לא שונה. אפשר לנסות שוב או לחזור ללוח הבקרה.</p><div className="mt-5 flex justify-center gap-2"><button onClick={reset} className="premium-primary-button">ניסיון נוסף</button><Link href="/coach" className="premium-secondary-button">ללוח הבקרה</Link></div></section></main>}
