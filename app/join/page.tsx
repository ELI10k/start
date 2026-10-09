import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Dumbbell,
  Lightbulb,
  MessageCircle,
  Footprints,
  MoonStar,
  ShieldCheck,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import styles from "./page.module.css";
import CookieConsent from "./CookieConsent";
import MetaPixel from "./MetaPixel";
import AnimatedTimer from "./AnimatedTimer";
import MobileMotion from "./MobileMotion";
import CleanLandingUrl from "./CleanLandingUrl";

export const metadata: Metadata = {
  metadataBase: new URL("https://elicohenfitness.co.il"),
  title: "LIFE FIT | אימונים, תזונה ומעקב במקום אחד",
  description:
    "תוכנית אימונים, תזונה, מעקב התקדמות ונתוני פעילות במקום אחד. מסלול DIGITAL של LIFE FIT ב־97 ₪ לחודש, ללא התחייבות.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: "/",
    siteName: "LIFE FIT",
    title: "LIFE FIT | אימונים, תזונה ומעקב במקום אחד",
    description: "מערכת אחת לתזונה, אימונים, מעקב התקדמות ופעילות יומית — בקצב שלכם.",
    images: [{ url: "/join/opengraph-image", width: 1200, height: 630, alt: "LIFE FIT — אימונים, תזונה ומעקב במקום אחד" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LIFE FIT | אימונים, תזונה ומעקב במקום אחד",
    description: "מערכת אחת לתזונה, אימונים, מעקב התקדמות ופעילות יומית — בקצב שלכם.",
    images: ["/join/opengraph-image"],
  },
};

const signupHref = "#pricing";
const paymentHref = "https://pay.grow.link/OTMxMA~7a4a3ee5af9d1d02a1d30643953eee92-NDAzMjM4MA";

type PhoneProps = {
  screen: "nutrition" | "nutritionMeal" | "nutritionSwap" | "progress" | "progressPhotos" | "progressMeasurements" | "activity" | "activitySteps" | "activitySleep" | "support" | "chat" | "workout" | "workoutSets" | "workoutTimer" | "checkin" | "checkinHistory" | "checkinSummary" | "courses" | "tipDetail" | "tipHistory" | "library" | "libraryCategory" | "libraryDetail";
  alt: string;
  className?: string;
  priority?: boolean;
};

function AppScreen({ screen }: Pick<PhoneProps, "screen">) {
  if (screen === "activitySteps" || screen === "activitySleep") {
    const steps = screen === "activitySteps";
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div>
      <small className={styles.appKicker}>פעילות והתאוששות</small><h4>{steps ? "הצעדים שלי" : "השינה שלי"}</h4><p className={styles.appSub}>נתונים שנקראו מ־Apple Health לאחר הרשאה</p>
      <div className={styles.healthFocus}>
        <span>{steps ? <Footprints size={18} aria-hidden="true" /> : <MoonStar size={18} aria-hidden="true" />}</span>
        <small>{steps ? "צעדים היום" : "שינה אחרונה"}</small><b>{steps ? "8,460" : "7:35 שעות"}</b><em>{steps ? "מתוך יעד 10,000" : "מתוך יעד 8 שעות"}</em><i><u style={{width:steps ? "84.6%" : "94.8%"}} /></i>
      </div>
      <div className={`${styles.healthTrend} ${steps ? "" : styles.sleepTrend}`} aria-label={steps ? "מגמת צעדים בשבעת הימים האחרונים" : "מגמת שינה בשבעת הלילות האחרונים"}><small>{steps ? "מגמת שבעה ימים" : "שבעת הלילות האחרונים"}</small><div><i/><i/><i/><i/><i/><i/><i/></div><b>{steps ? "ממוצע שבועי: 8,120 צעדים" : "ממוצע שבועי: 7:18 שעות"}</b></div>
      <div className={styles.healthInsight}><span>✓</span><div><b>{steps ? "קרובים ליעד הצעדים" : "קרובים ליעד השינה"}</b><p>{steps ? "עוד 1,540 צעדים כדי להשלים את היעד היומי." : "עוד 25 דקות כדי להשלים את יעד השינה."}</p></div></div>
    </div>;
  }
  if (screen === "support") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div>
      <small className={styles.appKicker}>שירות ותמיכה</small><h4>איך אפשר לעזור?</h4><p className={styles.appSub}>פנייה קצרה מגיעה ישירות לצוות השירות</p>
      <div className={styles.supportTopic}><span><MessageCircle size={17} /></span><div><b>יש לי שאלה על השימוש</b><small>עזרה בתפעול ובהגדרות</small></div><em>←</em></div>
      <div className={styles.supportTopic}><span>!</span><div><b>משהו לא עובד</b><small>דיווח על תקלה באפליקציה</small></div><em>←</em></div>
      <div className={styles.supportTopic}><span>+</span><div><b>חסר לי משהו</b><small>בקשה או רעיון לשיפור</small></div><em>←</em></div>
      <div className={styles.supportNote}><b>אנחנו כאן בשבילכם</b><p>הפנייה נשמרת וצוות השירות חוזר אליכם דרך פרטי הקשר בחשבון.</p></div>
    </div>;
  }
  if (screen === "activity") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div>
      <small className={styles.appKicker}>פעילות והתאוששות</small><h4>התמונה של היום</h4><p className={styles.appSub}>נתונים שנקראו מ־Apple Health לאחר הרשאה</p>
      <div className={styles.healthMetrics}>
        <div><span><Footprints size={14} aria-hidden="true" /></span><small>צעדים היום</small><b>8,460</b><em>מתוך יעד 10,000</em><i><u style={{width:"84.6%"}} /></i></div>
        <div><span><MoonStar size={14} aria-hidden="true" /></span><small>שינה אחרונה</small><b>7:35 שעות</b><em>מתוך יעד 8 שעות</em><i><u style={{width:"94.8%"}} /></i></div>
      </div>
      <div className={styles.healthTrend} aria-label="מגמת צעדים בשבעת הימים האחרונים"><small>מגמת שבעה ימים</small><div><i/><i/><i/><i/><i/><i/><i/></div><b>ממוצע שבועי: 8,120 צעדים</b></div>
      <div className={styles.healthInsight}><span>✓</span><div><b>קרובים ליעד השינה</b><p>הנתונים מופיעים לצד האימונים, התזונה וההתקדמות בתמונת היום.</p></div></div>
    </div>;
  }
  if (screen === "workoutSets") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>אימון ידיים · תרגיל 2 מתוך 6</small><h4>כפיפת מרפקים</h4><p className={styles.appSub}>מתחילים בחימום ורק אז עולים לסטים העובדים</p>
      <div className={styles.warmupCard}><span>חימום</span><b>סט הכנה</b><small>12 חזרות · 7.5 ק״ג · לא נרשם לנפח העבודה</small><em>הושלם ✓</em></div>
      <div className={styles.liveSetTable}><span>סט</span><span>משקל</span><span>חזרות</span><span>סטטוס</span><b>חימום</b><b>7.5 ק״ג</b><b>12</b><em>✓</em><b>1</b><b>12.5 ק״ג</b><b>10</b><em>✓</em><b>2</b><b>12.5 ק״ג</b><b>10</b><i>עכשיו</i><b>3</b><b>12.5 ק״ג</b><b>10</b><i>ממתין</i></div>
      <button className={styles.screenButton}>סיום סט 2</button><div className={styles.fakeNav}><span>בית</span><span>תזונה</span><strong>אימונים</strong><span>התקדמות</span></div>
    </div>;
  }
  if (screen === "workoutTimer") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>מנוחה בין הסטים</small><h4>הסט הבא כבר מחכה</h4><p className={styles.appSub}>כפיפת מרפקים · סט 3 מתוך 3</p>
      <div className={styles.restTimer}><div><AnimatedTimer /><small>מתוך 60 שניות</small></div></div>
      <div className={styles.nextSet}><small>הסט הבא</small><b>12.5 ק״ג × 10 חזרות</b><span>בסט הקודם: 10 חזרות הושלמו</span></div>
      <div className={styles.timerActions}><button>+30 שנ׳</button><button>דלג</button></div>
      <div className={styles.timerSales}><b>פחות זמן בחדר הכושר. יותר פוקוס בכל סט.</b><span>הטיימר עוצר את מריחות הזמן בין הסטים ומחזיר אתכם לביצוע בדיוק ברגע הנכון, כדי לסיים אימון ממוקד ויעיל יותר בפחות זמן.</span></div><div className={styles.fakeNav}><span>בית</span><span>תזונה</span><strong>אימונים</strong><span>התקדמות</span></div>
    </div>;
  }
  if (screen === "nutritionMeal") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>ארוחת צהריים</small><h4>מה אוכלים היום?</h4><p className={styles.appSub}>הערכים לפי משקל המזון לאחר בישול</p>
      <div className={styles.mealMacro}><div><b>639</b><small>קלוריות</small></div><div><b>53 ג׳</b><small>חלבון</small></div><div><b>57 ג׳</b><small>פחמימה</small></div></div>
      <div className={styles.foodLine}><span>🍗</span><div><b>פרגית ללא עור</b><small>180 גרם · כ־376 קל׳</small></div><em>עיקרית</em></div><div className={styles.foodLine}><span>🍚</span><div><b>אורז בסמטי מבושל</b><small>160 גרם · כ־208 קל׳</small></div></div><div className={styles.foodLine}><span>🥗</span><div><b>סלט ישראלי ללא שמן</b><small>250 גרם · כ־55 קל׳</small></div></div>
      <button className={styles.screenButton}>סימון הארוחה כנאכלה</button><div className={styles.fakeNav}><span>בית</span><strong>תזונה</strong><span>אימונים</span><span>התקדמות</span></div>
    </div>;
  }
  if (screen === "nutritionSwap") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>החלפה חכמה</small><h4>בא לכם משהו אחר?</h4><p className={styles.appSub}>ערכים משוערים לפי מתכון ומשקל לאחר בישול</p>
      <div className={styles.swapFrom}><small>במקום</small><b>180 גרם פרגית ללא עור</b><span>כ־376 קל׳ · כ־47 ג׳ חלבון</span></div>
      <div className={styles.swapArrow}>↓</div>
      <div className={styles.swapOption}><span className={styles.foodPhoto}><Image src="/landing/schnitzel.png" alt="שניצל ביתי" fill sizes="36px" /></span><div><small>אפשרות 1</small><b>200 גרם שניצל ביתי אפוי</b><em>כ־410 קל׳ · כ־44 ג׳ חלבון</em></div><strong>בחירה</strong></div><div className={styles.swapOption}><span>🥩</span><div><small>אפשרות 2</small><b>150 גרם בקר רזה מבושל</b><em>כ־320 קל׳ · כ־40 ג׳ חלבון</em></div><strong>בחירה</strong></div>
      <div className={styles.swapNote}>הכמות המדויקת מותאמת למתכון וליעד שלכם</div><div className={styles.fakeNav}><span>בית</span><strong>תזונה</strong><span>אימונים</span><span>התקדמות</span></div>
    </div>;
  }
  if (screen === "nutrition") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div>
      <small className={styles.appKicker}>התזונה שלי</small>
      <h4>הארוחות של היום</h4>
      <p className={styles.appSub}>2 מתוך 4 ארוחות הושלמו</p>
      <div className={styles.macroRow}><div><span>קלוריות</span><b>1,420</b><small>מתוך 2,050</small></div><div><span>חלבון</span><b>112 גרם</b><small>מתוך 150</small></div></div>
      <div className={styles.mealCard}><span className={styles.mealStatus}>הושלם</span><small>08:30</small><b>ארוחת בוקר</b><p>חביתה, לחם מלא וירקות</p><div className={styles.progressLine}><i style={{width:"100%"}} /></div></div>
      <div className={styles.mealCard}><span className={styles.mealNext}>הארוחה הבאה</span><small>13:30</small><b>ארוחת צהריים</b><p>פרגית, אורז וסלט ישראלי</p><button>לצפייה בארוחה</button></div>
      <div className={styles.fakeNav}><span>בית</span><strong>תזונה</strong><span>אימונים</span><span>התקדמות</span></div>
    </div>;
  }
  if (screen === "progress") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div>
      <small className={styles.appKicker}>ההתקדמות שלי</small>
      <h4>רואים את העבודה</h4>
      <p className={styles.appSub}>סיכום 8 השבועות האחרונים</p>
      <div className={styles.weightCard}><small>משקל נוכחי</small><b>82.4 ק״ג</b><span>↓ 4.8 ק״ג</span></div>
      <div className={styles.chart} aria-label="גרף ירידה במשקל"><i/><i/><i/><i/><i/><i/><i/></div>
      <div className={styles.progressStats}><div><b>12</b><small>אימונים</small></div><div><b>92%</b><small>התמדה</small></div><div><b>־6 ס״מ</b><small>היקף מותן</small></div></div>
      <div className={styles.insight}><span>✓</span><div><b>שבוע מצוין</b><p>עמדת ביעד האימונים והתזונה. ממשיכים באותו קצב.</p></div></div>
      <div className={styles.fakeNav}><span>בית</span><span>תזונה</span><span>אימונים</span><strong>התקדמות</strong></div>
    </div>;
  }
  if (screen === "progressPhotos") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>השוואת תמונות</small><h4>רואים את השינוי</h4><p className={styles.appSub}>אותה זווית · אותו אור · 8 שבועות בין התמונות</p>
      <div className={styles.weightCard}><small>היקף מותן</small><b>86 ס״מ</b><span>↓ 6 ס״מ</span></div><div className={styles.chart} aria-label="מגמת שינוי בהיקפים"><i/><i/><i/><i/><i/><i/><i/></div><div className={styles.progressStats}><div><b>8</b><small>שבועות</small></div><div><b>4</b><small>תמונות</small></div><div><b>־6 ס״מ</b><small>מותן</small></div></div><div className={styles.insight}><span>✓</span><div><b>הגוף משתנה</b><p>התמונות והמדידות מראות התקדמות גם כשהמשקל נעצר.</p></div></div>
    </div>;
  }
  if (screen === "progressMeasurements") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>מדידות וביצועים</small><h4>יותר חזק. יותר מדויק.</h4><p className={styles.appSub}>כל המדדים שמראים שהעבודה באמת משתלמת</p>
      <div className={styles.progressStats}><div><b>+12%</b><small>כוח</small></div><div><b>־4.8</b><small>ק״ג</small></div><div><b>92%</b><small>התמדה</small></div></div><div className={styles.chart} aria-label="גרף שיפור בביצועים"><i/><i/><i/><i/><i/><i/><i/></div><div className={styles.weightCard}><small>אימונים שהושלמו</small><b>12 אימונים</b><span>שיא חדש</span></div><div className={styles.insight}><span>✓</span><div><b>המגמה חיובית</b><p>המשקל, ההיקפים והביצועים מתקדמים יחד.</p></div></div>
    </div>;
  }
  if (screen === "workout") {
    return <div className={styles.appScreen}>
      <div className={styles.sessionPreviewHead}><div><small>תוכנית כוח · אימון B</small><b>אימון ידיים</b></div><div><small>טיימר אימון</small><b>24:18</b><span>5/12 סטים</span></div><i><em style={{width:"42%"}} /></i></div>
      <div className={styles.nativeExerciseCard}><header><span><Dumbbell size={24}/></span><div><small>תרגיל 2 מתוך 6</small><h4>כפיפת מרפקים</h4></div></header><div className={styles.nativeChips}><span>יד קדמית</span><span>משקולות</span><b>סרטון הסבר טכניקה ↗</b><b>דגשים לתרגיל</b></div><div className={styles.nativeStats}><div><small>סטים</small><b>3</b></div><div><small>חזרות</small><b>10</b></div><div><small>מנוחה</small><b>60 שנ׳</b></div><div><small>רמת מאמץ</small><b>RPE 8</b></div></div><p>מרפקים צמודים לגוף. עלייה ללא תנופה וירידה בשליטה.</p></div>
      <button className={styles.screenButton}>המשך לרישום הסטים</button><div className={styles.fakeNav}><span>בית</span><span>תזונה</span><strong>אימונים</strong><span>התקדמות</span></div>
    </div>;
  }
  if (screen === "checkin") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>הצ׳ק־אין שלי</small><h4>איך עבר השבוע?</h4><p className={styles.appSub}>שתי דקות שעוזרות לדייק את השבוע הבא</p>
      <div className={styles.checkScore}><span>רמת אנרגיה</span><div><i/><i/><i/><i/><i className={styles.off}/></div><b>4 מתוך 5</b></div>
      <div className={styles.checkQuestion}><b>איך הייתה ההתמדה בתזונה?</b><div><span>מצוינת</span><span className={styles.selected}>טובה</span><span>מאתגרת</span></div></div>
      <div className={styles.checkQuestion}><b>מה תרצו לשפר השבוע?</b><p>להתארגן מראש עם הארוחות לעבודה</p></div>
      <button className={styles.screenButton}>שליחת צ׳ק־אין</button><div className={styles.fakeNav}><span>בית</span><span>תזונה</span><span>אימונים</span><strong>צ׳ק־אין</strong></div>
    </div>;
  }
  if (screen === "checkinHistory") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>הצ׳ק־אינים שלי</small><h4>ארבעה שבועות ברצף</h4><p className={styles.appSub}>ככה מזהים דפוס לפני שהוא הופך לעצירה</p>
      <div className={styles.checkScore}><span>מגמת התמדה</span><div><i/><i/><i/><i/><i/></div><b>שיפור של 18%</b></div><div className={styles.checkQuestion}><b>השבוע האחרון</b><p>אנרגיה טובה · 3 אימונים · תזונה יציבה</p></div><div className={styles.checkQuestion}><b>מה חוזר על עצמו?</b><p>ימי עבודה ארוכים מקשים על ארוחת הצהריים</p></div><button className={styles.screenButton}>לצפייה בהיסטוריה</button>
    </div>;
  }
  if (screen === "checkinSummary") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>סיכום הצ׳ק־אין</small><h4>השבוע הבא כבר מדויק יותר</h4><p className={styles.appSub}>התוכנית מתעדכנת לפי מה שקרה באמת</p>
      <div className={styles.checkQuestion}><b>מה עבד?</b><p>הכנת ארוחות מראש שמרה על התזונה גם בימים עמוסים</p></div><div className={styles.checkQuestion}><b>מה משנים?</b><p>מעבירים את האימון השלישי ליום שישי בבוקר</p></div><div className={styles.checkScore}><span>יעד לשבוע הבא</span><div><i/><i/><i/><i/><i className={styles.off}/></div><b>4 אימונים מתוכננים</b></div><button className={styles.screenButton}>שמירת היעדים</button>
    </div>;
  }
  if (screen === "courses") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>ידע שעובד בחיים</small><h4>הטיפ השבועי</h4><p className={styles.appSub}>רעיון אחד קטן שיכול לשנות את כל השבוע</p>
      <div className={styles.courseMain}><span>הטיפ של השבוע</span><h5>לאכול נכון גם כשאין זמן</h5><p>4 דקות קריאה · כולל משימה מעשית</p><div><i style={{width:"67%"}} /></div><button>להמשך קריאה</button></div>
      <div className={styles.courseRow}><span>01</span><div><b>לבנות צלחת שמשביעה</b><small>הטיפ הקודם</small></div><em>✓</em></div><div className={styles.courseRow}><span>02</span><div><b>קניות בלי ליפול בפיתויים</b><small>טיפ שמור</small></div></div>
      <div className={styles.fakeNav}><span>בית</span><strong>טיפים</strong><span>אימונים</span><span>התקדמות</span></div>
    </div>;
  }
  if (screen === "tipDetail") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>הטיפ השבועי</small><h4>צלחת שמשביעה באמת</h4><p className={styles.appSub}>ארבע דקות קריאה, שינוי שאפשר ליישם כבר היום</p>
      <div className={styles.courseMain}><span>המשימה השבועית</span><h5>חלבון וירקות לפני התוספת</h5><p>בנו את הצלחת בסדר הנכון כדי להישאר שבעים לאורך זמן</p><div><i style={{width:"100%"}} /></div><button>סימון כבוצע</button></div><div className={styles.courseRow}><span>01</span><div><b>בחרו מקור חלבון</b><small>שלב ראשון</small></div><em>✓</em></div><div className={styles.courseRow}><span>02</span><div><b>הוסיפו ירקות ונפח</b><small>שלב שני</small></div></div>
    </div>;
  }
  if (screen === "tipHistory") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>הטיפים ששמרתי</small><h4>הרגל קטן בכל שבוע</h4><p className={styles.appSub}>כל מה שכבר יישמתם נשאר זמין במקום אחד</p>
      <div className={styles.courseRow}><span>01</span><div><b>לאכול נכון גם כשאין זמן</b><small>הושלם השבוע</small></div><em>✓</em></div><div className={styles.courseRow}><span>02</span><div><b>קניות בלי ליפול בפיתויים</b><small>נשמר לקריאה</small></div></div><div className={styles.courseRow}><span>03</span><div><b>איך חוזרים אחרי חריגה</b><small>הושלם</small></div><em>✓</em></div><div className={styles.courseRow}><span>04</span><div><b>שינה שמקדמת תוצאה</b><small>3 דקות קריאה</small></div></div>
    </div>;
  }
  if (screen === "library") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>נטפליקס של עולם התזונה והכושר</small><h4>התכנים שלי</h4><p className={styles.appSub}>ללמוד בקצב שלכם וליישם בחיים</p>
      <div className={styles.libraryScroll}><div className={styles.libraryScrollTrack}>
        <div className={styles.libraryFeatured}><Image src="/content/courses/nutrition/cover.jpg" alt="קורס תזונה מעשית" fill sizes="230px" /><div><small>הקורס המומלץ</small><b>תזונה שעובדת בחיים האמיתיים</b><span>8 שיעורים · 62% הושלמו</span></div></div>
        <div className={styles.libraryGrid}>
          <div><Image src="/content/courses/training/cover.png" alt="קורס אימונים" fill sizes="110px"/><b>להתאמן נכון</b><small>6 שיעורים</small></div><div><Image src="/content/courses/mindset-habits/cover.png" alt="קורס הרגלים" fill sizes="110px"/><b>הרגלים שמחזיקים</b><small>5 שיעורים</small></div>
          <div><Image src="/content/courses/weight-basics/cover.png" alt="קורס משקל ומדדים" fill sizes="110px"/><b>להבין את המשקל</b><small>7 שיעורים</small></div><div><Image src="/content/courses/sleep-science/cover.jpg" alt="קורס שינה והתאוששות" fill sizes="110px"/><b>שינה והתאוששות</b><small>6 שיעורים</small></div>
          <div><Image src="/content/courses/body-type/cover.jpg" alt="קורס גנטיקה ומבנה הגוף" fill sizes="110px"/><b>גנטיקה ומבנה הגוף</b><small>5 שיעורים</small></div><div><Image src="/content/courses/guides/cover.png" alt="מדריכים להורדה" fill sizes="110px"/><b>מדריכים מעשיים</b><small>9 מדריכים</small></div>
        </div>
      </div></div>
      <div className={styles.fakeNav}><span>בית</span><strong>תוכן</strong><span>אימונים</span><span>התקדמות</span></div>
    </div>;
  }
  if (screen === "libraryCategory") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>נטפליקס של עולם התזונה והכושר</small><h4>תזונה בחיים האמיתיים</h4><p className={styles.appSub}>שיעורים קצרים שמסדרים את כל מה שהיה מבלבל</p>
      <div className={styles.courseMain}><span>המסלול הנצפה ביותר</span><h5>לבנות תזונה שאפשר להתמיד בה</h5><p>8 שיעורים · 62% הושלמו</p><div><i style={{width:"62%"}} /></div><button>המשך לשיעור הבא</button></div><div className={styles.courseRow}><span>01</span><div><b>קלוריות בלי להסתבך</b><small>הושלם</small></div><em>✓</em></div><div className={styles.courseRow}><span>02</span><div><b>חלבון וכמויות</b><small>השיעור הבא</small></div></div>
    </div>;
  }
  if (screen === "libraryDetail") {
    return <div className={styles.appScreen}>
      <div className={styles.appTop}><span>START</span><b>9:41</b></div><small className={styles.appKicker}>שיעור 4 מתוך 8</small><h4>איך לאכול בחוץ</h4><p className={styles.appSub}>בלי לוותר על החיים ובלי לאבד את הכיוון</p>
      <div className={styles.courseMain}><span>שיעור מעשי</span><h5>שלוש החלטות לפני שמזמינים</h5><p>6 דקות צפייה · כולל דף סיכום</p><div><i style={{width:"48%"}} /></div><button>המשך צפייה</button></div><div className={styles.checkQuestion}><b>מה לוקחים מהשיעור?</b><p>בוחרים חלבון, מחליטים על תוספת ושומרים מקום למה שבאמת רוצים.</p></div><div className={styles.courseRow}><span>✓</span><div><b>השיעור נשמר</b><small>אפשר לחזור אליו בכל רגע</small></div><em>✓</em></div>
    </div>;
  }
  return <div className={styles.appScreen}>
    <div className={styles.appTop}><span>START</span><b>9:41</b></div>
    <small className={styles.appKicker}>הליווי שלי</small>
    <h4>שיחה עם המאמן</h4>
    <p className={styles.appSub}>זמין ועוקב אחרי ההתקדמות שלך</p>
    <div className={styles.coachProfile}><span>א</span><div><b>איתי, המאמן שלך</b><small>מחובר עכשיו</small></div></div>
    <div className={`${styles.bubble} ${styles.coachBubble}`}>בוקר טוב דניאל 👋 ראיתי שסגרת את כל האימונים השבוע. איך הרגשת באימון האחרון?</div>
    <div className={`${styles.bubble} ${styles.userBubble}`}>היה מעולה. בסקוואט הרגשתי שאני יכול לעלות משקל.</div>
    <div className={`${styles.bubble} ${styles.coachBubble}`}>מצוין. באימון הבא תעלה ל־70 ק״ג ותשמור על 8 חזרות נקיות. עדכנתי לך בתוכנית 💪</div>
    <div className={styles.chatInput}>כתיבת הודעה... <span>←</span></div>
    <div className={styles.fakeNav}><span>בית</span><span>תזונה</span><span>אימונים</span><strong>הודעות</strong></div>
  </div>;
}

