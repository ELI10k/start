import CoachNav from "@/components/coach/CoachNav";
import { getUnreadNotificationCount } from "@/lib/notifications/repository";
export default async function CoachLayout({children}:{children:React.ReactNode}){const unreadCount=await getUnreadNotificationCount();return <div className="min-h-screen bg-[#090909] text-white"><CoachNav unreadCount={unreadCount}/>{children}</div>}
