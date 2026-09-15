import Link from "next/link";

export default function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="מידע משפטי ותמיכה" className={`flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-[#5B5F5B] ${className}`.trim()}>
      <Link href="/privacy" className="underline underline-offset-4">מדיניות פרטיות</Link>
      <Link href="/terms" className="underline underline-offset-4">תנאי שימוש</Link>
      <Link href="/app-support" className="underline underline-offset-4">תמיכה</Link>
    </nav>
  );
}
