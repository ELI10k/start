import CoachNav from "@/components/coach/CoachNav";
import { getUnreadNotificationCount } from "@/lib/notifications/repository";
// Coach pages render their own <main>, so the layout deliberately does not add one:
// a second landmark here would recreate the nesting this change set out to remove.
export default async function CoachLayout({children}:{children:React.ReactNode}){const unreadCount=await getUnreadNotificationCount();return <div className="min-h-screen bg-[#090909] text-white"><CoachNav unreadCount={unreadCount}/>{children}</div>}
