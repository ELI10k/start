import { redirect } from "next/navigation";

export default async function ConfirmInvitePage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  const { token_hash: tokenHash, type }=await searchParams;
  if(!tokenHash || type!=="invite") redirect("/login?error=invite");
  return <main className="auth-screen"><section className="auth-card"><p className="auth-card__mark">START</p><h1>ההזמנה מוכנה</h1><p className="auth-card__lead">לחיצה על הכפתור תאמת את ההזמנה המאובטחת ותעביר אותך להשלמת הקליטה.</p><form action="/auth/accept-invite" method="post" className="mt-7"><input type="hidden" name="token_hash" value={tokenHash}/><button className="premium-primary-button w-full">קבלת ההזמנה והמשך</button></form></section></main>;
}
