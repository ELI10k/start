import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  CheckCircle2,
  Clock3,
  LogIn,
  Play,
  ShieldCheck,
} from "lucide-react";
import GuideVideo from "./GuideVideo";
import styles from "./page.module.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://start.elicohenfitness.co.il"),
  title: "מדריך השימוש ב־Life Fit",
  description:
    "שבעה סרטוני הדרכה קצרים וברורים שיעזרו לכם להתחיל להשתמש באפליקציית Life Fit.",
  alternates: { canonical: "/guide" },
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: "/guide",
    siteName: "LIFE FIT",
    title: "מדריך השימוש ב־Life Fit",
    description:
      "כניסה, תזונה, אימונים, מעקב והקשר עם המאמן — שבעה מדריכים מסודרים במקום אחד.",
    images: [
      {
        url: "/join/opengraph-image",
        width: 1200,
        height: 630,
        alt: "מדריך השימוש באפליקציית Life Fit",
      },
    ],
  },
};

const lessons = [
  {
    number: "01",
    title: "כניסה, מסך הבית וניווט",
    duration: "3:44 דקות",
    description:
      "מתחילים מההתחלה: איך נכנסים באמצעות הקישור שקיבלתם, מה עושים כשהקישור פג תוקף, ואיך מתמצאים במסך הבית ובתפריט הראשי.",
    points: ["כניסה והצטרפות ראשונית", "היכרות עם מסך הבית", "מעבר בין האזורים המרכזיים"],
    src: "/media/life-fit-training/01-login-home-navigation",
  },
  {
    number: "02",
    title: "התפריט האישי והארוחות שלי",
    duration: "5:54 דקות",
    description:
      "לומדים לעבוד עם התפריט היומי, לבחור מאכלים וכמויות ולדווח מה אכלתם. בחלק השני תראו איך בונים ארוחות קבועות ושומרים אותן לשימוש מהיר בהמשך.",
    points: ["בחירת יום, ארוחה וכמות", "סימון ארוחה ועדכון הסיכום היומי", "יצירה ושימוש באזור הארוחות שלי"],
    src: "/media/life-fit-training/02-personal-menu-meals",
  },
  {
    number: "03",
    title: "תזונה מחוץ לתפריט ורשימת קניות",
    duration: "3:37 דקות",
    description:
      "גם יום שלא התנהל בדיוק לפי התפריט אפשר לתעד בצורה מסודרת. הסרטון מסביר איך מוסיפים אוכל אחר ואיך משתמשים ברשימת הקניות שנבנית מהתוכנית שלכם.",
    points: ["דיווח על אוכל מחוץ לתפריט", "הוספת פריטים וחישוב הכמות", "עבודה עם רשימת הקניות"],
    src: "/media/life-fit-training/03-outside-menu-shopping",
  },
  {
    number: "04",
    title: "תוכנית האימונים וביצוע אימון",
    duration: "3:14 דקות",
    description:
      "כאן תראו איך פותחים את האימון המתוכנן ומבצעים אותו שלב אחר שלב — כולל סרטוני הטכניקה, סטי החימום, החזרות, המשקלים וטיימר המנוחה.",
    points: ["פתיחת תרגיל והסבר הטכניקה", "סטי חימום וסטים עובדים", "הזנת חזרות ושימוש בטיימר"],
    src: "/media/life-fit-training/04-workout-program-session",
  },
  {
    number: "05",
    title: "ניהול אימונים והתקדמות",
    duration: "3:00 דקות",
    description:
      "הסבר על ניהול שבוע האימונים ועל הדרך לעקוב אחר השיפור לאורך זמן. תלמדו להעביר אימון, לדווח על אימון שפוספס ולבדוק ביצועים קודמים.",
    points: ["העברת אימון ליום אחר", "סימון אימון שפוספס", "היסטוריה והתקדמות בתרגילים"],
    src: "/media/life-fit-training/05-workout-management-progress",
  },
  {
    number: "06",
    title: "משקל, בריאות וצ׳ק־אין שבועי",
    duration: "3:41 דקות",
    description:
      "לומדים לעדכן משקל ומדידות, להבין את נתוני הצעדים והשינה ולהשלים את הדיווח השבועי שהמאמן משתמש בו כדי לעקוב אחר ההתקדמות שלכם.",
    points: ["משקל, היקפים ומגמת ההתקדמות", "צעדים ונתוני שינה", "מילוי ושליחת הצ׳ק־אין השבועי"],
    src: "/media/life-fit-training/06-measurements-health-checkin",
  },
  {
    number: "07",
    title: "הודעות, תוכן, פרופיל ותמיכה",
    duration: "4:04 דקות",
    description:
      "מסיימים בהיכרות עם כל כלי הקשר והעזרה: שיחה עם המאמן, התראות, ספריית התוכן, הגדרות הפרופיל והדרך הנכונה לפנות לתמיכה.",
    points: ["שליחת הודעה למאמן", "התראות וספריית התוכן", "הגדרות הפרופיל וקבלת תמיכה"],
    src: "/media/life-fit-training/07-messages-content-profile-support",
  },
] as const;

