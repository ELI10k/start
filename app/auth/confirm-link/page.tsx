import { redirect } from "next/navigation";

export default async function ConfirmLinkPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string; next?:string }> }) {
  const { token_hash: tokenHash, type, next } = await searchParams;
  if (!tokenHash || type !== "magiclink") redirect("/login?error=link");

  return <main className="auth-screen"><section className="auth-card"><p className="auth-card__mark">START</p><h1>קישור הכניסה מוכן</h1><p className="auth-card__lead">הקישור עדיין לא הופעל. רק לחיצה יזומה על הכפתור תאמת אותו ותפתח את החשבון שלך.</p><form action="/auth/accept-link" method="post" className="mt-7"><input type="hidden" name="token_hash" value={tokenHash}/><input type="hidden" name="next" value={next??""}/><button className="premium-primary-button w-full">כניסה מאובטחת והמשך</button></form></section></main>;
}