function AppBottomNav({ screen }: Pick<PhoneProps, "screen">) {
  const nutrition = screen === "nutrition" || screen === "nutritionMeal" || screen === "nutritionSwap";
  const workout = screen === "workout" || screen === "workoutSets" || screen === "workoutTimer";
  const checkin = screen === "checkin" || screen === "checkinHistory" || screen === "checkinSummary";
  const progress = screen === "progress" || screen === "progressPhotos" || screen === "progressMeasurements" || screen === "activity" || screen === "activitySteps" || screen === "activitySleep";
  const library = screen === "library" || screen === "libraryCategory" || screen === "libraryDetail";
  const tips = screen === "courses" || screen === "tipDetail" || screen === "tipHistory";
  const lastLabel = checkin ? "צ׳ק־אין" : screen === "chat" || screen === "support" ? "הודעות" : screen === "activity" || screen === "activitySteps" || screen === "activitySleep" ? "פעילות" : "התקדמות";
  const contentLabel = library ? "תוכן" : tips ? "טיפים" : "תזונה";

  return <div className={`${styles.fakeNav} ${styles.fixedPhoneNav}`}>
    <span>בית</span>
    {nutrition || library || tips ? <strong>{contentLabel}</strong> : <span>{contentLabel}</span>}
    {workout ? <strong>אימונים</strong> : <span>אימונים</span>}
    {progress || checkin || screen === "chat" || screen === "support" ? <strong>{lastLabel}</strong> : <span>{lastLabel}</span>}
  </div>;
}

