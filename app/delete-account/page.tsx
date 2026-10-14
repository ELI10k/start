import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "מחיקת חשבון | LIFE FIT" };

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "start.elicohenfitness@gmail.com";

// The public account-deletion page Google Play links to from the store listing.
// It has to work signed out, name the app, and say how to delete, what is
// deleted and what is kept - the same promises the deletion code and the
// privacy policy make.
export default function DeleteAccountPage() {
  return (
    <LegalPage eyebrow="LIFE FIT" title="מחיקת חשבון ונתונים" updated="14 באוקטובר 2026">
      <section>
        <h2>מחיקה מתוך האפליקציה</h2>
        <ol className="mt-2 mr-5 list-decimal">
          <li>נכנסים ל-LIFE FIT ופותחים את מסך <strong>הפרופיל</strong>.</li>
          <li>בוחרים <strong>מחיקת חשבון</strong>.</li>
          <li>מקלידים את המילה &quot;מחיקה&quot;, מאשרים, והחשבון נמחק מיד.</li>
        </ol>
      </section>
      <section>
        <h2>בקשת מחיקה בלי להתחבר</h2>
        <p className="mt-2">
          אפשר לשלוח בקשה מכתובת האימייל של החשבון אל{" "}
          <a dir="ltr" href={`mailto:${supportEmail}`}>{supportEmail}</a>{" "}
          עם הנושא &quot;מחיקת חשבון LIFE FIT&quot;. הבקשה מטופלת תוך 30 יום. חשבונות מאמן נמחקים בדרך זו.
        </p>
      </section>
      <section>
        <h2>מה נמחק</h2>
        <p className="mt-2">
          החשבון ופרטי הפרופיל, תוכניות האימון והתזונה, ביצועי אימונים, יומן אכילה, מדידות, צ׳ק־אינים, הודעות,
          התראות, וכל הקבצים האישיים: תמונות התקדמות, תמונות ארוחות, תמונות שנשלחו בצ׳אט וסרטוני ביצוע.
        </p>
      </section>
      <section>
        <h2>מה נשמר</h2>
        <p className="mt-2">
          מידע שחובה לשמור לפי דין, כמו רישומי תשלום. עותקי גיבוי מוצפנים נמחקים במחזור הגיבוי הרגיל. ראו גם את{" "}
          <Link href="/privacy">מדיניות הפרטיות</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
