"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const consentKey = "start-life-fit-cookie-consent";
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(!window.localStorage.getItem(consentKey)), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const choose = (choice: "accepted" | "rejected") => {
    const previousChoice = window.localStorage.getItem(consentKey);
    window.localStorage.setItem(consentKey, choice);
    window.dispatchEvent(new CustomEvent("start-cookie-consent", { detail: choice }));
    setVisible(false);
    if (previousChoice === "accepted" && choice === "rejected") window.location.reload();
  };

  if (!visible) return <button className={styles.cookieSettings} type="button" onClick={() => setVisible(true)}>הגדרות עוגיות</button>;

  return <aside className={styles.cookieBanner} aria-label="העדפות עוגיות">
    <button className={styles.cookieClose} type="button" onClick={() => choose("rejected")} aria-label="סגירת הודעת העוגיות">×</button>
    <p>אנחנו משתמשים בעוגיות 🍪 (לא למאכל) כדי לשפר את חוויית הגלישה באתר</p>
    <div><button type="button" onClick={() => choose("rejected")}>דחייה</button><button type="button" onClick={() => choose("accepted")}>אישור</button></div>
  </aside>;
}