function Phone({ screen, alt, className = "" }: PhoneProps) {
  return (
    <div className={`${styles.phone} ${className}`} data-screen={screen} aria-label={alt}>
      <div className={styles.phoneSpeaker} aria-hidden="true" />
      <div className={styles.phoneScreen}>
        <div className={styles.appCanvas}>
          <AppScreen screen={screen} />
        </div>
        <AppBottomNav screen={screen} />
      </div>
    </div>
  );
}

function MobilePhoneTrio({ screens, label, className = "" }: {
  screens: [PhoneProps["screen"], PhoneProps["screen"], PhoneProps["screen"]];
  label: string;
  className?: string;
}) {
  return <div className={`${styles.mobilePhoneTrio} ${className}`} aria-label={label}>
    {screens.map((screen, index) => <Phone key={`${screen}-${index}`} screen={screen} alt={`${label} — מסך ${index + 1}`} />)}
  </div>;
}

const mobileStoryScreens: Partial<Record<PhoneProps["screen"], [PhoneProps["screen"], PhoneProps["screen"], PhoneProps["screen"]]>> = {
  checkin: ["checkinHistory", "checkin", "checkinSummary"],
  progress: ["progressPhotos", "progress", "progressMeasurements"],
  library: ["libraryCategory", "library", "libraryDetail"],
  courses: ["tipHistory", "courses", "tipDetail"],
};

