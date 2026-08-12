import Link from "next/link";
import { CLIENT_TABS, type ClientTab } from "@/lib/coach/client-tabs";

// The tab lives in the query string rather than in the path: the client id stays
// in one place, every tab is a real URL a coach can bookmark or send, and the
// existing /coach/clients/[id]/workouts and /progress routes keep working
// untouched.

export default function ClientTabs({ clientId, active }: { clientId: string; active: ClientTab }) {
  return (
    <nav aria-label="מדורי תיק הלקוח" className="mt-5">
      {/* Scrolls sideways on a phone because seven Hebrew labels do not fit in
          375px. The strip keeps its scrollbar rather than hiding it, and the
          fade at the leading edge says there is more to reach - a row that just
          clips looks like the list ends there. */}
      <div className="relative">
        <div className="client-tabs flex gap-2 overflow-x-auto pb-2">
          {CLIENT_TABS.map((tab) => {
            const current = tab.id === active;
            return (
              <Link
                key={tab.id}
                href={`/coach/clients/${clientId}?tab=${tab.id}`}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-11 shrink-0 items-center rounded-xl border px-4 text-sm font-bold transition-colors ${
                  current
                    ? "border-[#16A34A] bg-[#ECFDF3] text-[#15803D]"
                    : "border-[#E5E7E5] bg-[#FFFFFF] text-[#5B5F5B] hover:border-[#16A34A]/40"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-l from-[#FFFFFF] to-transparent" />
      </div>
    </nav>
  );
}
