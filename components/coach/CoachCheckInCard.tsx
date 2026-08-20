import Link from "next/link";
import CheckInPhotoGallery from "@/components/client/CheckInPhotoGallery";
import CheckInHandledForm from "@/components/coach/CheckInHandledForm";
import ReviewCheckInForm from "@/components/coach/ReviewCheckInForm";
import { coachCheckInStatus } from "@/lib/check-ins/coach";
import type { ResponseTemplate } from "@/app/actions/response-templates";

type CheckInItem = {
  id: string;
  client_id: string;
  submitted_at: string;
  adherence: number;
  hunger: number;
  energy: number;
  sleep: number;
  mood: number | null;
  training: boolean;
  weight: number | null;
  navel_circumference: number | null;
  workouts_completed: number | null;
  meal_plan_days: number | null;
  notes: string | null;
  coach_response: string | null;
  status: string;
  handled_at: string | null;
  client: { full_name: string; email: string } | null;
  photos: readonly { id: string; view: string; signedUrl: string }[];
};

const date = (value: string) =>
  new Intl.DateTimeFormat("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jerusalem",
  }).format(new Date(value));

export function checkInStatus(item: CheckInItem) {
  const status = coachCheckInStatus(item);
  if (status === "handled")
    return { label: "טופל", className: "text-[#16A34A]" };
  if (status === "responded")
    return { label: "נענתה", className: "text-[#0B0B0B]" };
  return { label: "חדש", className: "text-[#0B0B0B]" };
}

export default function CoachCheckInCard({
  item,
  photoError,
  previousId,
  templates = [],
}: {
  item: CheckInItem;
  photoError: boolean;
  /** The same client's preceding check-in, when there is one. */
  previousId?: string;
  /** The coach's saved replies, offered above the response box. */
  templates?: readonly ResponseTemplate[];
}) {
  const status = checkInStatus(item);
  return (
    <article
      id={`check-in-${item.id}`}
      className="rounded-[26px] border border-[#E5E7E5] bg-[#FFFFFF] p-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-[#5B5F5B]">{date(item.submitted_at)}</p>
          <h2 className="mt-1 text-xl font-black">
            {item.client?.full_name ?? "לקוח"}
          </h2>
          <p className="text-xs text-[#3F433F]">{item.client?.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* The comparison a coach actually wants is this client, this week
              against last. Reaching it through two dropdowns listing every
              check-in of every client made it easier to compare two different
              people by accident than to compare the same one over time. */}
          {previousId && (
            <Link href={`/coach/check-ins?compareA=${item.id}&compareB=${previousId}#comparison`} className="chip">
              השוואה לצ׳ק־אין הקודם
            </Link>
          )}
          <span
            className={`rounded-full border border-current/20 bg-[#F7F8F7] px-3 py-1 text-xs font-black ${status.className}`}
          >
            {status.label}
          </span>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Metric label="התמדה" value={`${item.adherence}/10`} />
        <Metric label="רעב" value={`${item.hunger}/10`} />
        <Metric label="אנרגיה" value={`${item.energy}/10`} />
        <Metric label="שינה" value={`${item.sleep}/10`} />
        <Metric label="מצב רוח" value={item.mood ? `${item.mood}/10` : "—"} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
        <Value label="משקל" value={item.weight ? `${item.weight} ק״ג` : "—"} />
        <Value
          label="היקף טבור"
          value={item.navel_circumference ? `${item.navel_circumference} ס״מ` : "—"}
        />
        <Value label="אימונים" value={item.workouts_completed ?? "—"} />
        <Value label="ימי תפריט" value={item.meal_plan_days ?? "—"} />
        <Value label="אימון השבוע" value={item.training ? "בוצע" : "לא בוצע"} />
      </div>

      {item.notes && (
        <div className="mt-4 rounded-2xl bg-[#F7F8F7] p-4 text-sm">
          <strong className="text-[#5B5F5B]">הערת הלקוח</strong>
          <p className="mt-2 whitespace-pre-wrap">{item.notes}</p>
        </div>
      )}
      <CheckInPhotoGallery photos={item.photos} error={photoError} />

      {item.coach_response && (
        <div className="mt-4 rounded-2xl border border-[#16A34A]/20 bg-[#16A34A]/[.05] p-4">
          <strong className="text-sm text-[#16A34A]">תגובת המאמן</strong>
          <p className="mt-2 whitespace-pre-wrap text-sm">{item.coach_response}</p>
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4 border-t border-[#E5E7E5] pt-5">
        <details className="min-w-[min(100%,28rem)] flex-1">
          <summary className="cursor-pointer text-sm font-black text-[#16A34A]">
            {item.coach_response ? "עדכון תגובה" : "כתיבת תגובה"}
          </summary>
          <ReviewCheckInForm checkInId={item.id} clientId={item.client_id} clientName={item.client?.full_name ?? ""} templates={templates} />
        </details>
        <CheckInHandledForm
          checkInId={item.id}
          handled={Boolean(item.handled_at)}
        />
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F7F8F7] p-3 text-center">
      <span className="block text-xs text-[#5B5F5B]">{label}</span>
      <strong className="mt-1 block">{value}</strong>
    </div>
  );
}

function Value({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-[#E5E7E5] p-3">
      <span className="block text-xs text-[#3F433F]">{label}</span>
      <strong className="mt-1 block">{value}</strong>
    </div>
  );
}