export default function GuideLandingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Link className={styles.logo} href="/join" aria-label="Life Fit, דף הבית">
          LIFE FIT
        </Link>
        <nav className={styles.navLinks} aria-label="ניווט בדף ההדרכה">
          <a href="#lessons">כל הפרקים</a>
          <Link href="/login">כניסה לאפליקציה</Link>
        </nav>
        <Link className={styles.navCta} href="/login">
          כניסה לאפליקציה
          <LogIn size={17} aria-hidden="true" />
        </Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>
            <CheckCircle2 size={16} aria-hidden="true" />
            מדריך מסודר להתחלה קלה
          </div>
          <h1>
            כל מה שצריך לדעת
            <span>כדי להתחיל נכון.</span>
          </h1>
          <p>
            שבעה סרטונים קצרים שילוו אתכם מהכניסה הראשונה ועד לעבודה שוטפת עם
            התפריט, האימונים, המעקב והמאמן.
          </p>
          <a className={styles.primaryButton} href="#lessons">
            מתחילים בפרק הראשון
            <ArrowDown size={19} aria-hidden="true" />
          </a>
          <div className={styles.heroProof}>
            <span><Play size={16} aria-hidden="true" /> 7 פרקים מסודרים</span>
            <span><Clock3 size={16} aria-hidden="true" /> כ־27 דקות בסך הכול</span>
            <span><ShieldCheck size={16} aria-hidden="true" /> צופים בקצב שלכם</span>
          </div>
        </div>

        <div className={styles.heroCard} aria-label="מה תלמדו במדריך">
          <span className={styles.heroCardKicker}>מהכניסה הראשונה ועד שגרת עבודה</span>
          <strong>7</strong>
          <p>פרקים שמסבירים בדיוק איפה ללחוץ ומה לעשות בכל שלב.</p>
          <ol>
            <li><span>01</span>כניסה וניווט</li>
            <li><span>02</span>תזונה וארוחות</li>
            <li><span>03</span>קניות ודיווח חופשי</li>
            <li><span>04</span>ביצוע אימון</li>
            <li><span>05</span>התקדמות באימונים</li>
            <li><span>06</span>מדידות וצ׳ק־אין</li>
            <li><span>07</span>הודעות ותמיכה</li>
          </ol>
        </div>
      </section>

      <section className={styles.intro} id="lessons">
        <span>המדריך המלא</span>
        <h2>צפו לפי הסדר, ותחזרו לכל פרק מתי שצריך.</h2>
        <p>
          לפני כל סרטון מופיע הסבר קצר על הנושאים שבו. מומלץ לצפות פעם אחת
          ברצף, ולאחר מכן לחזור ישירות לפרק הרלוונטי בזמן השימוש באפליקציה.
        </p>
      </section>

      <div className={styles.lessons}>
        {lessons.map((lesson, index) => (
          <section className={styles.lesson} key={lesson.number}>
            <div className={styles.lessonCopy}>
              <span className={styles.lessonIndex}>
                {lesson.number} / פרק {index + 1}
              </span>
              <h2>{lesson.title}</h2>
              <div className={styles.duration}>
                <Clock3 size={16} aria-hidden="true" />
                {lesson.duration}
              </div>
              <p>{lesson.description}</p>
              <ul>
                {lesson.points.map((point) => (
                  <li key={point}>
                    <CheckCircle2 size={17} aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.videoShell}>
              <div className={styles.videoTop} aria-hidden="true">
                <i />
                <span>LIFE FIT</span>
                <b>{lesson.number}</b>
              </div>
              <GuideVideo
                src={lesson.src}
                title={lesson.title}
                number={lesson.number}
              />
            </div>
          </section>
        ))}
      </div>

      <section className={styles.finalCta}>
        <div className={styles.finalGlow} aria-hidden="true" />
        <span>סיימתם את המדריך?</span>
        <h2>הכול מוכן. עכשיו פשוט מתחילים.</h2>
        <p>
          היכנסו לאפליקציה, פתחו את התוכנית שלכם והתקדמו צעד אחר צעד. תמיד
          אפשר לחזור לעמוד הזה ולרענן פעולה שלא הייתה ברורה.
        </p>
        <Link href="/login">
          כניסה ל־Life Fit
          <LogIn size={18} aria-hidden="true" />
        </Link>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.logo} href="/join">LIFE FIT</Link>
        <p>מדריך השימוש ללקוחות חדשים</p>
        <div>
          <Link href="/privacy">מדיניות פרטיות</Link>
          <Link href="/terms">תנאי שימוש</Link>
        </div>
      </footer>
    </main>
  );
}
