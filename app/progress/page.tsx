import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import PersistedProgressForm from "@/components/client/PersistedProgressForm";
import PersistedProgressHistory from "@/components/client/PersistedProgressHistory";
import { getAuthContext, getClientOverview } from "@/lib/data/product-repository";

export default async function ProgressPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");
  const today = new Date().toISOString().slice(0, 10);
  const data = await getClientOverview(auth.id, today);
  return <ClientShell><PageHeader eyebrow="התקדמות" title="משקל ומדידות" description="המדידות נשמרות בחשבון שלך ומוצגות לאורך זמן."/><div className="space-y-5"><PersistedProgressForm today={today}/><PersistedProgressHistory entries={data.progress}/></div></ClientShell>;
}
