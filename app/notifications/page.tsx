import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import NotificationsPageContent from "@/components/notifications/NotificationsPageContent";
import { getAuthContext } from "@/lib/data/product-repository";

export default async function NotificationsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/coach/notifications");
  return <ClientShell><NotificationsPageContent /></ClientShell>;
}
