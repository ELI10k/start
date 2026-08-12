import CoachNav from "@/components/coach/CoachNav";
import { isPreviewDeployment } from "@/lib/auth/site-url";
import { getUnreadNotificationCount } from "@/lib/notifications/repository";
// Coach pages render their own <main>, so the layout deliberately does not add one:
// a second landmark here would recreate the nesting this change set out to remove.
// Read on the server: VERCEL_ENV is only reliable there, and it is exactly
// "preview" on a preview deployment and "production" on production - so the
// badge cannot appear for a real client.
export default async function CoachLayout({children}:{children:React.ReactNode}){const unreadCount=await getUnreadNotificationCount();return <div className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]"><CoachNav unreadCount={unreadCount} preview={isPreviewDeployment()}/>{children}</div>}
