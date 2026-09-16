import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "תמיכה | START LIFE FIT" };

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "start.elicohenfitness@gmail.com";

export default function AppSupportPage() {
  return (
    <LegalPage eyebrow="עזרה" title="תמיכה ויצירת קשר" updated="15 בספטמבר 2026">
      <section>
        <h2>אנחנו כאן לעזור</h2>
        <p className="mt-2">אפשר לפנות בנושאי כניסה לחשבון, שימוש באפליקציה, פרטיות, תיקון מידע או מחיקת חשבון.</p>
        <p className="mt-4"><a dir="ltr" href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
      </section>
      <section>
        <h2>כבר מחוברים?</h2>
        <p className="mt-2">משתמשים מחוברים יכולים לפנות למאמן ישירות דרך <Link href="/support">מסך התמיכה באפליקציה</Link>.</p>
      </section>
      <section>
        <h2>מידע שכדאי לצרף</h2>
        <p className="mt-2">כתובת האימייל של החשבון, תיאור קצר של הבעיה, סוג המכשיר והמסך שבו היא התרחשה. אין לשלוח סיסמאות, קישורי כניסה או מידע רפואי שאינו נחוץ לטיפול בפנייה.</p>
      </section>
    </LegalPage>
  );
}
