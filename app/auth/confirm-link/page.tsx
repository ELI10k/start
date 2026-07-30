import { redirect } from "next/navigation";

export default async function ConfirmLinkPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string; next?:string }> }) {
  const { token_hash: tokenHash, type, next } = await searchParams;
  if (!tokenHash || type !== "magiclink") redirect("/login?error=link");

  return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,.12),transparent_35%),#090909] px-4 py-10 text-white"><section className="w-full max-w-md rounded-[30px] border border-[#3A321B] bg-[#151515] p-6 shadow-2xl sm:p-8"><p className="text-xs font-black tracking-[.2em] text-[#D4AF37]">START</p><h1 className="mt-3 text-3xl font-black">קישור הכניסה מוכן</h1><p className="mt-2 text-sm leading-6 text-zinc-400">הקישור עדיין לא הופעל. רק לחיצה יזומה על הכפתור תאמת אותו ותפתח את החשבון שלך.</p><form action="/auth/accept-link" method="post" className="mt-7"><input type="hidden" name="token_hash" value={tokenHash}/><input type="hidden" name="next" value={next??""}/><button className="min-h-14 w-full rounded-2xl bg-[#D4AF37] px-5 font-black text-black">כניסה מאובטחת והמשך</button></form></section></main>;
}
