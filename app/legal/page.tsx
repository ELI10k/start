import type { Metadata } from "next";
import TermsPage from "@/app/terms/page";
import PrivacyPage from "@/app/privacy/page";

export const metadata: Metadata = {
  title: "תקנון, תנאי שימוש ומדיניות פרטיות | START LIFE FIT",
  description: "התקנון המלא של START LIFE FIT, הכולל תנאי שימוש ומדיניות פרטיות.",
};

export default function LegalPage() {
  return <>
    <TermsPage />
    <PrivacyPage />
  </>;
}