function StoryLabelIcon({ screen }: Pick<PhoneProps, "screen">) {
  if (screen === "nutrition") return <Utensils size={20} strokeWidth={2.3} />;
  if (screen === "workout") return <Dumbbell size={20} strokeWidth={2.3} />;
  if (screen === "checkin") return <ClipboardCheck size={20} strokeWidth={2.3} />;
  if (screen === "progress") return <BarChart3 size={20} strokeWidth={2.3} />;
  if (screen === "activity" || screen === "activitySteps" || screen === "activitySleep") return <Footprints size={20} strokeWidth={2.3} />;
  if (screen === "library") return <BookOpen size={20} strokeWidth={2.3} />;
  return <Lightbulb size={20} strokeWidth={2.3} />;
}

const plans = [
  {
    name: "DIGITAL",
    kicker: "כל מה שצריך כדי להתקדם במקום אחד.",
    price: "97",
    features: [
      { text: "תוכנית תזונה ברורה: יודעים בדיוק מה לאכול, באיזו כמות ובאיזה שלב ביום, בלי לנחש ובלי לחשב הכול לבד." },
      { text: "חלופות וכמויות לכל ארוחה: מחליפים מזון או ארוחה בהתאם למה שיש בבית, כדי לסייע לכם להישאר במסגרת היעד." },
      { text: "מעקב קלוריות וחלבון: רואים בזמן אמת כמה צרכתם וכמה נשאר לכם כדי לעמוד במטרה היומית." },
      { text: "תוכנית אימונים מלאה: כל אימון מגיע מוכן עם חימום, סדר תרגילים, סטים, חזרות ומשקלים." },
      { text: "סרטון הסבר לכל תרגיל: רואים את אופן הביצוע לפני שמתחילים את התרגיל." },
      { text: "דגשי ביצוע: הנחיות ברורות שעוזרות לבצע כל תרגיל בצורה מסודרת יותר." },
      { text: "טיימר מנוחה מובנה: שומר על הקצב בין הסטים ועוזר לצמצם מריחות זמן." },
      { text: "היסטוריית ביצועים: כל המשקלים, החזרות והאימונים נשמרים כדי שתדעו בדיוק איפה השתפרתם." },
      { text: "מעקב התקדמות מלא: משקל, היקפים ותמונות במקום אחד, כדי לראות שינוי גם כשהמשקל לא זז." },
      { text: "מעקב צעדים ושינה: נתוני הפעילות והשינה מוצגים לצד האימונים, התזונה וההתקדמות." },
      { text: "צ׳ק־אין שבועי: מסכמים את השבוע ורואים במקום אחד מה עבד ומה היה מאתגר." },
      { text: "נטפליקס של עולם התזונה והכושר: תכנים מסודרים על תזונה, אימונים, שינה, הרגלים, מוטיבציה והתמודדות עם תקיעות." },
      { text: "הטיפ השבועי: פעולה אחת קצרה ומעשית שאפשר ליישם מיד ולהפוך בהדרגה להרגל." },
    ],
    cta: "מתחילים להתקדם עכשיו",
    featured: true,
  },
];

