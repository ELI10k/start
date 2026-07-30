import { redirect } from "next/navigation";
import NotificationsPageContent from "@/components/notifications/NotificationsPageContent";
import { getAuthContext } from "@/lib/data/product-repository";

export default async function CoachNotificationsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/notifications");
  return <main className="px-4 py-8 sm:px-6"><div className="mx-auto max-w-3xl"><NotificationsPageContent /></div></main>;
}
