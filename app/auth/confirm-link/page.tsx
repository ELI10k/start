import { redirect } from "next/navigation";
import MagicLinkConfirmation from "@/components/auth/MagicLinkConfirmation";

export default async function ConfirmLinkPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string; next?:string }> }) {
  const { token_hash: tokenHash, type, next } = await searchParams;
  if (!tokenHash || type !== "magiclink") redirect("/login?error=link");

  return <main className="auth-screen"><section className="auth-card"><p className="auth-card__mark">START LIFE FIT</p><h1>קישור הכניסה מוכן</h1><p className="auth-card__lead">באפליקציה הכניסה ממשיכה אוטומטית. באתר אפשר לאשר אותה בכפתור.</p><MagicLinkConfirmation tokenHash={tokenHash} next={next??""}/></section></main>;
}