const productStories: Array<{screen: PhoneProps["screen"]; label: string; title: string; text: string; points: string[]}> = [
  { screen: "nutrition", label: "תזונה", title: "לא עוד תפריט ששומרים. תזונה שבאמת חיים איתה.", text: "פותחים את האפליקציה ורואים בדיוק מה לאכול, כמה ומתי. ואם היום השתנה, מחליפים ארוחה בלי להרוס את התהליך.", points: ["לדעת מה וכמה לאכול בלי לחשב הכול לבד", "להחליף ארוחה ועדיין להישאר בכיוון של המטרה", "לראות בזמן אמת אם אתם עומדים בקלוריות ובחלבון"] },
  { screen: "workout", label: "אימונים", title: "כל אימון מתחיל בדיוק מהמקום שבו עצרתם.", text: "התרגילים, החימום, הסטים, החזרות וזמני המנוחה כבר מחכים לכם. פחות התעסקות בטלפון ויותר סדר ורצף במהלך האימון.", points: ["דגשים ברורים לביצוע כל תרגיל", "סרטון ביצוע שממחיש את התנועה לפני שמתחילים", "חימום, סטים, חזרות ומשקלים במסך אחד", "טיימר שעוזר לשמור על זמני המנוחה", "היסטוריית ביצועים מלאה"] },
  { screen: "checkin", label: "צ׳ק־אין", title: "שתי דקות בשבוע ששומרות על חודשים של התקדמות.", text: "הצ׳ק־אין מחבר בין מה שתכננתם לבין מה שקרה בפועל, כדי לזהות קושי מוקדם ולהבין מה כדאי לבדוק בשבוע הבא.", points: ["לסכם את השבוע בשתי דקות, בלי טבלאות מסורבלות", "להבין אם עייפות או עומס פוגעים בהתמדה", "לזהות בזמן מתי כדאי לשנות כיוון"] },
  { screen: "progress", label: "התקדמות", title: "כשהתוצאה מול העיניים, הרבה יותר קשה לוותר.", text: "המשקל הוא רק חלק מהסיפור. האפליקציה מרכזת היקפים, תמונות, אימונים ומגמות כדי שתראו את התמונה המלאה.", points: ["לראות שינוי גם כשהמספר על המשקל לא זז", "להשוות תמונות ולהרגיש שהעבודה באמת משתלמת", "לדעת מה עובד ולחזור על הפעולות שמביאות תוצאה"] },
  { screen: "activity", label: "פעילות והתאוששות", title: "הגוף ממשיך לעבוד גם מחוץ לאימון.", text: "הצעדים והשינה מתחברים לתמונה היומית שלכם, כדי להבין איך הפעילות וההתאוששות משפיעות על ההתקדמות ולקבל החלטות מדויקות יותר לאורך הדרך.", points: ["מעקב אחר מספר הצעדים והעמידה ביעד היומי", "מעקב אחר שעות השינה וההתאוששות", "הצגת מגמות לצד האימונים, התזונה וההתקדמות", "חיבור אוטומטי לנתוני הבריאות של הטלפון במכשירים נתמכים"] },
  { screen: "library", label: "נטפליקס של עולם התזונה והכושר", title: "כל מה שצריך לדעת כדי להשיג תוצאה ולשמור עליה.", text: "לא רק תזונה ואימונים. תלמדו לקבל החלטות נכונות לבד, להבין מה משפיע על הגוף ולהמשיך להתקדם גם כשהחיים משתנים.", points: ["להבין תנודות במשקל ולא להילחץ מכל עלייה", "לבנות תזונה שאפשר להתמיד בה גם מחוץ לבית", "להתאמן נכון ולהפיק יותר מכל אימון", "לשפר שינה והתאוששות כדי להגיע עם יותר אנרגיה", "להבין את מבנה הגוף ולהציב ציפיות מציאותיות", "להטמיע הרגלים שנשארים גם כשהמוטיבציה יורדת", "לעצור התקפי אכילה לפני שהם מוחקים שבוע של עבודה", "לקבל מדריכים מוכנים שחוסכים ניסוי וטעייה", "לקבל תשובות ברורות לשאלות תזונה נפוצות", "לפתור ספקות באימון ולבצע בביטחון", "ללמוד בדרך גם בנסיעה, בהליכה או בזמן הפנוי"] },
  { screen: "courses", label: "הטיפ השבועי", title: "פחות מידע. טיפ אחד שבאמת מיישמים השבוע.", text: "בכל שבוע מחכה לכם טיפ קצר ופרקטי שיעזור להתמודד טוב יותר עם אוכל, אימונים, ימים עמוסים ורגעים שבהם המוטיבציה יורדת.", points: ["לקבל רעיון אחד ברור במקום ללכת לאיבוד בעודף מידע", "ליישם פעולה קטנה כבר באותו היום", "להפוך ידע להרגל שעובד גם בחיים עמוסים"] },
];

const healthFaqAnswer = "באפליקציית LIFE FIT ל־iPhone, הצעדים ושעות השינה נקראים מ־Apple Health לאחר שתאשרו הרשאת קריאה. LIFE FIT אינה כותבת נתונים ל־Apple Health. ב־Android חיבור Health Connect עדיין אינו זמין, ובגרסת הדפדפן אין גישה לנתוני הבריאות של הטלפון. מתן ההרשאה הוא לבחירתכם, ואפשר לבטל אותה בכל עת בהגדרות הבריאות או הפרטיות של ה־iPhone; שאר חלקי המערכת ממשיכים לפעול גם ללא ההרשאה.";

const faqStructuredData = [
  { question: "איך פועל מעקב הצעדים והשינה?", answer: healthFaqAnswer },
  { question: "כמה עולה המינוי?", answer: "המינוי עולה 97 ₪ לחודש ומתחדש אוטומטית מדי חודש, עד לביטול. אין התחייבות ואפשר לבטל לפני מועד החיוב הבא." },
  { question: "אפשר לבטל?", answer: "אפשר לבטל את החידוש לפני מועד החיוב הבא, ולהמשיך להשתמש במסלול עד סוף התקופה שכבר שולמה. הביטול עוצר חיובים עתידיים ואינו מוחק מיד את הגישה שלכם." },
];

const landingJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "LIFE FIT DIGITAL",
      applicationCategory: "HealthApplication",
      operatingSystem: "iOS, Android, Web",
      url: "https://elicohenfitness.co.il/",
      description: "מערכת לתוכניות אימונים ותזונה, מעקב התקדמות ונתוני פעילות במכשירים נתמכים.",
      offers: { "@type": "Offer", price: "97", priceCurrency: "ILS", url: paymentHref, category: "subscription" },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqStructuredData.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ],
};

