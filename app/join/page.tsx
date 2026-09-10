import type { Metadata } from "next";
import Link from "next/link";
import DigitalJoinForm from "@/components/auth/DigitalJoinForm";
import { getBillingConfiguration } from "@/lib/billing/config";

export const metadata: Metadata = { title: "הצטרפות ל־START Digital" };

export default function JoinPage() {
  const available = Boolean(getBillingConfiguration().checkoutUrl);
  return <main className="auth-screen text-[#0B0B0B]"><section className="auth-card">
    <p className="auth-card__mark">START DIGITAL</p>
    <h1>התוכנית שלך, כל יום</h1>
    <p className="auth-card__lead">אימונים, תזונה והתאמות דיגיטליות ב־97 ₪ לחודש. לאחר אימות האימייל עוברים לתשלום מאובטח ולהתאמה אישית.</p>
    <DigitalJoinForm available={available}/>
    <p className="auth-card__note">כבר יש לך חשבון? <Link href="/login" className="font-black text-[#147A50]">כניסה ל־START</Link></p>
  </section></main>;
}
