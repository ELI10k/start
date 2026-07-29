import NotificationsCenter from "@/components/notifications/NotificationsCenter";
import { getNotificationCenter } from "@/lib/notifications/repository";

export default async function NotificationsPageContent() {
  const center = await getNotificationCenter();
  return <NotificationsCenter {...center} />;
}