export default function JoinPage() {
  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd).replace(/</g, "\\u003c") }} />
      <CleanLandingUrl />
      <header className={styles.nav}>
        <Link className={styles.logo} href="/join" aria-label="LIFE FIT, דף הבית">
          <span>LIFE FIT</span>
        </Link>
        <nav className={styles.navLinks} aria-label="ניווט בדף">
          <a href="#difference">למה זה עובד</a>
          <a href="#inside">מה מקבלים</a>
          <a href="#pricing">מחיר</a>
        </nav>
        <a className={styles.navCta} href={signupHref}>מצטרפים עכשיו</a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}><CheckCircle2 size={16} /> תוכנית ברורה. מעקב אמיתי. תוצאות שרואים.</div>
          <h1>
            המאמן האישי שלכם.
            <span> בלי המחיר של מאמן אישי.</span>
          </h1>
          <p className={styles.heroLead}>
            אימונים, תזונה, מעקב ותובנות אוטומטיות במערכת אחת שחיה איתכם בכיס. בלי לפזר את המידע בין כמה מקומות,
            בלי לנחש מה לאכול ובלי להיות תלויים ביומן של מישהו אחר.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href={signupHref}>אני רוצה להתחיל <ArrowLeft size={19} /></a>
            <a className={styles.textButton} href="#inside">תראו לי איך זה עובד <ChevronDown size={18} /></a>
          </div>
          <div className={styles.heroProof}>
            <span><CheckCircle2 size={17} /> ללא התחייבות</span>
            <span><ShieldCheck size={17} /> מחיר חודשי קבוע וברור</span>
            <span><Zap size={17} /> מתחילים בלי לבזבז זמן</span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="תצוגה מקדימה של אפליקציית LIFE FIT">
          <div className={styles.orbit} aria-hidden="true" />
          <div className={styles.heroDesktopPreview}>
            <Phone screen="nutrition" alt="מסך תזונה אמיתי באפליקציית LIFE FIT" className={styles.heroPhone} priority />
            <div className={`${styles.floatingCard} ${styles.floatingTop}`}>
              <span className={styles.miniIcon}><Utensils size={17} /></span>
              <div><b>התפריט כבר מוכן</b><small>מותאם למטרה שלכם</small></div>
            </div>
            <div className={`${styles.floatingCard} ${styles.floatingBottom}`}>
              <span className={styles.miniIcon}><BarChart3 size={17} /></span>
              <div><b>אתם בכיוון הנכון</b><small>המערכת מרכזת את המעקב</small></div>
            </div>
          </div>
          <MobilePhoneTrio screens={["nutritionMeal", "nutrition", "nutritionSwap"]} label="שלושה מסכי תזונה באפליקציה" className={styles.heroMobileTrio} />
        </div>
      </section>

      <section className={styles.stats} aria-label="היתרונות המרכזיים">
        <div><strong>24/7</strong><span>הכול זמין כשנוח לכם</span></div>
        <div><strong>97 ₪</strong><span>מחיר חודשי קבוע וברור</span></div>
        <div><strong>מקום אחד</strong><span>לאימונים, תזונה ומעקב</span></div>
      </section>

      <section className={styles.problem} id="difference">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIndex}>01 / ההבדל</span>
          <h2>אם אתם עדיין משלמים על מוטיבציה<br />אתם משלמים על הדבר הלא נכון.</h2>
            <p>ליווי אישי יכול להיות מצוין, אבל לא כל אחד צריך אותו בכל שלב. מסלול DIGITAL נותן מערכת ברורה לשימוש עצמאי, שמרכזת את התוכנית, המעקב והתובנות במקום אחד.</p>
        </div>

        <div className={styles.comparison}>
          <article className={styles.oldWay}>
            <div className={styles.comparisonLabel}><X size={18} /> הדרך הישנה</div>
            <h3>מאמן אישי קלאסי</h3>
            <div className={styles.bigPrice}>500–800 ₪ <small>בחודש</small></div>
            <ul>
              <li><X size={16} /> תלויים ביומן ובשעות פנויות</li>
              <li><X size={16} /> המידע מפוזר בין הודעות וקבצים</li>
              <li><X size={16} /> כשאין פגישה, קל לאבד כיוון</li>
              <li><X size={16} /> 6,000–9,600 ₪ בשנה</li>
            </ul>
          </article>

          <div className={styles.vs}>VS</div>

          <article className={styles.newWay}>
            <div className={styles.comparisonLabel}><Check size={18} /> הדרך החכמה</div>
            <h3>LIFE FIT</h3>
            <div className={styles.bigPrice}>97 ₪ <small>לחודש</small></div>
            <ul>
              <li><Check size={16} /> יודעים בדיוק מה לאכול ואיך להתאמן</li>
              <li><Check size={16} /> הכול מחכה לכם במקום אחד</li>
              <li><Check size={16} /> רואים התקדמות, לא רק מקווים לה</li>
              <li><Check size={16} /> מתקדמים בקצב שלכם, בכל שעה</li>
            </ul>
          </article>
        </div>
        <p className={styles.fairNote}>המערכת אינה תחליף לטיפול רפואי או לאימון שנדרש בו פיקוח אישי. היא כן חלופה מסודרת לבלגן, לניחושים ולמידע שמפוזר בין כמה מקומות.</p>
      </section>

      <section className={styles.secondChance} aria-labelledby="second-chance-title">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIndex}>02 / אם כבר ניסיתם</span>
          <h2 id="second-chance-title">לא חסר לכם כוח רצון.<br /><em>חסרה לכם דרך שמחזיקה.</em></h2>
          <p>בין אם ניסיתם לעשות הכול לבד ובין אם כבר שילמתם על ליווי, הכישלון הקודם לא אומר שאתם הבעיה. בדרך כלל פשוט לא הייתה לכם מערכת שנשארת איתכם גם ביום עמוס.</p>
        </div>

        <div className={styles.secondChanceGrid}>
          <article className={styles.triedAlone}>
            <span className={styles.pathLabel}>ניסיתי לבד</span>
            <h3>אתם לא צריכים עוד סרטון מוטיבציה.<br />אתם צריכים לדעת מה לעשות היום.</h3>
            <p>כבר שמרתם תפריטים, הורדתם תוכניות והבטחתם להתחיל ביום ראשון. זה החזיק כמה ימים, עד שהחיים נכנסו באמצע והייתם צריכים לקבל לבד יותר מדי החלטות.</p>
            <ul>
              <li><X size={17} /> כל יום מתחילים מחדש</li>
              <li><X size={17} /> לא יודעים אם מה שעושים באמת עובד</li>
              <li><X size={17} /> שינוי קטן בשגרה מפיל את כל התוכנית</li>
            </ul>
            <div className={styles.pathResolution}><CheckCircle2 size={21} /><span><b>הפעם לא מאלתרים.</b> התזונה, האימונים והמעקב מחכים במקום אחד.</span></div>
          </article>

          <article className={styles.triedCoaching}>
            <span className={styles.pathLabel}>כבר לקחתי ליווי</span>
            <h3>שילמתם על ליווי.<br />אבל בין שיחה לשיחה נשארתם לבד.</h3>
            <p>קיבלתם תפריט או תוכנית, אולי אפילו התחלתם טוב. אבל כשהגיע אירוע, שבוע לחוץ או ירידה במוטיבציה, לא הייתה מערכת שעזרה לכם להסתגל ולהמשיך.</p>
            <ul>
              <li><X size={17} /> התוכנית נשארה בקובץ או בהודעות</li>
              <li><X size={17} /> לא ראיתם את ההתקדמות בזמן אמת</li>
              <li><X size={17} /> כל סטייה הרגישה כמו חזרה לנקודת ההתחלה</li>
            </ul>
            <div className={styles.pathResolution}><CheckCircle2 size={21} /><span><b>הפעם המערכת ממשיכה איתכם.</b> בארוחה הבאה, באימון הבא ובמעקב שאחריהם.</span></div>
          </article>
        </div>
        <a className={styles.secondChanceCta} href="#pricing">הפעם אני עושה את זה אחרת <ArrowLeft size={19} /></a>
      </section>

      <section className={styles.showcase} id="inside">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIndex}>03 / המערכת</span>
          <h2>לא עוד אפליקציה שתורידו.<br /><em>מערכת שבאמת תשתמשו בה.</em></h2>
        </div>

        <div className={styles.featureGrid}>
          <article className={styles.featureCard}>
            <span className={styles.featureIcon}><Utensils size={22} /></span>
            <span className={styles.featureNumber}>01</span>
            <h3>תזונה בלי לנחש</h3>
            <p>תפריט יומי ברור, כמויות, ערכים וחלופות. פותחים, בוחרים וממשיכים ביום.</p>
          </article>
          <article className={styles.featureCard}>
            <span className={styles.featureIcon}><Dumbbell size={22} /></span>
            <span className={styles.featureNumber}>02</span>
            <h3>אימונים שיודעים איפה עצרתם</h3>
            <p>תרגילים, סטים, משקלים והיסטוריה. האימון הבא מתחיל מהנקודה שלכם, לא מאפס.</p>
          </article>
          <article className={styles.featureCard}>
            <span className={styles.featureIcon}><BarChart3 size={22} /></span>
            <span className={styles.featureNumber}>03</span>
            <h3>התקדמות שאי אפשר לפספס</h3>
            <p>משקל, מדידות וביצועים במקום אחד. כי כשאתם רואים תנועה, הרבה יותר קשה לעצור.</p>
          </article>
          <article className={styles.featureCard}>
            <span className={styles.featureIcon}><MessageCircle size={22} /></span>
            <span className={styles.featureNumber}>04</span>
            <h3>תובנות ברגע הנכון</h3>
            <p>צ׳ק־אין, סיכומים והתראות אוטומטיות שעוזרים לזהות דפוסים ולשמור על הכיוון.</p>
          </article>
          <article className={styles.featureCard}>
            <span className={styles.featureIcon}><Footprints size={22} /></span>
            <span className={styles.featureNumber}>05</span>
            <h3>פעילות והתאוששות</h3>
            <p>צעדים ושינה מצטרפים לתמונה היומית במכשירים נתמכים, כדי לראות גם מה קורה מחוץ לאימון.</p>
          </article>
        </div>

        <div className={styles.productStories}>
          {productStories.map((story, index) => <article className={`${styles.productStory} ${index % 2 ? styles.storyLight : styles.storyDark}`} key={story.label}>
            <div className={`${styles.storyVisual} ${story.screen === "workout" ? styles.storyVisualWorkout : ""} ${story.screen === "nutrition" ? styles.storyVisualNutrition : ""} ${story.screen === "activity" ? styles.storyVisualActivity : ""}`}>
              {story.screen === "workout" ? <div className={styles.workoutPhoneSet}><Phone screen="workoutSets" alt="מסך חימום וסטים באימון ידיים" /><Phone screen="workout" alt="מסך ביצוע אימון ידיים עם סרטון הדגמה" /><Phone screen="workoutTimer" alt="טיימר מנוחה בין סטים" /></div> : story.screen === "nutrition" ? <div className={styles.nutritionPhoneSet}><Phone screen="nutritionMeal" alt="פירוט ארוחה עם כמויות וערכים" /><Phone screen="nutrition" alt="סיכום התזונה היומי" /><Phone screen="nutritionSwap" alt="החלפות חכמות לארוחה" /></div> : story.screen === "activity" ? <div className={styles.activityPhoneSet}><Phone screen="activitySteps" alt="מסך צעדים יומי ומגמה שבועית" /><Phone screen="activitySleep" alt="מסך שעות שינה ומגמה שבועית" /></div> : <><Phone screen={story.screen} alt={`מסך ${story.label} באפליקציה`} className={styles.desktopStoryPhone} />{mobileStoryScreens[story.screen] && <MobilePhoneTrio screens={mobileStoryScreens[story.screen]!} label={`${story.label} באפליקציה`} />}</>}
            </div>
            <div className={styles.storyCopy}><span className={styles.storyLabel}><StoryLabelIcon screen={story.screen} />{story.label}</span><h3>{story.title}</h3><p>{story.text}</p><ul className={story.screen === "library" ? styles.courseTopicList : undefined}>{story.points.map(point => <li key={point}><Check size={17}/>{point}</li>)}</ul><a href="#pricing">לבחירת המסלול שמתאים לי <ArrowLeft size={17}/></a></div>
          </article>)}
        </div>

        <div className={styles.phoneGallery}>
          <div className={styles.galleryCopy}>
            <span>הכול מדבר באותה שפה</span>
            <h3>האימון נכנס למעקב.<br />המעקב מראה את ההתקדמות.</h3>
            <p>במקום ארבע אפליקציות, פתקים וצילומי מסך, יש לכם מערכת אחת שרואה את התמונה המלאה.</p>
            <a href={signupHref}>למסלול DIGITAL <ArrowLeft size={18} /></a>
          </div>
          <div className={styles.phoneStack}>
            <Phone screen="nutrition" alt="תפריט תזונה עם ארוחות וערכים אמיתיים" className={styles.phoneOne} />
            <Phone screen="progress" alt="מעקב התקדמות עם נתוני אימונים ומדידות" className={styles.phoneTwo} />
            <Phone screen="activitySteps" alt="צעדים ומגמה שבועית" className={styles.phoneThree} />
          </div>
        </div>
      </section>

      <section className={styles.humanSupport} aria-labelledby="human-support-title">
        <div className={styles.supportVisual}>
          <Phone screen="support" alt="מסך פנייה לצוות השירות באפליקציית LIFE FIT" />
          <div className={styles.supportMessage}><span><MessageCircle size={18} /></span><div><b>יש לכם בקשה?</b><small>פונים לצוות השירות מעמוד התמיכה</small></div></div>
        </div>
        <div className={styles.supportCopy}>
          <span className={styles.supportEyebrow}>מערכת עצמאית, עם כתובת לפניות</span>
          <h2 id="human-support-title">זו לא עוד אפליקציה שאתם צריכים להסתדר איתה.<br /><em>זה המקום שלכם.</em></h2>
          <p>מסלול DIGITAL מיועד לשימוש עצמאי: התוכניות, הסיכומים והתובנות במערכת אינם צ׳אט אישי עם מאמן ואינם עדכון ידני שבועי. אם משהו חסר, לא נוח או לא עובד, אפשר לפנות לצוות השירות בבקשה, בתקלה או ברעיון לשיפור.</p>
          <ul>
            <li><Check size={18} /><span><b>התובנות והסיכומים נוצרים במערכת</b> מתוך הנתונים שהזנתם או אישרתם לקריאה.</span></li>
            <li><Check size={18} /><span><b>צוות השירות מטפל בפניות שימוש ותקלות</b> — לא מחליף ליווי מקצועי אישי.</span></li>
            <li><Check size={18} /><span><b>בקשות ורעיונות נשמרים לשיפור המוצר</b> בהתאם לצורכי המשתמשים.</span></li>
          </ul>
        </div>
      </section>

      <section className={styles.gettingStarted} aria-labelledby="getting-started-title">
        <div className={styles.gettingStartedHeading}>
          <span className={styles.sectionIndex}>04 / איך מתחילים</span>
          <h2 id="getting-started-title">מההצטרפות ועד האימון הראשון.<br />בלי להסתבך.</h2>
          <p>מצטרפים, משלימים את תהליך הקליטה וממשיכים אל הכלים והתוכניות שהופעלו בחשבון — הכול במקום אחד.</p>
        </div>
        <ol className={styles.startSteps}>
          <li>
            <span aria-hidden="true">01</span>
            <h3>מצטרפים למסלול</h3>
            <p>משלימים תשלום חודשי מאובטח ב־Grow, ללא התחייבות.</p>
          </li>
          <li>
            <span aria-hidden="true">02</span>
            <h3>מקבלים הזמנה מאובטחת</h3>
            <p>לאחר קליטת ההצטרפות והגדרת החשבון, נשלח למייל קישור להשלמת הכניסה.</p>
          </li>
          <li>
            <span aria-hidden="true">03</span>
            <h3>משלימים פרטים ומטרות</h3>
            <p>עונים על שאלות קצרות על הגוף, התזונה, הניסיון, סביבת האימון והמטרות.</p>
          </li>
          <li>
            <span aria-hidden="true">04</span>
            <h3>נכנסים ומתחילים לעקוב</h3>
            <p>התוכניות והכלים שהופעלו בחשבון מרוכזים במערכת, ובה מסמנים ארוחות ואימונים ועוקבים אחר ההתקדמות.</p>
          </li>
        </ol>
      </section>

      <section className={styles.pricing} id="pricing">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIndex}>05 / מתחילים</span>
          <h2>כמה עולה לכם עוד חודש<br />של “ביום ראשון אני מתחיל”?</h2>
          <p>מסלול אחד שמעניק גישה לכל הכלים והיכולות של האפליקציה</p>
        </div>

        <section className={styles.finalCta} id="contact">
          <div className={styles.finalGlow} aria-hidden="true" />
          <span className={styles.sectionIndex}>מתחילים עכשיו</span>
          <h2>אפשר להמשיך לשלם ביוקר.<br /><em>ואפשר פשוט להתחיל.</em></h2>
        </section>

        <div className={styles.planGrid}>
          {plans.map((plan) => (
            <article className={`${styles.planCard} ${plan.featured ? styles.featuredPlan : ""}`} key={plan.name}>
              <div className={styles.planHead}>
                <div><h3>{plan.name}</h3></div>
                <span className={styles.planDot} />
              </div>
              <div className={styles.planPrice}><span>₪</span>{plan.price}<small>/ לחודש</small></div>
              <p className={styles.renewalPrice}>בחיוב חודשי מתחדש. ללא התחייבות — אפשר לבטל לפני החיוב הבא.</p>
              <ul>
                {plan.features.map((feature) => {
                  const [title, ...description] = feature.text.split(":");
                  return <li key={feature.text}><Check size={17} /><span><strong>{title}:</strong>{description.join(":")}</span></li>;
                })}
              </ul>
              <a href={paymentHref} data-meta-checkout data-plan={plan.name} data-price={plan.price} className={plan.featured ? styles.primaryButton : styles.secondaryButton}>{plan.cta} <ArrowLeft size={18} /></a>
            </article>
          ))}
        </div>
        <p className={styles.pricingFootnote}>97 ₪ לחודש בחיוב חודשי מתחדש. ללא התחייבות.</p>
      </section>

      <section className={styles.faq}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIndex}>שאלות לפני שמתחילים</span>
          <h2>סוגרים את הפינות.</h2>
        </div>
        <div className={styles.faqList}>
          <details>
            <summary>מה מקבלים במסלול DIGITAL?<ChevronDown size={18} /></summary>
            <div className={styles.faqBenefits}>
              <div><Check size={17} /><span><strong>תוכנית תזונה ברורה:</strong> יודעים בדיוק מה לאכול, באיזו כמות ובאיזה שלב ביום, בלי לנחש ובלי לחשב הכול לבד.</span></div>
              <div><Check size={17} /><span><strong>חלופות וכמויות לכל ארוחה:</strong> מחליפים מזון או ארוחה בהתאם למה שיש בבית, כדי לסייע לכם להישאר במסגרת היעד.</span></div>
              <div><Check size={17} /><span><strong>מעקב קלוריות וחלבון:</strong> רואים בזמן אמת כמה צרכתם וכמה נשאר לכם כדי לעמוד במטרה היומית.</span></div>
              <div><Check size={17} /><span><strong>תוכנית אימונים מלאה:</strong> כל אימון מגיע מוכן עם חימום, סדר תרגילים, סטים, חזרות ומשקלים.</span></div>
              <div><Check size={17} /><span><strong>סרטון הסבר לכל תרגיל:</strong> רואים את אופן הביצוע לפני שמתחילים את התרגיל.</span></div>
              <div><Check size={17} /><span><strong>דגשי ביצוע:</strong> הנחיות ברורות שעוזרות לבצע כל תרגיל בצורה מסודרת יותר.</span></div>
              <div><Check size={17} /><span><strong>טיימר מנוחה מובנה:</strong> שומר על הקצב בין הסטים ועוזר לצמצם מריחות זמן.</span></div>
              <div><Check size={17} /><span><strong>היסטוריית ביצועים:</strong> כל המשקלים, החזרות והאימונים נשמרים כדי שתדעו בדיוק איפה השתפרתם.</span></div>
              <div><Check size={17} /><span><strong>מעקב התקדמות מלא:</strong> משקל, היקפים ותמונות במקום אחד, כדי לראות שינוי גם כשהמשקל לא זז.</span></div>
              <div><Check size={17} /><span><strong>מעקב צעדים ושינה:</strong> נתוני הפעילות והשינה מוצגים לצד האימונים, התזונה וההתקדמות.</span></div>
              <div><Check size={17} /><span><strong>צ׳ק־אין שבועי:</strong> מסכמים את השבוע ורואים במקום אחד מה עבד ומה היה מאתגר.</span></div>
              <div><Check size={17} /><span><strong>נטפליקס של עולם התזונה והכושר:</strong> תכנים מסודרים על תזונה, אימונים, שינה, הרגלים, מוטיבציה והתמודדות עם תקיעות.</span></div>
              <div><Check size={17} /><span><strong>הטיפ השבועי:</strong> פעולה אחת קצרה ומעשית שאפשר ליישם מיד ולהפוך בהדרגה להרגל.</span></div>
            </div>
          </details>
          <details><summary>איך פועל מעקב הצעדים והשינה?<ChevronDown size={18} /></summary><p>{healthFaqAnswer}</p></details>
          <details><summary>כמה עולה המינוי?<ChevronDown size={18} /></summary><p>המינוי עולה 97 ₪ לחודש ומתחדש אוטומטית מדי חודש, עד לביטול. אין התחייבות ואפשר לבטל לפני מועד החיוב הבא.</p></details>
          <details><summary>אפשר לבטל?<ChevronDown size={18} /></summary><p>כן. אין סיבה להחזיק אתכם בכוח. אפשר לבטל את החידוש לפני מועד החיוב הבא, ולהמשיך להשתמש במסלול עד סוף התקופה שכבר שולמה. הביטול עוצר חיובים עתידיים ואינו מוחק מיד את הגישה שלכם.</p></details>
          <details><summary>האם זה מתאים גם למתחילים?<ChevronDown size={18} /></summary><p>כן, במיוחד למתחילים. אתם לא אמורים להגיע עם ידע בתזונה או באימונים. המערכת מפרקת את הדרך לפעולות ברורות: מה לבצע באימון, מה לאכול ואיך לבדוק שאתם מתקדמים.</p></details>
          <details><summary>האם זה מתאים גם למתאמנים מתקדמים?<ChevronDown size={18} /></summary><p>בהחלט. מתאמנים מתקדמים מקבלים תוכנית שמאפשרת לעקוב בצורה מדויקת אחר משקלים, חזרות, ביצועים ומדדי גוף לאורך זמן. כך אפשר לזהות תקיעות, לנהל עומסים ולדייק את התזונה בהתאם למטרה, במקום להסתמך על תחושה בלבד.</p></details>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.logo}><span>LIFE FIT</span></div>
        <p>להפסיק להתחיל. להתחיל להתקדם.</p>
        <div><a href="/terms">תנאי שימוש</a><a href="/privacy">מדיניות פרטיות</a><span>© 2026 LIFE FIT</span></div>
      </footer>
      <MetaPixel />
      <CookieConsent />
      <MobileMotion
        heroPhone={styles.heroPhone}
        floatingTop={styles.floatingTop}
        floatingBottom={styles.floatingBottom}
        workoutPhoneSet={styles.workoutPhoneSet}
        nutritionPhoneSet={styles.nutritionPhoneSet}
        phoneStack={styles.phoneStack}
        phone={styles.phone}
        progressLine={styles.progressLine}
        chart={styles.chart}
        swapArrow={styles.swapArrow}
        coachBubble={styles.coachBubble}
        userBubble={styles.userBubble}
        mealStatus={styles.mealStatus}
        restTimer={styles.restTimer}
      />
    </main>
  );
}
